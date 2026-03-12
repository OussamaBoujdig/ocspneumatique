import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let sql = "SELECT * FROM clients";
    const params = [];
    if (search) {
      sql += " WHERE full_name LIKE ? OR phone LIKE ? OR email LIKE ?";
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    sql += " ORDER BY created_at DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM clients WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Client non trouvé" });
    const [vehicles] = await pool.query("SELECT * FROM vehicles WHERE client_id = ? ORDER BY created_at DESC", [req.params.id]);
    const [appointments] = await pool.query("SELECT * FROM appointments WHERE client_id = ? ORDER BY preferred_date DESC", [req.params.id]);
    res.json({ ...rows[0], vehicles, appointments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { full_name, phone, email, address, notes } = req.body;
    const [result] = await pool.query(
      "INSERT INTO clients (full_name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)",
      [full_name, phone, email || null, address || null, notes || null]
    );
    const [rows] = await pool.query("SELECT * FROM clients WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { full_name, phone, email, address, notes } = req.body;
    await pool.query(
      "UPDATE clients SET full_name=?, phone=?, email=?, address=?, notes=? WHERE id=?",
      [full_name, phone, email || null, address || null, notes || null, req.params.id]
    );
    const [rows] = await pool.query("SELECT * FROM clients WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM clients WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
