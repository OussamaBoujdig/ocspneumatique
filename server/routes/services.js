import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { category, active } = req.query;
    let sql = "SELECT * FROM services";
    const params = [];
    const conditions = [];
    if (category) { conditions.push("category = ?"); params.push(category); }
    if (active !== undefined) { conditions.push("active = ?"); params.push(active === "true" ? 1 : 0); }
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY category, name";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM services WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Service non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description, default_price, duration_minutes, category, active } = req.body;
    const [result] = await pool.query(
      "INSERT INTO services (name, description, default_price, duration_minutes, category, active) VALUES (?,?,?,?,?,?)",
      [name, description || null, default_price || 0, duration_minutes || 30, category || "autre", active !== undefined ? active : 1]
    );
    const [rows] = await pool.query("SELECT * FROM services WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, description, default_price, duration_minutes, category, active } = req.body;
    await pool.query(
      "UPDATE services SET name=?, description=?, default_price=?, duration_minutes=?, category=?, active=? WHERE id=?",
      [name, description || null, default_price || 0, duration_minutes || 30, category || "autre", active !== undefined ? active : 1, req.params.id]
    );
    const [rows] = await pool.query("SELECT * FROM services WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM services WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
