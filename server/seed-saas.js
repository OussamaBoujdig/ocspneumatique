import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const run = async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "tiregarage",
    multipleStatements: true,
  });

  const hash = await bcrypt.hash("admin123", 10);

  // Tenant
  await conn.query(`INSERT INTO tenants (name, slug, email, phone, address, city, subscription_plan, subscription_status)
    VALUES ('OCS Pneus', 'ocs-pneus', 'contact@ocspneus.com', '+212600000000', '123 Rue Principale', 'Casablanca', 'pro', 'active')`);

  // Roles
  await conn.query(`INSERT INTO roles (tenant_id, name, permissions) VALUES
    (1, 'owner', '["*"]'),
    (1, 'manager', '["customers","vehicles","tires","services","appointments","work_orders","invoices","employees","reports"]'),
    (1, 'technician', '["appointments.view","work_orders","tires.view"]'),
    (1, 'receptionist', '["customers","appointments","invoices.view"]')`);

  // Admin user
  await conn.query(`INSERT INTO users (tenant_id, role_id, name, email, password, phone) VALUES
    (1, 1, 'Admin OCS', 'admin@ocspneus.com', ?, '+212600000001')`, [hash]);

  // Employees
  await conn.query(`INSERT INTO employees (tenant_id, user_id, name, phone, role_title, specialization, hourly_rate, hire_date) VALUES
    (1, 1, 'Admin OCS', '+212600000001', 'Owner', 'Management', 0, '2024-01-01'),
    (1, NULL, 'Ahmed Benali', '+212611111111', 'Technician', 'Montage & Équilibrage', 50, '2024-03-01'),
    (1, NULL, 'Youssef Tazi', '+212622222222', 'Technician', 'Géométrie & Alignement', 55, '2024-06-01'),
    (1, NULL, 'Fatima Zahra', '+212633333333', 'Receptionist', 'Accueil & Planning', 40, '2024-02-01')`);

  // Tire brands
  await conn.query(`INSERT INTO tire_brands (tenant_id, name) VALUES
    (1,'Michelin'),(1,'Continental'),(1,'Bridgestone'),(1,'Goodyear'),(1,'Pirelli'),
    (1,'Hankook'),(1,'Yokohama'),(1,'Dunlop'),(1,'Firestone'),(1,'BFGoodrich')`);

  // Suppliers
  await conn.query(`INSERT INTO suppliers (tenant_id, name, contact_name, phone, email) VALUES
    (1, 'Pneu Distribution Maroc', 'Hassan Alami', '+212644444444', 'hassan@pneumaroc.com'),
    (1, 'TireWorld Import', 'Karim Fassi', '+212655555555', 'karim@tireworld.ma')`);

  // Services
  await conn.query(`INSERT INTO services (tenant_id, name, description, category, default_price, duration_minutes) VALUES
    (1, 'Montage pneu', 'Montage d''un pneu sur jante', 'installation', 50, 20),
    (1, 'Équilibrage', 'Équilibrage d''une roue', 'balancing', 30, 15),
    (1, 'Réparation pneu', 'Réparation crevaison', 'repair', 40, 25),
    (1, 'Géométrie / Parallélisme', 'Réglage géométrie complète', 'alignment', 200, 45),
    (1, 'Permutation pneus', 'Rotation des 4 pneus', 'rotation', 80, 30),
    (1, 'Contrôle pneus', 'Inspection visuelle et pression', 'inspection', 0, 10),
    (1, 'Montage + Équilibrage', 'Montage et équilibrage complet', 'installation', 70, 30),
    (1, 'Changement valve', 'Remplacement valve pneu', 'repair', 20, 10)`);

  // Tires inventory
  await conn.query(`INSERT INTO tires (tenant_id, brand_id, model, size, season, purchase_price, sale_price, stock_qty, min_stock, location) VALUES
    (1, 1, 'Primacy 4', '205/55R16', 'summer', 450, 650, 12, 4, 'A1-R1'),
    (1, 1, 'CrossClimate 2', '205/55R16', 'all_season', 520, 750, 8, 4, 'A1-R2'),
    (1, 1, 'Alpin 6', '205/55R16', 'winter', 480, 700, 6, 4, 'A2-R1'),
    (1, 2, 'PremiumContact 6', '225/45R17', 'summer', 500, 720, 10, 4, 'B1-R1'),
    (1, 2, 'WinterContact TS 870', '225/45R17', 'winter', 530, 780, 4, 4, 'B1-R2'),
    (1, 3, 'Turanza T005', '195/65R15', 'summer', 380, 550, 16, 6, 'C1-R1'),
    (1, 4, 'EfficientGrip', '185/65R15', 'summer', 340, 490, 20, 6, 'C2-R1'),
    (1, 5, 'Cinturato P7', '225/50R17', 'sport', 600, 880, 6, 2, 'D1-R1'),
    (1, 6, 'Ventus Prime 4', '215/55R17', 'summer', 420, 620, 8, 4, 'D2-R1'),
    (1, 7, 'BluEarth-GT AE51', '205/60R16', 'all_season', 400, 580, 10, 4, 'E1-R1')`);

  // Sample customers
  await conn.query(`INSERT INTO customers (tenant_id, full_name, phone, email, address, city) VALUES
    (1, 'Mohammed Alaoui', '+212661111111', 'mohammed@email.com', '45 Bd Zerktouni', 'Casablanca'),
    (1, 'Sara Bennani', '+212662222222', 'sara.b@email.com', '12 Rue Hassan II', 'Rabat'),
    (1, 'Karim Idrissi', '+212663333333', 'karim.i@email.com', '78 Ave Mohammed V', 'Marrakech'),
    (1, 'Amina Tazi', '+212664444444', 'amina.t@email.com', '23 Rue Fès', 'Casablanca'),
    (1, 'Omar Fassi', '+212665555555', NULL, '56 Bd Anfa', 'Casablanca')`);

  // Vehicles
  await conn.query(`INSERT INTO vehicles (tenant_id, customer_id, brand, model, year, license_plate, tire_size, mileage) VALUES
    (1, 1, 'Dacia', 'Logan', 2022, 'A-12345-B', '185/65R15', 35000),
    (1, 1, 'Renault', 'Clio', 2021, 'A-67890-C', '195/65R15', 42000),
    (1, 2, 'Volkswagen', 'Golf', 2023, 'B-11111-D', '205/55R16', 18000),
    (1, 3, 'BMW', '320i', 2022, 'C-22222-E', '225/45R17', 28000),
    (1, 4, 'Peugeot', '208', 2023, 'A-33333-F', '195/55R16', 12000),
    (1, 5, 'Mercedes', 'C200', 2021, 'A-44444-G', '225/50R17', 55000)`);

  console.log("TireGarage OS seed data inserted successfully!");
  console.log("Login: admin@ocspneus.com / admin123");
  await conn.end();
};

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
