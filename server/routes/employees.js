import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { active, role_title } = req.query;
    let sql = `SELECT e.*, u.email
                 FROM employees e
                 LEFT JOIN users u ON e.user_id = u.id`;
    const conditions = ["e.tenant_id = ?"];
    const params = [req.tenantId];

    if (active !== undefined) {
      conditions.push("e.is_active = ?");
      params.push(active === "true" ? 1 : 0);
    }
    if (role_title) {
      conditions.push("e.role_title = ?");
      params.push(role_title);
    }

    sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY e.name";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, u.email
         FROM employees e
         LEFT JOIN users u ON e.user_id = u.id
        WHERE e.id = ? AND e.tenant_id = ?`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: "Employé non trouvé" });

    const [stats] = await pool.query(
      `SELECT
         COUNT(wo.id) AS completed_work_orders,
         COALESCE(SUM(i.total_amount), 0) AS total_revenue
       FROM work_orders wo
       LEFT JOIN invoices i ON i.work_order_id = wo.id
       WHERE wo.assigned_to = ? AND wo.tenant_id = ? AND wo.status = 'completed'`,
      [req.params.id, req.tenantId]
    );

    res.json({ ...rows[0], ...stats[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, phone, role_title, specialization, hourly_rate, hire_date, user_id } = req.body;
    const [result] = await pool.query(
      `INSERT INTO employees
        (tenant_id, name, phone, role_title, specialization, hourly_rate, hire_date, user_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        req.tenantId, name, phone || null, role_title || null,
        specialization || null, hourly_rate || null, hire_date || null, user_id || null,
      ]
    );
    const [rows] = await pool.query(
      `SELECT e.*, u.email
         FROM employees e
         LEFT JOIN users u ON e.user_id = u.id
        WHERE e.id = ? AND e.tenant_id = ?`,
      [result.insertId, req.tenantId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, phone, role_title, specialization, hourly_rate, hire_date, user_id } = req.body;
    await pool.query(
      `UPDATE employees SET
        name=?, phone=?, role_title=?, specialization=?, hourly_rate=?, hire_date=?, user_id=?
       WHERE id=? AND tenant_id=?`,
      [
        name, phone || null, role_title || null, specialization || null,
        hourly_rate || null, hire_date || null, user_id || null,
        req.params.id, req.tenantId,
      ]
    );
    const [rows] = await pool.query(
      `SELECT e.*, u.email
         FROM employees e
         LEFT JOIN users u ON e.user_id = u.id
        WHERE e.id = ? AND e.tenant_id = ?`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: "Employé non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query(
      "UPDATE employees SET is_active = 0 WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/schedule", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: "Les paramètres 'from' et 'to' sont requis" });
    }

    const [rows] = await pool.query(
      `SELECT a.*
         FROM appointments a
        WHERE a.employee_id = ? AND a.tenant_id = ?
          AND a.preferred_date BETWEEN ? AND ?
        ORDER BY a.preferred_date, a.preferred_time`,
      [req.params.id, req.tenantId, from, to]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
