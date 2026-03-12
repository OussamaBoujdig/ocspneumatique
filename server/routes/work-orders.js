import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { status, client_id } = req.query;
    let sql = `SELECT wo.*, c.full_name as client_name, v.brand as vehicle_brand, v.model as vehicle_model, v.license_plate
               FROM work_orders wo
               LEFT JOIN clients c ON wo.client_id = c.id
               LEFT JOIN vehicles v ON wo.vehicle_id = v.id`;
    const params = [];
    const conditions = [];
    if (status && status !== "all") { conditions.push("wo.status = ?"); params.push(status); }
    if (client_id) { conditions.push("wo.client_id = ?"); params.push(client_id); }
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY wo.created_at DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT wo.*, c.full_name as client_name, v.brand as vehicle_brand, v.model as vehicle_model, v.license_plate
       FROM work_orders wo
       LEFT JOIN clients c ON wo.client_id = c.id
       LEFT JOIN vehicles v ON wo.vehicle_id = v.id
       WHERE wo.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Ordre non trouvé" });
    const [items] = await pool.query(
      `SELECT woi.*, s.name as service_name, t.model as tire_model, t.size as tire_size
       FROM work_order_items woi
       LEFT JOIN services s ON woi.service_id = s.id
       LEFT JOIN tires t ON woi.tire_id = t.id
       WHERE woi.work_order_id = ?`,
      [req.params.id]
    );
    res.json({ ...rows[0], items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { appointment_id, client_id, vehicle_id, technician, notes, items } = req.body;
    const [result] = await pool.query(
      "INSERT INTO work_orders (appointment_id, client_id, vehicle_id, technician, notes) VALUES (?,?,?,?,?)",
      [appointment_id || null, client_id || null, vehicle_id || null, technician || null, notes || null]
    );
    const woId = result.insertId;

    if (items?.length) {
      for (const item of items) {
        const total = (item.quantity || 1) * (item.unit_price || 0);
        await pool.query(
          "INSERT INTO work_order_items (work_order_id, service_id, tire_id, description, quantity, unit_price, total) VALUES (?,?,?,?,?,?,?)",
          [woId, item.service_id || null, item.tire_id || null, item.description, item.quantity || 1, item.unit_price || 0, total]
        );
        if (item.tire_id && item.quantity) {
          await pool.query("UPDATE tires SET stock_qty = GREATEST(stock_qty - ?, 0) WHERE id = ?", [item.quantity, item.tire_id]);
        }
      }
    }

    if (appointment_id) {
      await pool.query("UPDATE appointments SET status = 'in_progress' WHERE id = ?", [appointment_id]);
    }

    const [rows] = await pool.query("SELECT * FROM work_orders WHERE id = ?", [woId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const [rows] = await pool.query("SELECT COUNT(*) as count FROM invoices WHERE YEAR(created_at) = ?", [year]);
  return `FAC-${year}-${(rows[0].count + 1).toString().padStart(4, "0")}`;
}

router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const extra = status === "in_progress" ? ", started_at = NOW()" : status === "completed" ? ", completed_at = NOW()" : "";
    await pool.query(`UPDATE work_orders SET status = ?${extra} WHERE id = ?`, [status, req.params.id]);

    let autoInvoice = null;

    if (status === "completed") {
      const [wo] = await pool.query("SELECT * FROM work_orders WHERE id = ?", [req.params.id]);
      if (wo[0]?.appointment_id) {
        await pool.query("UPDATE appointments SET status = 'completed' WHERE id = ?", [wo[0].appointment_id]);
      }

      // Auto-generate invoice
      const [existing] = await pool.query("SELECT id FROM invoices WHERE work_order_id = ?", [req.params.id]);
      if (!existing.length && wo[0]) {
        const [items] = await pool.query("SELECT SUM(total) as sum FROM work_order_items WHERE work_order_id = ?", [req.params.id]);
        const subtotal = items[0].sum || 0;
        const taxRate = 20;
        const taxAmount = subtotal * taxRate / 100;
        const total = subtotal + taxAmount;
        const invoiceNumber = await generateInvoiceNumber();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        const [result] = await pool.query(
          `INSERT INTO invoices (invoice_number, work_order_id, client_id, subtotal, tax_rate, tax_amount, total, due_date, status)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [invoiceNumber, req.params.id, wo[0].client_id, subtotal, taxRate, taxAmount, total, dueDate.toISOString().split("T")[0], "draft"]
        );
        const [inv] = await pool.query("SELECT * FROM invoices WHERE id = ?", [result.insertId]);
        autoInvoice = inv[0];
      }
    }

    const [rows] = await pool.query("SELECT * FROM work_orders WHERE id = ?", [req.params.id]);
    res.json({ ...rows[0], auto_invoice: autoInvoice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM work_orders WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
