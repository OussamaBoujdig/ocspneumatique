import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { search, sort } = req.query;
    let sql = `
      SELECT c.*,
        (SELECT COUNT(*) FROM vehicles v WHERE v.customer_id = c.id) AS vehicle_count,
        (SELECT MAX(wo.created_at) FROM work_orders wo WHERE wo.customer_id = c.id) AS last_visit
      FROM customers c
      WHERE c.tenant_id = ?`;
    const params = [req.tenantId];

    if (search) {
      sql += " AND (c.full_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    switch (sort) {
      case "name":
        sql += " ORDER BY c.full_name ASC";
        break;
      case "spent":
        sql += " ORDER BY c.total_spent DESC";
        break;
      case "recent":
      default:
        sql += " ORDER BY c.created_at DESC";
        break;
    }

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM customers WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Client non trouvé" });
    }

    const [vehicles] = await pool.query(
      "SELECT * FROM vehicles WHERE customer_id = ? AND tenant_id = ? ORDER BY created_at DESC",
      [req.params.id, req.tenantId]
    );

    const [appointments] = await pool.query(
      `SELECT a.*, s.name AS service_name
       FROM appointments a
       LEFT JOIN services s ON a.service_id = s.id
       WHERE a.customer_id = ? AND a.tenant_id = ?
       ORDER BY a.scheduled_date DESC, a.scheduled_time DESC
       LIMIT 10`,
      [req.params.id, req.tenantId]
    );

    res.json({ ...rows[0], vehicles, appointments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { full_name, phone, email, address, city, notes, tags } = req.body;
    if (!full_name || !phone) {
      return res.status(400).json({ error: "Nom complet et téléphone requis" });
    }

    const [result] = await pool.query(
      `INSERT INTO customers (tenant_id, full_name, phone, email, address, city, notes, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenantId, full_name, phone, email || null, address || null, city || null, notes || null, tags || null]
    );
    const [rows] = await pool.query(
      "SELECT * FROM customers WHERE id = ? AND tenant_id = ?",
      [result.insertId, req.tenantId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { full_name, phone, email, address, city, notes, tags } = req.body;

    const [existing] = await pool.query(
      "SELECT id FROM customers WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    if (!existing.length) {
      return res.status(404).json({ error: "Client non trouvé" });
    }

    await pool.query(
      `UPDATE customers
       SET full_name = ?, phone = ?, email = ?, address = ?, city = ?, notes = ?, tags = ?
       WHERE id = ? AND tenant_id = ?`,
      [full_name, phone, email || null, address || null, city || null, notes || null, tags || null, req.params.id, req.tenantId]
    );
    const [rows] = await pool.query(
      "SELECT * FROM customers WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM customers WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Client non trouvé" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/history", async (req, res) => {
  try {
    const [customer] = await pool.query(
      "SELECT id FROM customers WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    if (!customer.length) {
      return res.status(404).json({ error: "Client non trouvé" });
    }

    const [workOrders] = await pool.query(
      `SELECT wo.*, v.brand AS vehicle_brand, v.model AS vehicle_model, v.license_plate
       FROM work_orders wo
       LEFT JOIN vehicles v ON wo.vehicle_id = v.id
       WHERE wo.customer_id = ? AND wo.tenant_id = ?
       ORDER BY wo.created_at DESC`,
      [req.params.id, req.tenantId]
    );

    const woIds = workOrders.map((wo) => wo.id);
    let items = [];
    if (woIds.length) {
      const [woItems] = await pool.query(
        `SELECT woi.*, s.name AS service_name, t.model AS tire_model, t.size AS tire_size
         FROM work_order_items woi
         LEFT JOIN services s ON woi.service_id = s.id
         LEFT JOIN tires t ON woi.tire_id = t.id
         WHERE woi.work_order_id IN (?)`,
        [woIds]
      );
      items = woItems;
    }

    const ordersWithItems = workOrders.map((wo) => ({
      ...wo,
      items: items.filter((i) => i.work_order_id === wo.id),
    }));

    const [invoices] = await pool.query(
      `SELECT i.*
       FROM invoices i
       WHERE i.customer_id = ? AND i.tenant_id = ?
       ORDER BY i.created_at DESC`,
      [req.params.id, req.tenantId]
    );

    res.json({ work_orders: ordersWithItems, invoices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
