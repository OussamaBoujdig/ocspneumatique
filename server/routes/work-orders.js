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
    sql += " ORDER BY FIELD(wo.priority,'urgent','high','normal','low'), wo.created_at DESC";
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
    const { appointment_id, client_id, vehicle_id, technician, notes, items, priority, estimated_duration } = req.body;
    const [result] = await pool.query(
      "INSERT INTO work_orders (appointment_id, client_id, vehicle_id, technician, notes, priority, estimated_duration) VALUES (?,?,?,?,?,?,?)",
      [appointment_id || null, client_id || null, vehicle_id || null, technician || null, notes || null, priority || "normal", estimated_duration || null]
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

router.put("/:id", async (req, res) => {
  try {
    const { technician, notes, priority, estimated_duration, items } = req.body;
    await pool.query(
      "UPDATE work_orders SET technician=?, notes=?, priority=?, estimated_duration=? WHERE id=?",
      [technician || null, notes || null, priority || "normal", estimated_duration || null, req.params.id]
    );

    if (items) {
      await pool.query("DELETE FROM work_order_items WHERE work_order_id = ?", [req.params.id]);
      for (const item of items) {
        const total = (item.quantity || 1) * (item.unit_price || 0);
        await pool.query(
          "INSERT INTO work_order_items (work_order_id, service_id, tire_id, description, quantity, unit_price, total) VALUES (?,?,?,?,?,?,?)",
          [req.params.id, item.service_id || null, item.tire_id || null, item.description, item.quantity || 1, item.unit_price || 0, total]
        );
      }
    }

    const [rows] = await pool.query("SELECT * FROM work_orders WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
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
    let extra = "";
    if (status === "in_progress") extra = ", started_at = NOW()";
    else if (status === "completed") extra = ", completed_at = NOW()";

    await pool.query(`UPDATE work_orders SET status = ?${extra} WHERE id = ?`, [status, req.params.id]);

    let autoInvoice = null;

    if (status === "completed") {
      const [wo] = await pool.query("SELECT * FROM work_orders WHERE id = ?", [req.params.id]);
      if (wo[0]?.appointment_id) {
        await pool.query("UPDATE appointments SET status = 'completed' WHERE id = ?", [wo[0].appointment_id]);
      }

      if (wo[0]?.started_at) {
        const elapsed = Math.round((Date.now() - new Date(wo[0].started_at).getTime()) / 60000);
        await pool.query("UPDATE work_orders SET actual_duration = ? WHERE id = ?", [elapsed, req.params.id]);
      }

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

router.post("/from-appointment/:appointmentId", async (req, res) => {
  try {
    const [appts] = await pool.query(
      `SELECT a.*, c.id as cid, v.id as vid
       FROM appointments a
       LEFT JOIN clients c ON c.phone = a.phone
       LEFT JOIN vehicles v ON v.client_id = c.id AND v.brand = a.vehicle_brand AND v.model = a.vehicle_model
       WHERE a.id = ?`,
      [req.params.appointmentId]
    );
    if (!appts.length) return res.status(404).json({ error: "Rendez-vous non trouvé" });

    const appt = appts[0];
    const [result] = await pool.query(
      "INSERT INTO work_orders (appointment_id, client_id, vehicle_id, notes, priority) VALUES (?,?,?,?,?)",
      [appt.id, appt.cid || null, appt.vid || null, `RDV: ${appt.service_type}`, "normal"]
    );

    await pool.query("UPDATE appointments SET status = 'in_progress' WHERE id = ?", [appt.id]);

    const [rows] = await pool.query(
      `SELECT wo.*, c.full_name as client_name, v.brand as vehicle_brand, v.model as vehicle_model, v.license_plate
       FROM work_orders wo
       LEFT JOIN clients c ON wo.client_id = c.id
       LEFT JOIN vehicles v ON wo.vehicle_id = v.id
       WHERE wo.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
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
