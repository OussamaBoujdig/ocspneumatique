import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { client_id, search } = req.query;
    let sql = `SELECT v.*, c.full_name as client_name FROM vehicles v LEFT JOIN clients c ON v.client_id = c.id`;
    const params = [];
    const conditions = [];
    if (client_id) { conditions.push("v.client_id = ?"); params.push(client_id); }
    if (search) {
      conditions.push("(v.brand LIKE ? OR v.model LIKE ? OR v.license_plate LIKE ? OR c.full_name LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
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
      `SELECT v.*, c.full_name as client_name FROM vehicles v LEFT JOIN clients c ON v.client_id = c.id WHERE v.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Véhicule non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { client_id, brand, model, year, license_plate, vin, mileage, notes } = req.body;
    const [result] = await pool.query(
      "INSERT INTO vehicles (client_id, brand, model, year, license_plate, vin, mileage, notes) VALUES (?,?,?,?,?,?,?,?)",
      [client_id, brand, model, year || null, license_plate || null, vin || null, mileage || null, notes || null]
    );
    const [rows] = await pool.query("SELECT * FROM vehicles WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { client_id, brand, model, year, license_plate, vin, mileage, notes } = req.body;
    await pool.query(
      "UPDATE vehicles SET client_id=?, brand=?, model=?, year=?, license_plate=?, vin=?, mileage=?, notes=? WHERE id=?",
      [client_id, brand, model, year || null, license_plate || null, vin || null, mileage || null, notes || null, req.params.id]
    );
    const [rows] = await pool.query("SELECT * FROM vehicles WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM vehicles WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
