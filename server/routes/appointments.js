import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/calendar", async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const [rows] = await pool.query(
      `SELECT a.*, c.full_name AS customer_name, e.name AS employee_name, s.name AS service_name
       FROM appointments a
       LEFT JOIN customers c ON a.customer_id = c.id
       LEFT JOIN employees e ON a.employee_id = e.id
       LEFT JOIN services s ON a.service_id = s.id
       WHERE a.tenant_id = ? AND MONTH(a.scheduled_date) = ? AND YEAR(a.scheduled_date) = ?
       ORDER BY a.scheduled_date, a.scheduled_time`,
      [req.tenantId, month, year]
    );

    const grouped = {};
    for (const row of rows) {
      const d = row.scheduled_date instanceof Date
        ? row.scheduled_date.toISOString().split("T")[0]
        : String(row.scheduled_date);
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(row);
    }

    const calendar = Object.entries(grouped).map(([date, appointments]) => ({
      date,
      count: appointments.length,
      appointments,
    }));

    res.json(calendar);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { status, date, from, to, employee_id, search } = req.query;
    let sql = `SELECT a.*, c.full_name AS customer_name, v.brand AS vehicle_brand, v.model AS vehicle_model, v.license_plate,
                      e.name AS employee_name, s.name AS service_name
               FROM appointments a
               LEFT JOIN customers c ON a.customer_id = c.id
               LEFT JOIN vehicles v ON a.vehicle_id = v.id
               LEFT JOIN employees e ON a.employee_id = e.id
               LEFT JOIN services s ON a.service_id = s.id`;
    const params = [];
    const conditions = ["a.tenant_id = ?"];
    params.push(req.tenantId);

    if (status && status !== "all") { conditions.push("a.status = ?"); params.push(status); }
    if (date) { conditions.push("a.scheduled_date = ?"); params.push(date); }
    if (from && to) { conditions.push("a.scheduled_date BETWEEN ? AND ?"); params.push(from, to); }
    if (employee_id) { conditions.push("a.employee_id = ?"); params.push(employee_id); }
    if (search) {
      conditions.push("(a.full_name LIKE ? OR a.phone LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s);
    }

    sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY a.scheduled_date DESC, a.scheduled_time ASC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
              v.brand AS vehicle_brand, v.model AS vehicle_model, v.license_plate, v.year AS vehicle_year,
              e.name AS employee_name, s.name AS service_name
       FROM appointments a
       LEFT JOIN customers c ON a.customer_id = c.id
       LEFT JOIN vehicles v ON a.vehicle_id = v.id
       LEFT JOIN employees e ON a.employee_id = e.id
       LEFT JOIN services s ON a.service_id = s.id
       WHERE a.id = ? AND a.tenant_id = ?`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: "RDV non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      customer_id, vehicle_id, employee_id, service_id,
      full_name, phone, email, vehicle_info, service_type,
      scheduled_date, scheduled_time, duration_minutes, notes,
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO appointments
       (tenant_id, customer_id, vehicle_id, employee_id, service_id, full_name, phone, email, vehicle_info, service_type, scheduled_date, scheduled_time, duration_minutes, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.tenantId, customer_id || null, vehicle_id || null, employee_id || null, service_id || null,
        full_name, phone, email || null, vehicle_info || null, service_type || null,
        scheduled_date, scheduled_time, duration_minutes || 30, notes || null,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM appointments WHERE id = ? AND tenant_id = ?", [result.insertId, req.tenantId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const allowed = [
      "customer_id", "vehicle_id", "employee_id", "service_id",
      "full_name", "phone", "email", "vehicle_info", "service_type",
      "scheduled_date", "scheduled_time", "duration_minutes", "notes", "status",
    ];
    const fields = [];
    const params = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(req.body[key] === "" ? null : req.body[key]);
      }
    }

    if (!fields.length) return res.status(400).json({ error: "Aucun champ à mettre à jour" });

    params.push(req.params.id, req.tenantId);
    await pool.query(`UPDATE appointments SET ${fields.join(", ")} WHERE id = ? AND tenant_id = ?`, params);

    const [rows] = await pool.query("SELECT * FROM appointments WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenantId]);
    if (!rows.length) return res.status(404).json({ error: "RDV non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Le statut est requis" });

    await pool.query(
      "UPDATE appointments SET status = ? WHERE id = ? AND tenant_id = ?",
      [status, req.params.id, req.tenantId]
    );

    if (status === "completed") {
      const [appt] = await pool.query(
        "SELECT customer_id FROM appointments WHERE id = ? AND tenant_id = ?",
        [req.params.id, req.tenantId]
      );
      if (appt[0]?.customer_id) {
        await pool.query(
          "UPDATE customers SET visit_count = visit_count + 1 WHERE id = ? AND tenant_id = ?",
          [appt[0].customer_id, req.tenantId]
        );
      }
    }

    const [rows] = await pool.query("SELECT * FROM appointments WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenantId]);
    if (!rows.length) return res.status(404).json({ error: "RDV non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM appointments WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenantId]);
    if (!result.affectedRows) return res.status(404).json({ error: "RDV non trouvé" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
