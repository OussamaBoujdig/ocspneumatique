import { Router } from "express";
import pool from "../db.js";

const router = Router();

async function generateInvoiceNumber(tenantId, prefix = "FAC") {
  const year = new Date().getFullYear();
  const [rows] = await pool.query(
    "SELECT COUNT(*) as count FROM invoices WHERE tenant_id = ? AND YEAR(created_at) = ? AND invoice_number LIKE ?",
    [tenantId, year, `${prefix}-${year}-%`]
  );
  return `${prefix}-${year}-${(rows[0].count + 1).toString().padStart(4, "0")}`;
}

router.get("/", async (req, res) => {
  try {
    const { status, customer_id } = req.query;
    let sql = `SELECT i.*, c.full_name AS customer_name
               FROM invoices i
               LEFT JOIN customers c ON i.customer_id = c.id AND c.tenant_id = ?`;
    const params = [req.tenantId];
    const conditions = ["i.tenant_id = ?"];
    params.push(req.tenantId);

    if (status && status !== "all") {
      conditions.push("i.status = ?");
      params.push(status);
    }
    if (customer_id) {
      conditions.push("i.customer_id = ?");
      params.push(customer_id);
    }

    sql += " WHERE " + conditions.join(" AND ");
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
      `SELECT i.*, c.full_name AS customer_name, c.phone AS customer_phone,
              c.email AS customer_email, c.address AS customer_address
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id AND c.tenant_id = ?
       WHERE i.id = ? AND i.tenant_id = ?`,
      [req.tenantId, req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: "Facture non trouvée" });

    const invoice = rows[0];
    let items = [];

    const [invoiceItems] = await pool.query(
      "SELECT * FROM invoice_items WHERE invoice_id = ?",
      [invoice.id]
    );

    if (invoiceItems.length) {
      items = invoiceItems;
    } else if (invoice.work_order_id) {
      const [woItems] = await pool.query(
        `SELECT woi.*, s.name AS service_name, t.model AS tire_model, t.size AS tire_size
         FROM work_order_items woi
         LEFT JOIN services s ON woi.service_id = s.id
         LEFT JOIN tires t ON woi.tire_id = t.id
         WHERE woi.work_order_id = ?`,
        [invoice.work_order_id]
      );
      items = woItems;
    }

    res.json({ ...invoice, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      work_order_id, customer_id, tax_rate, notes,
      due_date, discount_amount, discount_type, payment_method,
    } = req.body;

    const invoice_number = await generateInvoiceNumber(req.tenantId);

    let subtotal = 0;
    let woItems = [];
    if (work_order_id) {
      const [items] = await pool.query(
        `SELECT woi.* FROM work_order_items woi
         INNER JOIN work_orders wo ON woi.work_order_id = wo.id AND wo.tenant_id = ?
         WHERE woi.work_order_id = ?`,
        [req.tenantId, work_order_id]
      );
      woItems = items;
      subtotal = items.reduce((sum, i) => sum + Number(i.total), 0);
    }

    const rate = tax_rate !== undefined ? Number(tax_rate) : 20;
    const disc = Number(discount_amount) || 0;
    const discType = discount_type || "fixed";
    const actualDiscount = discType === "percent" ? subtotal * disc / 100 : disc;
    const afterDiscount = Math.max(subtotal - actualDiscount, 0);
    const tax_amount = afterDiscount * rate / 100;
    const total = afterDiscount + tax_amount;

    const [result] = await pool.query(
      `INSERT INTO invoices
       (tenant_id, invoice_number, work_order_id, customer_id, subtotal,
        tax_rate, tax_amount, total, due_date, notes,
        discount_amount, discount_type, payment_method)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.tenantId, invoice_number, work_order_id || null, customer_id || null,
        subtotal, rate, tax_amount, total, due_date || null, notes || null,
        actualDiscount, discType, payment_method || "cash",
      ]
    );

    if (work_order_id && woItems.length) {
      for (const item of woItems) {
        await pool.query(
          `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
           VALUES (?,?,?,?,?)`,
          [result.insertId, item.description, item.quantity, item.unit_price, item.total]
        );
      }
    }

    const [rows] = await pool.query(
      "SELECT * FROM invoices WHERE id = ? AND tenant_id = ?",
      [result.insertId, req.tenantId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const extra = status === "paid" ? ", paid_at = NOW()" : "";
    await pool.query(
      `UPDATE invoices SET status = ?${extra} WHERE id = ? AND tenant_id = ?`,
      [status, req.params.id, req.tenantId]
    );
    const [rows] = await pool.query(
      "SELECT * FROM invoices WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: "Facture non trouvée" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/payment", async (req, res) => {
  try {
    const { amount_paid, payment_method } = req.body;
    const [inv] = await pool.query(
      "SELECT * FROM invoices WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    if (!inv.length) return res.status(404).json({ error: "Facture non trouvée" });

    const newPaid = Number(inv[0].amount_paid) + Number(amount_paid);
    const isPaid = newPaid >= Number(inv[0].total);
    const newStatus = isPaid ? "paid" : "partial";

    await pool.query(
      `UPDATE invoices SET amount_paid = ?, payment_method = ?, status = ?${isPaid ? ", paid_at = NOW()" : ""}
       WHERE id = ? AND tenant_id = ?`,
      [newPaid, payment_method || inv[0].payment_method, newStatus, req.params.id, req.tenantId]
    );

    const [rows] = await pool.query(
      "SELECT * FROM invoices WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/duplicate", async (req, res) => {
  try {
    const [orig] = await pool.query(
      "SELECT * FROM invoices WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    if (!orig.length) return res.status(404).json({ error: "Facture non trouvée" });

    const inv = orig[0];
    const invoice_number = await generateInvoiceNumber(req.tenantId);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const [result] = await pool.query(
      `INSERT INTO invoices
       (tenant_id, invoice_number, work_order_id, customer_id, subtotal,
        tax_rate, tax_amount, total, due_date, notes,
        discount_amount, discount_type, payment_method, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.tenantId, invoice_number, inv.work_order_id, inv.customer_id,
        inv.subtotal, inv.tax_rate, inv.tax_amount, inv.total,
        dueDate.toISOString().split("T")[0], inv.notes,
        inv.discount_amount, inv.discount_type, inv.payment_method, "draft",
      ]
    );

    const [invItems] = await pool.query(
      "SELECT * FROM invoice_items WHERE invoice_id = ?",
      [inv.id]
    );
    for (const item of invItems) {
      await pool.query(
        "INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES (?,?,?,?,?)",
        [result.insertId, item.description, item.quantity, item.unit_price, item.total]
      );
    }

    const [rows] = await pool.query(
      "SELECT * FROM invoices WHERE id = ? AND tenant_id = ?",
      [result.insertId, req.tenantId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/credit-note", async (req, res) => {
  try {
    const [orig] = await pool.query(
      "SELECT * FROM invoices WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    if (!orig.length) return res.status(404).json({ error: "Facture non trouvée" });

    const inv = orig[0];
    const invoice_number = await generateInvoiceNumber(req.tenantId, "AV");

    const [result] = await pool.query(
      `INSERT INTO invoices
       (tenant_id, invoice_number, work_order_id, customer_id, subtotal,
        tax_rate, tax_amount, total, notes,
        is_credit_note, original_invoice_id, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.tenantId, invoice_number, inv.work_order_id, inv.customer_id,
        -Math.abs(inv.subtotal), inv.tax_rate, -Math.abs(inv.tax_amount),
        -Math.abs(inv.total), `Avoir pour facture ${inv.invoice_number}`,
        1, inv.id, "draft",
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM invoices WHERE id = ? AND tenant_id = ?",
      [result.insertId, req.tenantId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM invoices WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenantId]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Facture non trouvée" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
