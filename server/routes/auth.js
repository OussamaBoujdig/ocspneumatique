import { Router } from "express";
import bcrypt from "bcryptjs";
import pool from "../db.js";
import { generateToken, authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const [rows] = await pool.query(
      `SELECT u.*, r.name AS role_name, t.name AS tenant_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = ? AND u.is_active = 1`,
      [email]
    );
    if (!rows.length) {
      return res.status(401).json({ error: "Identifiants incorrects" });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Identifiants incorrects" });
    }

    await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);

    const token = generateToken({ ...user, role_name: user.role_name });
    res.json({
      token,
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        name: user.name,
        email: user.email,
        role: user.role_name || "staff",
        tenant_name: user.tenant_name,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.tenant_id, u.name, u.email, u.phone, u.avatar_url,
              r.name AS role, t.name AS tenant_name, t.slug AS tenant_slug,
              t.subscription_plan, t.subscription_status
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = ? AND u.tenant_id = ?`,
      [req.user.id, req.tenantId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/register-tenant", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { tenant_name, tenant_slug, name, email, password, phone } = req.body;
    if (!tenant_name || !tenant_slug || !name || !email || !password) {
      return res.status(400).json({ error: "Tous les champs obligatoires doivent être remplis" });
    }

    await conn.beginTransaction();

    const [existingTenant] = await conn.query(
      "SELECT id FROM tenants WHERE slug = ?",
      [tenant_slug]
    );
    if (existingTenant.length) {
      await conn.rollback();
      return res.status(409).json({ error: "Ce slug est déjà utilisé" });
    }

    const [existingUser] = await conn.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length) {
      await conn.rollback();
      return res.status(409).json({ error: "Cet email est déjà utilisé" });
    }

    const [tenantResult] = await conn.query(
      `INSERT INTO tenants (name, slug, email, phone, subscription_status, trial_ends_at)
       VALUES (?, ?, ?, ?, 'trial', DATE_ADD(NOW(), INTERVAL 14 DAY))`,
      [tenant_name, tenant_slug, email, phone || null]
    );
    const tenantId = tenantResult.insertId;

    const defaultRoles = ["owner", "manager", "technician", "receptionist"];
    const roleIds = {};
    for (const roleName of defaultRoles) {
      const [roleResult] = await conn.query(
        "INSERT INTO roles (tenant_id, name) VALUES (?, ?)",
        [tenantId, roleName]
      );
      roleIds[roleName] = roleResult.insertId;
    }

    const hashed = await bcrypt.hash(password, 10);
    const [userResult] = await conn.query(
      `INSERT INTO users (tenant_id, role_id, name, email, password, phone)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tenantId, roleIds.owner, name, email, hashed, phone || null]
    );

    await conn.commit();

    const user = {
      id: userResult.insertId,
      tenant_id: tenantId,
      name,
      email,
      role_name: "owner",
    };
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        tenant_id: tenantId,
        name,
        email,
        role: "owner",
        tenant_name: tenant_name,
      },
      tenant: {
        id: tenantId,
        name: tenant_name,
        slug: tenant_slug,
      },
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

export default router;
