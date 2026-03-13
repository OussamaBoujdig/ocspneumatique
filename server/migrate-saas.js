import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DB_NAME = process.env.DB_NAME || "tiregarage";

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });

  console.log("Connected to MySQL");

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${DB_NAME}\``);
  console.log(`Using database: ${DB_NAME}`);

  await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);

  const tables = [
    "activity_log",
    "notifications",
    "tire_installations",
    "invoice_items",
    "invoices",
    "work_order_items",
    "work_orders",
    "appointments",
    "employees",
    "services",
    "inventory_movements",
    "tires",
    "suppliers",
    "tire_brands",
    "vehicles",
    "customers",
    "users",
    "roles",
    "tenants",
  ];

  for (const t of tables) {
    await conn.query(`DROP TABLE IF EXISTS \`${t}\``);
  }
  console.log("Dropped existing tables");

  await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

  // 1. tenants
  await conn.query(`
    CREATE TABLE tenants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(191),
      phone VARCHAR(30),
      address TEXT,
      city VARCHAR(100),
      logo_url VARCHAR(500),
      subscription_plan ENUM('free','starter','pro','enterprise') DEFAULT 'free',
      subscription_status ENUM('active','trial','expired','cancelled') DEFAULT 'trial',
      trial_ends_at TIMESTAMP NULL,
      settings JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: tenants");

  // 2. roles
  await conn.query(`
    CREATE TABLE roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(50) NOT NULL,
      permissions JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_roles_tenant_name (tenant_id, name),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: roles");

  // 3. users
  await conn.query(`
    CREATE TABLE users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      role_id INT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(191) NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(30),
      avatar_url VARCHAR(500),
      is_active TINYINT(1) DEFAULT 1,
      last_login_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_users_tenant_email (tenant_id, email),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: users");

  // 4. customers
  await conn.query(`
    CREATE TABLE customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      full_name VARCHAR(150) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      email VARCHAR(191),
      address TEXT,
      city VARCHAR(100),
      notes TEXT,
      tags VARCHAR(500),
      total_spent DECIMAL(12,2) DEFAULT 0,
      visit_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_customers_tenant_phone (tenant_id, phone),
      INDEX idx_customers_tenant_name (tenant_id, full_name),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: customers");

  // 5. vehicles
  await conn.query(`
    CREATE TABLE vehicles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      customer_id INT NOT NULL,
      brand VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      year INT,
      license_plate VARCHAR(20),
      vin VARCHAR(50),
      tire_size VARCHAR(30),
      mileage INT DEFAULT 0,
      color VARCHAR(30),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_vehicles_tenant_plate (tenant_id, license_plate),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: vehicles");

  // 6. tire_brands
  await conn.query(`
    CREATE TABLE tire_brands (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      logo_url VARCHAR(500),
      UNIQUE KEY uq_tire_brands_tenant_name (tenant_id, name),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: tire_brands");

  // 7. suppliers
  await conn.query(`
    CREATE TABLE suppliers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(200) NOT NULL,
      contact_name VARCHAR(100),
      phone VARCHAR(30),
      email VARCHAR(191),
      address TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: suppliers");

  // 8. tires
  await conn.query(`
    CREATE TABLE tires (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      brand_id INT,
      supplier_id INT,
      model VARCHAR(150) NOT NULL,
      size VARCHAR(50) NOT NULL,
      season ENUM('summer','winter','all_season','sport') DEFAULT 'all_season',
      barcode VARCHAR(100),
      dot_code VARCHAR(20),
      purchase_price DECIMAL(10,2) DEFAULT 0,
      sale_price DECIMAL(10,2) DEFAULT 0,
      stock_qty INT DEFAULT 0,
      min_stock INT DEFAULT 2,
      location VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tires_tenant_barcode (tenant_id, barcode),
      INDEX idx_tires_tenant_size (tenant_id, size),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (brand_id) REFERENCES tire_brands(id) ON DELETE SET NULL,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: tires");

  // 9. inventory_movements
  await conn.query(`
    CREATE TABLE inventory_movements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      tire_id INT NOT NULL,
      user_id INT,
      type ENUM('purchase','sale','adjustment','return') NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10,2),
      reference VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (tire_id) REFERENCES tires(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: inventory_movements");

  // 10. services
  await conn.query(`
    CREATE TABLE services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      category ENUM('installation','balancing','repair','alignment','rotation','inspection','geometry','other') DEFAULT 'other',
      default_price DECIMAL(10,2) DEFAULT 0,
      duration_minutes INT DEFAULT 30,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: services");

  // 11. employees
  await conn.query(`
    CREATE TABLE employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      user_id INT,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(30),
      role_title VARCHAR(50),
      specialization VARCHAR(200),
      hourly_rate DECIMAL(8,2) DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      hire_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: employees");

  // 12. appointments
  await conn.query(`
    CREATE TABLE appointments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      customer_id INT,
      vehicle_id INT,
      employee_id INT,
      service_id INT,
      full_name VARCHAR(150) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      email VARCHAR(191),
      vehicle_info VARCHAR(200),
      service_type VARCHAR(100),
      scheduled_date DATE NOT NULL,
      scheduled_time VARCHAR(10) NOT NULL,
      duration_minutes INT DEFAULT 30,
      status ENUM('scheduled','confirmed','in_progress','completed','cancelled','no_show') DEFAULT 'scheduled',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_appointments_tenant_date (tenant_id, scheduled_date),
      INDEX idx_appointments_tenant_status (tenant_id, status),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: appointments");

  // 13. work_orders
  await conn.query(`
    CREATE TABLE work_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      appointment_id INT,
      customer_id INT,
      vehicle_id INT,
      assigned_to INT,
      status ENUM('open','in_progress','completed','cancelled') DEFAULT 'open',
      priority ENUM('low','normal','high','urgent') DEFAULT 'normal',
      technician_name VARCHAR(100),
      estimated_duration INT,
      actual_duration INT,
      notes TEXT,
      started_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_work_orders_tenant_status (tenant_id, status),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: work_orders");

  // 14. work_order_items
  await conn.query(`
    CREATE TABLE work_order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      work_order_id INT NOT NULL,
      service_id INT,
      tire_id INT,
      description VARCHAR(255) NOT NULL,
      quantity INT DEFAULT 1,
      unit_price DECIMAL(10,2) DEFAULT 0,
      total DECIMAL(10,2) DEFAULT 0,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
      FOREIGN KEY (tire_id) REFERENCES tires(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: work_order_items");

  // 15. invoices
  await conn.query(`
    CREATE TABLE invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      invoice_number VARCHAR(50) NOT NULL,
      work_order_id INT,
      customer_id INT,
      subtotal DECIMAL(12,2) DEFAULT 0,
      discount_amount DECIMAL(10,2) DEFAULT 0,
      discount_type ENUM('percent','fixed') DEFAULT 'fixed',
      tax_rate DECIMAL(5,2) DEFAULT 20,
      tax_amount DECIMAL(10,2) DEFAULT 0,
      total DECIMAL(12,2) DEFAULT 0,
      amount_paid DECIMAL(12,2) DEFAULT 0,
      payment_method ENUM('cash','card','bank_transfer','cheque','other') DEFAULT 'cash',
      status ENUM('draft','sent','paid','partial','overdue','cancelled') DEFAULT 'draft',
      is_credit_note TINYINT(1) DEFAULT 0,
      original_invoice_id INT,
      due_date DATE,
      paid_at TIMESTAMP NULL,
      notes TEXT,
      pdf_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_invoices_tenant_number (tenant_id, invoice_number),
      INDEX idx_invoices_tenant_status (tenant_id, status),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (original_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: invoices");

  // 16. invoice_items
  await conn.query(`
    CREATE TABLE invoice_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_id INT NOT NULL,
      description VARCHAR(255) NOT NULL,
      quantity INT DEFAULT 1,
      unit_price DECIMAL(10,2) DEFAULT 0,
      total DECIMAL(10,2) DEFAULT 0,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: invoice_items");

  // 17. tire_installations
  await conn.query(`
    CREATE TABLE tire_installations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      vehicle_id INT NOT NULL,
      tire_id INT,
      work_order_id INT,
      position ENUM('front_left','front_right','rear_left','rear_right','spare') NOT NULL,
      tire_brand VARCHAR(100),
      tire_model VARCHAR(150),
      tire_size VARCHAR(50),
      installed_at DATE NOT NULL,
      mileage_at_install INT,
      removed_at DATE,
      mileage_at_removal INT,
      condition_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tire_installations_tenant_vehicle (tenant_id, vehicle_id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
      FOREIGN KEY (tire_id) REFERENCES tires(id) ON DELETE SET NULL,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: tire_installations");

  // 18. notifications
  await conn.query(`
    CREATE TABLE notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      customer_id INT,
      type ENUM('appointment_reminder','tire_replacement','low_stock','invoice','general') NOT NULL,
      channel ENUM('sms','email','whatsapp','in_app') NOT NULL,
      title VARCHAR(200),
      message TEXT,
      status ENUM('pending','sent','failed','read') DEFAULT 'pending',
      sent_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_notifications_tenant_type (tenant_id, type),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: notifications");

  // 19. activity_log
  await conn.query(`
    CREATE TABLE activity_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      user_id INT,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id INT,
      details JSON,
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_activity_log_tenant_created (tenant_id, created_at),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created: activity_log");

  console.log("\nTireGarage OS migration completed successfully!");

  await conn.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
