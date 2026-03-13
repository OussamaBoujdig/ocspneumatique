import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "change_this";

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, tenant_id: user.tenant_id, email: user.email, role: user.role_name || "staff" },
    SECRET,
    { expiresIn: "24h" }
  );
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  try {
    const decoded = jwt.verify(header.slice(7), SECRET);
    req.user = decoded;
    req.tenantId = decoded.tenant_id;
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Non autorisé" });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Accès refusé" });
    }
    next();
  };
}
