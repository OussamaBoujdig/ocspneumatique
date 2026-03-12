import { Router } from "express";
import pool from "../db.js";

const router = Router();

async function generateInvoiceNumber(prefix = "FAC") {
  const year = new Date().getFullYear();
  const [rows] = await pool.query(
    "SELECT COUNT(*) as count FROM invoices WHERE YEAR(created_at) = ?",
    [year]
  );
  const num = (rows[0].count + 1).toString().padStart(4, "0");
  return `${prefix}-${year}-${num}`;
}

router.get("/", async (req, res) => {
  try {
    const { status, client_id } = req.query;
    let sql = `SELECT i.*, c.full_name as client_name
               FROM invoices i
               LEFT JOIN clients c ON i.client_id = c.id`;
    const params = [];
    const conditions = [];
    if (status && status !== "all") { conditions.push("i.status = ?"); params.push(status); }
    if (client_id) { conditions.push("i.client_id = ?"); params.push(client_id); }
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY i.created_at DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, c.full_name as client_name, c.phone as client_phone, c.email as client_email, c.address as client_address
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       WHERE i.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Facture non trouvée" });

    let items = [];
    if (rows[0].work_order_id) {
      const [woItems] = await pool.query(
        `SELECT woi.*, s.name as service_name FROM work_order_items woi
         LEFT JOIN services s ON woi.service_id = s.id
         WHERE woi.work_order_id = ?`,
        [rows[0].work_order_id]
      );
      items = woItems;
    }

    res.json({ ...rows[0], items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { work_order_id, client_id, tax_rate, notes, due_date, discount_amount, discount_type, payment_method } = req.body;
    const invoice_number = await generateInvoiceNumber();

    let subtotal = 0;
    if (work_order_id) {
      const [items] = await pool.query("SELECT SUM(total) as sum FROM work_order_items WHERE work_order_id = ?", [work_order_id]);
      subtotal = items[0].sum || 0;
    }

    const rate = tax_rate !== undefined ? tax_rate : 20;
    const disc = Number(discount_amount) || 0;
    const discType = discount_type || "fixed";
    const actualDiscount = discType === "percent" ? subtotal * disc / 100 : disc;
    const afterDiscount = Math.max(subtotal - actualDiscount, 0);
    const tax_amount = afterDiscount * rate / 100;
    const total = afterDiscount + tax_amount;

    const [result] = await pool.query(
      `INSERT INTO invoices (invoice_number, work_order_id, client_id, subtotal, tax_rate, tax_amount, total, due_date, notes, discount_amount, discount_type, payment_method)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [invoice_number, work_order_id || null, client_id || null, subtotal, rate, tax_amount, total, due_date || null, notes || null, actualDiscount, discType, payment_method || "cash"]
    );
    const [rows] = await pool.query("SELECT * FROM invoices WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const extra = status === "paid" ? ", paid_at = NOW()" : "";
    await pool.query(`UPDATE invoices SET status = ?${extra} WHERE id = ?`, [status, req.params.id]);
    const [rows] = await pool.query("SELECT * FROM invoices WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/payment", async (req, res) => {
  try {
    const { amount_paid, payment_method } = req.body;
    const [inv] = await pool.query("SELECT * FROM invoices WHERE id = ?", [req.params.id]);
    if (!inv.length) return res.status(404).json({ error: "Facture non trouvée" });

    const newPaid = Number(inv[0].amount_paid) + Number(amount_paid);
    const isPaid = newPaid >= Number(inv[0].total);

    await pool.query(
      `UPDATE invoices SET amount_paid = ?, payment_method = ?${isPaid ? ", status = 'paid', paid_at = NOW()" : ""} WHERE id = ?`,
      [newPaid, payment_method || inv[0].payment_method, req.params.id]
    );
    const [rows] = await pool.query("SELECT * FROM invoices WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/duplicate", async (req, res) => {
  try {
    const [orig] = await pool.query("SELECT * FROM invoices WHERE id = ?", [req.params.id]);
    if (!orig.length) return res.status(404).json({ error: "Facture non trouvée" });

    const inv = orig[0];
    const invoice_number = await generateInvoiceNumber();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const [result] = await pool.query(
      `INSERT INTO invoices (invoice_number, work_order_id, client_id, subtotal, tax_rate, tax_amount, total, due_date, notes, discount_amount, discount_type, payment_method, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [invoice_number, inv.work_order_id, inv.client_id, inv.subtotal, inv.tax_rate, inv.tax_amount, inv.total, dueDate.toISOString().split("T")[0], inv.notes, inv.discount_amount, inv.discount_type, inv.payment_method, "draft"]
    );
    const [rows] = await pool.query("SELECT * FROM invoices WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/credit-note", async (req, res) => {
  try {
    const [orig] = await pool.query("SELECT * FROM invoices WHERE id = ?", [req.params.id]);
    if (!orig.length) return res.status(404).json({ error: "Facture non trouvée" });

    const inv = orig[0];
    const invoice_number = await generateInvoiceNumber("AV");

    const [result] = await pool.query(
      `INSERT INTO invoices (invoice_number, work_order_id, client_id, subtotal, tax_rate, tax_amount, total, notes, is_credit_note, original_invoice_id, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [invoice_number, inv.work_order_id, inv.client_id, -Math.abs(inv.subtotal), inv.tax_rate, -Math.abs(inv.tax_amount), -Math.abs(inv.total), `Avoir pour facture ${inv.invoice_number}`, 1, inv.id, "draft"]
    );
    const [rows] = await pool.query("SELECT * FROM invoices WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM invoices WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
