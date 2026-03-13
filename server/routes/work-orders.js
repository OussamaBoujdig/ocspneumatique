import { Router } from "express";
import pool from "../db.js";

const router = Router();

async function generateInvoiceNumber(tenantId) {
  const year = new Date().getFullYear();
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM invoices WHERE tenant_id = ? AND YEAR(created_at) = ?",
    [tenantId, year]
  );
  return `FAC-${year}-${(rows[0].count + 1).toString().padStart(4, "0")}`;
}

router.get("/", async (req, res) => {
  try {
    const { status, customer_id, assigned_to } = req.query;
    let sql = `SELECT wo.*, c.full_name AS customer_name,
                      v.brand AS vehicle_brand, v.model AS vehicle_model, v.license_plate,
                      e.name AS employee_name
               FROM work_orders wo
               LEFT JOIN customers c ON wo.customer_id = c.id
               LEFT JOIN vehicles v ON wo.vehicle_id = v.id
               LEFT JOIN employees e ON wo.assigned_to = e.id`;
    const params = [];
    const conditions = ["wo.tenant_id = ?"];
    params.push(req.tenantId);

    if (status && status !== "all") { conditions.push("wo.status = ?"); params.push(status); }
    if (customer_id) { conditions.push("wo.customer_id = ?"); params.push(customer_id); }
    if (assigned_to) { conditions.push("wo.assigned_to = ?"); params.push(assigned_to); }

    sql += " WHERE " + conditions.join(" AND ");
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
      `SELECT wo.*, c.full_name AS customer_name, c.phone AS customer_phone,
              v.brand AS vehicle_brand, v.model AS vehicle_model, v.license_plate,
              e.name AS employee_name
       FROM work_orders wo
       LEFT JOIN customers c ON wo.customer_id = c.id
       LEFT JOIN vehicles v ON wo.vehicle_id = v.id
       LEFT JOIN employees e ON wo.assigned_to = e.id
       WHERE wo.id = ? AND wo.tenant_id = ?`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: "Ordre non trouvé" });

    const [items] = await pool.query(
      `SELECT woi.*, s.name AS service_name, t.model AS tire_model, t.size AS tire_size
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
    const {
      appointment_id, customer_id, vehicle_id, assigned_to,
      priority, estimated_duration, technician_name, notes, items,
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO work_orders
       (tenant_id, appointment_id, customer_id, vehicle_id, assigned_to, priority, estimated_duration, technician_name, notes)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        req.tenantId, appointment_id || null, customer_id || null, vehicle_id || null,
        assigned_to || null, priority || "normal", estimated_duration || null,
        technician_name || null, notes || null,
      ]
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
          await pool.query(
            "UPDATE tires SET stock_qty = GREATEST(stock_qty - ?, 0) WHERE id = ? AND tenant_id = ?",
            [item.quantity, item.tire_id, req.tenantId]
          );
          await pool.query(
            `INSERT INTO inventory_movements (tenant_id, tire_id, user_id, type, quantity, unit_price, reference, notes)
             VALUES (?,?,?,?,?,?,?,?)`,
            [req.tenantId, item.tire_id, req.user.id, "sale", -(item.quantity), item.unit_price || 0, `WO-${woId}`, item.description || null]
          );
        }
      }
    }

    if (appointment_id) {
      await pool.query(
        "UPDATE appointments SET status = 'in_progress' WHERE id = ? AND tenant_id = ?",
        [appointment_id, req.tenantId]
      );
    }

    const [rows] = await pool.query("SELECT * FROM work_orders WHERE id = ? AND tenant_id = ?", [woId, req.tenantId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { technician_name, notes, priority, estimated_duration, items } = req.body;

    await pool.query(
      "UPDATE work_orders SET technician_name = ?, notes = ?, priority = ?, estimated_duration = ? WHERE id = ? AND tenant_id = ?",
      [technician_name || null, notes || null, priority || "normal", estimated_duration || null, req.params.id, req.tenantId]
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

    const [rows] = await pool.query("SELECT * FROM work_orders WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenantId]);
    if (!rows.length) return res.status(404).json({ error: "Ordre non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Le statut est requis" });

    let extra = "";
    if (status === "in_progress") extra = ", started_at = NOW()";
    else if (status === "completed") extra = ", completed_at = NOW()";

    await pool.query(
      `UPDATE work_orders SET status = ?${extra} WHERE id = ? AND tenant_id = ?`,
      [status, req.params.id, req.tenantId]
    );

    let autoInvoice = null;

    if (status === "completed") {
      const [wo] = await pool.query(
        "SELECT * FROM work_orders WHERE id = ? AND tenant_id = ?",
        [req.params.id, req.tenantId]
      );

      if (wo[0]?.started_at) {
        const elapsed = Math.round((Date.now() - new Date(wo[0].started_at).getTime()) / 60000);
        await pool.query(
          "UPDATE work_orders SET actual_duration = ? WHERE id = ? AND tenant_id = ?",
          [elapsed, req.params.id, req.tenantId]
        );
      }

      if (wo[0]?.appointment_id) {
        await pool.query(
          "UPDATE appointments SET status = 'completed' WHERE id = ? AND tenant_id = ?",
          [wo[0].appointment_id, req.tenantId]
        );
      }

      const [existing] = await pool.query(
        "SELECT id FROM invoices WHERE work_order_id = ? AND tenant_id = ?",
        [req.params.id, req.tenantId]
      );

      if (!existing.length && wo[0]) {
        const [items] = await pool.query(
          "SELECT SUM(total) AS sum FROM work_order_items WHERE work_order_id = ?",
          [req.params.id]
        );
        const subtotal = items[0].sum || 0;
        const taxRate = 20;
        const taxAmount = subtotal * taxRate / 100;
        const total = subtotal + taxAmount;
        const invoiceNumber = await generateInvoiceNumber(req.tenantId);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        const [invResult] = await pool.query(
          `INSERT INTO invoices (tenant_id, invoice_number, work_order_id, customer_id, subtotal, tax_rate, tax_amount, total, due_date, status)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [req.tenantId, invoiceNumber, req.params.id, wo[0].customer_id, subtotal, taxRate, taxAmount, total, dueDate.toISOString().split("T")[0], "draft"]
        );
        const [inv] = await pool.query("SELECT * FROM invoices WHERE id = ?", [invResult.insertId]);
        autoInvoice = inv[0];
      }
    }

    const [rows] = await pool.query(
      "SELECT * FROM work_orders WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: "Ordre non trouvé" });
    res.json({ ...rows[0], auto_invoice: autoInvoice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/from-appointment/:appointmentId", async (req, res) => {
  try {
    const [appts] = await pool.query(
      `SELECT a.*, c.id AS cid, v.id AS vid
       FROM appointments a
       LEFT JOIN customers c ON c.phone = a.phone AND c.tenant_id = a.tenant_id
       LEFT JOIN vehicles v ON v.customer_id = c.id
       WHERE a.id = ? AND a.tenant_id = ?`,
      [req.params.appointmentId, req.tenantId]
    );
    if (!appts.length) return res.status(404).json({ error: "Rendez-vous non trouvé" });

    const appt = appts[0];
    const [result] = await pool.query(
      `INSERT INTO work_orders (tenant_id, appointment_id, customer_id, vehicle_id, notes, priority)
       VALUES (?,?,?,?,?,?)`,
      [req.tenantId, appt.id, appt.cid || null, appt.vid || null, `RDV: ${appt.service_type || ""}`.trim(), "normal"]
    );

    await pool.query(
      "UPDATE appointments SET status = 'in_progress' WHERE id = ? AND tenant_id = ?",
      [appt.id, req.tenantId]
    );

    const [rows] = await pool.query(
      `SELECT wo.*, c.full_name AS customer_name, v.brand AS vehicle_brand, v.model AS vehicle_model, v.license_plate
       FROM work_orders wo
       LEFT JOIN customers c ON wo.customer_id = c.id
       LEFT JOIN vehicles v ON wo.vehicle_id = v.id
       WHERE wo.id = ? AND wo.tenant_id = ?`,
      [result.insertId, req.tenantId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM work_orders WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Ordre non trouvé" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
