import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const run = async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || "pneumatique"}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${process.env.DB_NAME || "pneumatique"}\``);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(191) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin','staff') DEFAULT 'staff',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      email VARCHAR(191) DEFAULT NULL,
      address TEXT DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NOT NULL,
      brand VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      year INT DEFAULT NULL,
      license_plate VARCHAR(20) DEFAULT NULL,
      vin VARCHAR(50) DEFAULT NULL,
      mileage INT DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tire_brands (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS tires (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand_id INT DEFAULT NULL,
      model VARCHAR(150) NOT NULL,
      size VARCHAR(50) NOT NULL,
      type ENUM('summer','winter','all_season','sport') DEFAULT 'all_season',
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      cost DECIMAL(10,2) NOT NULL DEFAULT 0,
      stock_qty INT NOT NULL DEFAULT 0,
      min_stock INT NOT NULL DEFAULT 2,
      location VARCHAR(50) DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES tire_brands(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      description TEXT DEFAULT NULL,
      default_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      duration_minutes INT DEFAULT 30,
      category ENUM('montage','equilibrage','reparation','permutation','controle','geometrie','autre') DEFAULT 'autre',
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT DEFAULT NULL,
      vehicle_id INT DEFAULT NULL,
      full_name VARCHAR(150) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      email VARCHAR(191) DEFAULT NULL,
      vehicle_brand VARCHAR(100) DEFAULT NULL,
      vehicle_model VARCHAR(100) DEFAULT NULL,
      service_type VARCHAR(100) NOT NULL,
      preferred_date DATE NOT NULL,
      preferred_time VARCHAR(10) NOT NULL,
      message TEXT DEFAULT NULL,
      status ENUM('pending','confirmed','in_progress','completed','cancelled') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS work_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      appointment_id INT DEFAULT NULL,
      client_id INT DEFAULT NULL,
      vehicle_id INT DEFAULT NULL,
      status ENUM('open','in_progress','completed','cancelled') DEFAULT 'open',
      technician VARCHAR(100) DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      started_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS work_order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      work_order_id INT NOT NULL,
      service_id INT DEFAULT NULL,
      tire_id INT DEFAULT NULL,
      description VARCHAR(255) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      total DECIMAL(10,2) NOT NULL DEFAULT 0,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
      FOREIGN KEY (tire_id) REFERENCES tires(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      work_order_id INT DEFAULT NULL,
      client_id INT DEFAULT NULL,
      subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
      tax_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
      tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      total DECIMAL(10,2) NOT NULL DEFAULT 0,
      status ENUM('draft','sent','paid','overdue','cancelled') DEFAULT 'draft',
      due_date DATE DEFAULT NULL,
      paid_at TIMESTAMP NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
    );
  `);

  console.log("Migration completed successfully!");
  await conn.end();
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
