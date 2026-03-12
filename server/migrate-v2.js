import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const run = async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  });

  await conn.query(`USE \`${process.env.DB_NAME || "pneumatique"}\``);

  const alterQueries = [
    `ALTER TABLE tires ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) DEFAULT NULL`,
    `ALTER TABLE tires ADD COLUMN IF NOT EXISTS dot_code VARCHAR(20) DEFAULT NULL`,
    `ALTER TABLE tires ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL`,

    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_type ENUM('percent','fixed') DEFAULT 'fixed'`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method ENUM('cash','card','bank_transfer','cheque','other') DEFAULT 'cash'`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_credit_note TINYINT(1) DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_invoice_id INT DEFAULT NULL`,

    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS priority ENUM('low','normal','high','urgent') DEFAULT 'normal'`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS estimated_duration INT DEFAULT NULL`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS actual_duration INT DEFAULT NULL`,
  ];

  for (const q of alterQueries) {
    try {
      await conn.query(q);
    } catch (err) {
      if (err.code !== "ER_DUP_FIELDNAME" && !err.message.includes("Duplicate column")) {
        console.warn("Skipping:", q.slice(0, 60), "—", err.message);
      }
    }
  }

  console.log("Migration v2 completed successfully!");
  await conn.end();
};

run().catch((err) => {
  console.error("Migration v2 failed:", err);
  process.exit(1);
});
