import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { category, active } = req.query;
    let sql = "SELECT * FROM services";
    const conditions = ["tenant_id = ?"];
    const params = [req.tenantId];

    if (category) {
      conditions.push("category = ?");
      params.push(category);
    }
    if (active !== undefined) {
      conditions.push("active = ?");
      params.push(active === "true" ? 1 : 0);
    }

    sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY category, name";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM services WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: "Service non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description, category, default_price, duration_minutes } = req.body;
    const [result] = await pool.query(
      `INSERT INTO services (tenant_id, name, description, category, default_price, duration_minutes)
       VALUES (?,?,?,?,?,?)`,
      [req.tenantId, name, description || null, category || "autre", default_price || 0, duration_minutes || 30]
    );
    const [rows] = await pool.query(
      "SELECT * FROM services WHERE id = ? AND tenant_id = ?",
      [result.insertId, req.tenantId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, description, category, default_price, duration_minutes } = req.body;
    await pool.query(
      `UPDATE services SET name=?, description=?, category=?, default_price=?, duration_minutes=?
       WHERE id=? AND tenant_id=?`,
      [name, description || null, category || "autre", default_price || 0, duration_minutes || 30, req.params.id, req.tenantId]
    );
    const [rows] = await pool.query(
      "SELECT * FROM services WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: "Service non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM services WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenantId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
