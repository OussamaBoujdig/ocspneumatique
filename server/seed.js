import bcrypt from "bcryptjs";
import pool from "./db.js";

const run = async () => {
  const hash = await bcrypt.hash("admin123", 10);

  await pool.query(
    `INSERT IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
    ["Administrateur", "admin@ocspneus.com", hash, "admin"]
  );

  const tireBrands = ["Michelin", "Continental", "Bridgestone", "Goodyear", "Pirelli", "Dunlop", "Hankook", "Yokohama"];
  for (const b of tireBrands) {
    await pool.query(`INSERT IGNORE INTO tire_brands (name) VALUES (?)`, [b]);
  }

  const services = [
    { name: "Montage pneus", description: "Montage et démontage de pneumatiques", default_price: 15, duration_minutes: 20, category: "montage" },
    { name: "Équilibrage", description: "Équilibrage des roues", default_price: 12, duration_minutes: 15, category: "equilibrage" },
    { name: "Réparation crevaison", description: "Réparation de pneu crevé", default_price: 25, duration_minutes: 30, category: "reparation" },
    { name: "Permutation pneus", description: "Permutation avant/arrière", default_price: 20, duration_minutes: 25, category: "permutation" },
    { name: "Contrôle pression", description: "Vérification et ajustement de la pression", default_price: 0, duration_minutes: 10, category: "controle" },
    { name: "Géométrie / Parallélisme", description: "Réglage de la géométrie des roues", default_price: 60, duration_minutes: 45, category: "geometrie" },
    { name: "Montage + Équilibrage", description: "Montage complet avec équilibrage", default_price: 25, duration_minutes: 30, category: "montage" },
    { name: "Stockage pneus", description: "Stockage saisonnier de pneumatiques", default_price: 40, duration_minutes: 15, category: "autre" },
  ];
  for (const s of services) {
    await pool.query(
      `INSERT IGNORE INTO services (name, description, default_price, duration_minutes, category) VALUES (?, ?, ?, ?, ?)`,
      [s.name, s.description, s.default_price, s.duration_minutes, s.category]
    );
  }

  console.log("Seed completed! Admin login: admin@ocspneus.com / admin123");
  process.exit(0);
};

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
