import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { customer_id, search } = req.query;
    let sql = `
      SELECT v.*, c.full_name AS customer_name
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE v.tenant_id = ?`;
    const params = [req.tenantId];

    if (customer_id) {
      sql += " AND v.customer_id = ?";
      params.push(customer_id);
    }
    if (search) {
      sql += " AND (v.brand LIKE ? OR v.model LIKE ? OR v.license_plate LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    sql += " ORDER BY v.created_at DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT v.*, c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
       FROM vehicles v
       LEFT JOIN customers c ON v.customer_id = c.id
       WHERE v.id = ? AND v.tenant_id = ?`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Véhicule non trouvé" });
    }

    const [tireInstallations] = await pool.query(
      `SELECT ti.*, t.model AS tire_model_name, t.size AS tire_size_info
       FROM tire_installations ti
       LEFT JOIN tires t ON ti.tire_id = t.id
       WHERE ti.vehicle_id = ? AND ti.tenant_id = ?
       ORDER BY ti.installed_at DESC`,
      [req.params.id, req.tenantId]
    );

    const [workOrders] = await pool.query(
      `SELECT wo.id, wo.status, wo.priority, wo.notes, wo.created_at, wo.completed_at
       FROM work_orders wo
       WHERE wo.vehicle_id = ? AND wo.tenant_id = ?
       ORDER BY wo.created_at DESC
       LIMIT 20`,
      [req.params.id, req.tenantId]
    );

    res.json({ ...rows[0], tire_installations: tireInstallations, work_orders: workOrders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { customer_id, brand, model, year, license_plate, vin, tire_size, mileage, color, notes } = req.body;
    if (!customer_id || !brand || !model) {
      return res.status(400).json({ error: "Client, marque et modèle requis" });
    }

    const [customerCheck] = await pool.query(
      "SELECT id FROM customers WHERE id = ? AND tenant_id = ?",
      [customer_id, req.tenantId]
    );
    if (!customerCheck.length) {
      return res.status(400).json({ error: "Client non trouvé dans ce tenant" });
    }

    const [result] = await pool.query(
      `INSERT INTO vehicles (tenant_id, customer_id, brand, model, year, license_plate, vin, tire_size, mileage, color, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenantId, customer_id, brand, model, year || null, license_plate || null, vin || null, tire_size || null, mileage || 0, color || null, notes || null]
    );
    const [rows] = await pool.query(
      `SELECT v.*, c.full_name AS customer_name
       FROM vehicles v
       LEFT JOIN customers c ON v.customer_id = c.id
       WHERE v.id = ? AND v.tenant_id = ?`,
      [result.insertId, req.tenantId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { customer_id, brand, model, year, license_plate, vin, tire_size, mileage, color, notes } = req.body;

    const [existing] = await pool.query(
      "SELECT id FROM vehicles WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    if (!existing.length) {
      return res.status(404).json({ error: "Véhicule non trouvé" });
    }

    if (customer_id) {
      const [customerCheck] = await pool.query(
        "SELECT id FROM customers WHERE id = ? AND tenant_id = ?",
        [customer_id, req.tenantId]
      );
      if (!customerCheck.length) {
        return res.status(400).json({ error: "Client non trouvé dans ce tenant" });
      }
    }

    await pool.query(
      `UPDATE vehicles
       SET customer_id = ?, brand = ?, model = ?, year = ?, license_plate = ?, vin = ?, tire_size = ?, mileage = ?, color = ?, notes = ?
       WHERE id = ? AND tenant_id = ?`,
      [customer_id, brand, model, year || null, license_plate || null, vin || null, tire_size || null, mileage || 0, color || null, notes || null, req.params.id, req.tenantId]
    );
    const [rows] = await pool.query(
      `SELECT v.*, c.full_name AS customer_name
       FROM vehicles v
       LEFT JOIN customers c ON v.customer_id = c.id
       WHERE v.id = ? AND v.tenant_id = ?`,
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
      "DELETE FROM vehicles WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Véhicule non trouvé" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
