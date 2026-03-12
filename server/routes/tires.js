import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/brands", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM tire_brands ORDER BY name");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/barcode/:code", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, tb.name as brand_name FROM tires t LEFT JOIN tire_brands tb ON t.brand_id = tb.id WHERE t.barcode = ?`,
      [req.params.code]
    );
    if (!rows.length) return res.status(404).json({ error: "Produit non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { search, type, low_stock } = req.query;
    let sql = `SELECT t.*, tb.name as brand_name FROM tires t LEFT JOIN tire_brands tb ON t.brand_id = tb.id`;
    const params = [];
    const conditions = [];
    if (search) {
      conditions.push("(t.model LIKE ? OR t.size LIKE ? OR tb.name LIKE ? OR t.barcode LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (type) { conditions.push("t.type = ?"); params.push(type); }
    if (low_stock === "true") conditions.push("t.stock_qty <= t.min_stock");
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY tb.name, t.model";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, tb.name as brand_name FROM tires t LEFT JOIN tire_brands tb ON t.brand_id = tb.id WHERE t.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Pneu non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { brand_id, model, size, type, price, cost, stock_qty, min_stock, location, notes, barcode, dot_code } = req.body;
    const [result] = await pool.query(
      "INSERT INTO tires (brand_id, model, size, type, price, cost, stock_qty, min_stock, location, notes, barcode, dot_code) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      [brand_id || null, model, size, type || "all_season", price || 0, cost || 0, stock_qty || 0, min_stock || 2, location || null, notes || null, barcode || null, dot_code || null]
    );
    const [rows] = await pool.query("SELECT t.*, tb.name as brand_name FROM tires t LEFT JOIN tire_brands tb ON t.brand_id = tb.id WHERE t.id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { brand_id, model, size, type, price, cost, stock_qty, min_stock, location, notes, barcode, dot_code } = req.body;
    await pool.query(
      "UPDATE tires SET brand_id=?, model=?, size=?, type=?, price=?, cost=?, stock_qty=?, min_stock=?, location=?, notes=?, barcode=?, dot_code=? WHERE id=?",
      [brand_id || null, model, size, type || "all_season", price || 0, cost || 0, stock_qty || 0, min_stock || 2, location || null, notes || null, barcode || null, dot_code || null, req.params.id]
    );
    const [rows] = await pool.query("SELECT t.*, tb.name as brand_name FROM tires t LEFT JOIN tire_brands tb ON t.brand_id = tb.id WHERE t.id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM tires WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
