import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { status, date, search } = req.query;
    let sql = `SELECT a.*, c.full_name as client_name_ref FROM appointments a LEFT JOIN clients c ON a.client_id = c.id`;
    const params = [];
    const conditions = [];
    if (status && status !== "all") { conditions.push("a.status = ?"); params.push(status); }
    if (date) { conditions.push("a.preferred_date = ?"); params.push(date); }
    if (search) {
      conditions.push("(a.full_name LIKE ? OR a.phone LIKE ? OR a.service_type LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY a.preferred_date DESC, a.preferred_time ASC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM appointments WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "RDV non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public endpoint for booking from the website
router.post("/public", async (req, res) => {
  try {
    const { full_name, phone, email, vehicle_brand, vehicle_model, service_type, preferred_date, preferred_time, message } = req.body;
    const [result] = await pool.query(
      `INSERT INTO appointments (full_name, phone, email, vehicle_brand, vehicle_model, service_type, preferred_date, preferred_time, message)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [full_name, phone, email || null, vehicle_brand || null, vehicle_model || null, service_type, preferred_date, preferred_time, message || null]
    );
    res.status(201).json({ id: result.insertId, message: "Rendez-vous créé avec succès" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { client_id, vehicle_id, full_name, phone, email, vehicle_brand, vehicle_model, service_type, preferred_date, preferred_time, message, status } = req.body;
    const [result] = await pool.query(
      `INSERT INTO appointments (client_id, vehicle_id, full_name, phone, email, vehicle_brand, vehicle_model, service_type, preferred_date, preferred_time, message, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [client_id || null, vehicle_id || null, full_name, phone, email || null, vehicle_brand || null, vehicle_model || null, service_type, preferred_date, preferred_time, message || null, status || "pending"]
    );
    const [rows] = await pool.query("SELECT * FROM appointments WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { status, full_name, phone, email, vehicle_brand, vehicle_model, service_type, preferred_date, preferred_time, message, client_id, vehicle_id } = req.body;
    const fields = [];
    const params = [];
    if (status !== undefined) { fields.push("status=?"); params.push(status); }
    if (full_name !== undefined) { fields.push("full_name=?"); params.push(full_name); }
    if (phone !== undefined) { fields.push("phone=?"); params.push(phone); }
    if (email !== undefined) { fields.push("email=?"); params.push(email || null); }
    if (vehicle_brand !== undefined) { fields.push("vehicle_brand=?"); params.push(vehicle_brand); }
    if (vehicle_model !== undefined) { fields.push("vehicle_model=?"); params.push(vehicle_model); }
    if (service_type !== undefined) { fields.push("service_type=?"); params.push(service_type); }
    if (preferred_date !== undefined) { fields.push("preferred_date=?"); params.push(preferred_date); }
    if (preferred_time !== undefined) { fields.push("preferred_time=?"); params.push(preferred_time); }
    if (message !== undefined) { fields.push("message=?"); params.push(message); }
    if (client_id !== undefined) { fields.push("client_id=?"); params.push(client_id); }
    if (vehicle_id !== undefined) { fields.push("vehicle_id=?"); params.push(vehicle_id); }

    if (!fields.length) return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    params.push(req.params.id);
    await pool.query(`UPDATE appointments SET ${fields.join(", ")} WHERE id = ?`, params);
    const [rows] = await pool.query("SELECT * FROM appointments WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM appointments WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
