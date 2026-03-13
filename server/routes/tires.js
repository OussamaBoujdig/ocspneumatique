import { Router } from "express";
import pool from "../db.js";

const router = Router();

// ── Brands ──────────────────────────────────────────────────────────────────

router.get("/brands", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM tire_brands WHERE tenant_id = ? ORDER BY name",
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/brands", async (req, res) => {
  try {
    const { name } = req.body;
    const [result] = await pool.query(
      "INSERT INTO tire_brands (tenant_id, name) VALUES (?, ?)",
      [req.tenantId, name]
    );
    const [rows] = await pool.query(
      "SELECT * FROM tire_brands WHERE id = ? AND tenant_id = ?",
      [result.insertId, req.tenantId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Suppliers ───────────────────────────────────────────────────────────────

router.get("/suppliers", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM suppliers WHERE tenant_id = ? ORDER BY name",
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/suppliers", async (req, res) => {
  try {
    const { name, contact_name, phone, email, address, notes } = req.body;
    const [result] = await pool.query(
      "INSERT INTO suppliers (tenant_id, name, contact_name, phone, email, address, notes) VALUES (?,?,?,?,?,?,?)",
      [req.tenantId, name, contact_name || null, phone || null, email || null, address || null, notes || null]
    );
    const [rows] = await pool.query(
      "SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?",
      [result.insertId, req.tenantId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Barcode lookup ──────────────────────────────────────────────────────────

router.get("/barcode/:code", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, tb.name AS brand_name, s.name AS supplier_name
         FROM tires t
         LEFT JOIN tire_brands tb ON t.brand_id = tb.id
         LEFT JOIN suppliers s ON t.supplier_id = s.id
        WHERE t.barcode = ? AND t.tenant_id = ?`,
      [req.params.code, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: "Produit non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Tires CRUD ──────────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const { search, season, low_stock, supplier_id } = req.query;
    let sql = `SELECT t.*, tb.name AS brand_name, s.name AS supplier_name
                 FROM tires t
                 LEFT JOIN tire_brands tb ON t.brand_id = tb.id
                 LEFT JOIN suppliers s ON t.supplier_id = s.id`;
    const conditions = ["t.tenant_id = ?"];
    const params = [req.tenantId];

    if (search) {
      conditions.push("(t.model LIKE ? OR t.size LIKE ? OR tb.name LIKE ? OR t.barcode LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (season) {
      conditions.push("t.season = ?");
      params.push(season);
    }
    if (low_stock === "true") {
      conditions.push("t.stock_qty <= t.min_stock");
    }
    if (supplier_id) {
      conditions.push("t.supplier_id = ?");
      params.push(supplier_id);
    }

    sql += " WHERE " + conditions.join(" AND ");
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
      `SELECT t.*, tb.name AS brand_name, s.name AS supplier_name
         FROM tires t
         LEFT JOIN tire_brands tb ON t.brand_id = tb.id
         LEFT JOIN suppliers s ON t.supplier_id = s.id
        WHERE t.id = ? AND t.tenant_id = ?`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: "Pneu non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      brand_id, supplier_id, model, size, season, barcode, dot_code,
      purchase_price, sale_price, stock_qty, min_stock, location, notes,
    } = req.body;
    const [result] = await pool.query(
      `INSERT INTO tires
        (tenant_id, brand_id, supplier_id, model, size, season, barcode, dot_code,
         purchase_price, sale_price, stock_qty, min_stock, location, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.tenantId, brand_id || null, supplier_id || null, model, size,
        season || "all_season", barcode || null, dot_code || null,
        purchase_price || 0, sale_price || 0, stock_qty || 0, min_stock || 2,
        location || null, notes || null,
      ]
    );
    const [rows] = await pool.query(
      `SELECT t.*, tb.name AS brand_name, s.name AS supplier_name
         FROM tires t
         LEFT JOIN tire_brands tb ON t.brand_id = tb.id
         LEFT JOIN suppliers s ON t.supplier_id = s.id
        WHERE t.id = ? AND t.tenant_id = ?`,
      [result.insertId, req.tenantId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const {
      brand_id, supplier_id, model, size, season, barcode, dot_code,
      purchase_price, sale_price, stock_qty, min_stock, location, notes,
    } = req.body;
    await pool.query(
      `UPDATE tires SET
        brand_id=?, supplier_id=?, model=?, size=?, season=?, barcode=?, dot_code=?,
        purchase_price=?, sale_price=?, stock_qty=?, min_stock=?, location=?, notes=?
       WHERE id=? AND tenant_id=?`,
      [
        brand_id || null, supplier_id || null, model, size,
        season || "all_season", barcode || null, dot_code || null,
        purchase_price || 0, sale_price || 0, stock_qty || 0, min_stock || 2,
        location || null, notes || null,
        req.params.id, req.tenantId,
      ]
    );
    const [rows] = await pool.query(
      `SELECT t.*, tb.name AS brand_name, s.name AS supplier_name
         FROM tires t
         LEFT JOIN tire_brands tb ON t.brand_id = tb.id
         LEFT JOIN suppliers s ON t.supplier_id = s.id
        WHERE t.id = ? AND t.tenant_id = ?`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: "Pneu non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM tires WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenantId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Stock movements ─────────────────────────────────────────────────────────

router.post("/:id/stock-movement", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { type, quantity, unit_price, reference, notes } = req.body;

    const [tires] = await conn.query(
      "SELECT id, stock_qty FROM tires WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    if (!tires.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Pneu non trouvé" });
    }

    const delta = type === "in" ? Math.abs(quantity) : -Math.abs(quantity);
    const newQty = tires[0].stock_qty + delta;
    if (newQty < 0) {
      await conn.rollback();
      return res.status(400).json({ error: "Stock insuffisant" });
    }

    const [mvt] = await conn.query(
      `INSERT INTO inventory_movements
        (tenant_id, tire_id, type, quantity, unit_price, reference, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        req.tenantId, req.params.id, type, Math.abs(quantity),
        unit_price || null, reference || null, notes || null, req.user.id,
      ]
    );

    await conn.query(
      "UPDATE tires SET stock_qty = ? WHERE id = ? AND tenant_id = ?",
      [newQty, req.params.id, req.tenantId]
    );

    await conn.commit();

    const [rows] = await pool.query(
      "SELECT * FROM inventory_movements WHERE id = ? AND tenant_id = ?",
      [mvt.insertId, req.tenantId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

export default router;
