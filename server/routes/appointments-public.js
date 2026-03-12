import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.post("/", async (req, res) => {
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

export default router;
