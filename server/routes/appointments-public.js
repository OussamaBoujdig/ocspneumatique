import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const {
      tenant_slug, full_name, phone, email,
      vehicle_info, service_type, scheduled_date, scheduled_time, notes,
    } = req.body;

    if (!tenant_slug) return res.status(400).json({ error: "tenant_slug est requis" });
    if (!full_name || !phone || !scheduled_date || !scheduled_time) {
      return res.status(400).json({ error: "full_name, phone, scheduled_date et scheduled_time sont requis" });
    }

    const [tenants] = await pool.query("SELECT id FROM tenants WHERE slug = ?", [tenant_slug]);
    if (!tenants.length) return res.status(404).json({ error: "Garage non trouvé" });

    const tenantId = tenants[0].id;

    const [result] = await pool.query(
      `INSERT INTO appointments
       (tenant_id, full_name, phone, email, vehicle_info, service_type, scheduled_date, scheduled_time, notes)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [tenantId, full_name, phone, email || null, vehicle_info || null, service_type || null, scheduled_date, scheduled_time, notes || null]
    );

    res.status(201).json({ id: result.insertId, message: "Rendez-vous créé avec succès" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
