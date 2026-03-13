import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/daily", async (req, res) => {
  try {
    const t = req.tenantId;
    const date = req.query.date || new Date().toISOString().split("T")[0];

    const [appointments] = await pool.query(
      `SELECT a.*, c.full_name AS customer_name
       FROM appointments a
       LEFT JOIN customers c ON a.customer_id = c.id AND c.tenant_id = ?
       WHERE a.tenant_id = ? AND a.scheduled_date = ?
       ORDER BY a.scheduled_time`,
      [t, t, date]
    );

    const [workOrders] = await pool.query(
      `SELECT wo.*, c.full_name AS customer_name,
              v.brand AS vehicle_brand, v.model AS vehicle_model, v.license_plate
       FROM work_orders wo
       LEFT JOIN customers c ON wo.customer_id = c.id AND c.tenant_id = ?
       LEFT JOIN vehicles v ON wo.vehicle_id = v.id AND v.tenant_id = ?
       WHERE wo.tenant_id = ? AND DATE(wo.created_at) = ?
       ORDER BY wo.created_at`,
      [t, t, t, date]
    );

    const [invoices] = await pool.query(
      `SELECT i.*, c.full_name AS customer_name
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id AND c.tenant_id = ?
       WHERE i.tenant_id = ? AND DATE(i.created_at) = ?
       ORDER BY i.created_at`,
      [t, t, date]
    );

    const [[revenue]] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM invoices WHERE tenant_id = ? AND status = 'paid' AND DATE(paid_at) = ?`,
      [t, date]
    );

    const [newCustomers] = await pool.query(
      "SELECT * FROM customers WHERE tenant_id = ? AND DATE(created_at) = ?",
      [t, date]
    );

    res.json({
      date,
      appointments: { count: appointments.length, list: appointments },
      work_orders: { count: workOrders.length, list: workOrders },
      invoices: { count: invoices.length, list: invoices },
      revenue: revenue.total,
      new_customers: { count: newCustomers.length, list: newCustomers },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/monthly", async (req, res) => {
  try {
    const t = req.tenantId;
    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || (new Date().getMonth() + 1);

    const [[apptCount]] = await pool.query(
      `SELECT COUNT(*) AS count FROM appointments
       WHERE tenant_id = ? AND YEAR(scheduled_date) = ? AND MONTH(scheduled_date) = ?`,
      [t, year, month]
    );

    const [[woCount]] = await pool.query(
      `SELECT COUNT(*) AS count FROM work_orders
       WHERE tenant_id = ? AND YEAR(created_at) = ? AND MONTH(created_at) = ?`,
      [t, year, month]
    );

    const [[invTotal]] = await pool.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS total
       FROM invoices WHERE tenant_id = ? AND YEAR(created_at) = ? AND MONTH(created_at) = ?`,
      [t, year, month]
    );

    const [[invPaid]] = await pool.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS total
       FROM invoices WHERE tenant_id = ? AND status = 'paid'
         AND YEAR(paid_at) = ? AND MONTH(paid_at) = ?`,
      [t, year, month]
    );

    const [[revenue]] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total FROM invoices
       WHERE tenant_id = ? AND status = 'paid' AND YEAR(paid_at) = ? AND MONTH(paid_at) = ?`,
      [t, year, month]
    );

    const [[newCustomers]] = await pool.query(
      `SELECT COUNT(*) AS count FROM customers
       WHERE tenant_id = ? AND YEAR(created_at) = ? AND MONTH(created_at) = ?`,
      [t, year, month]
    );

    const [topServices] = await pool.query(
      `SELECT s.name AS service_name, COUNT(*) AS count
       FROM work_order_items woi
       INNER JOIN work_orders wo ON woi.work_order_id = wo.id AND wo.tenant_id = ?
       INNER JOIN services s ON woi.service_id = s.id
       WHERE woi.service_id IS NOT NULL
         AND YEAR(wo.created_at) = ? AND MONTH(wo.created_at) = ?
       GROUP BY s.id, s.name ORDER BY count DESC LIMIT 10`,
      [t, year, month]
    );

    const [lowStockTires] = await pool.query(
      `SELECT t.*, tb.name AS brand_name
       FROM tires t
       LEFT JOIN tire_brands tb ON t.brand_id = tb.id AND tb.tenant_id = ?
       WHERE t.tenant_id = ? AND t.stock_qty <= t.min_stock
       ORDER BY t.stock_qty`,
      [t, t]
    );

    const [dailyRevenue] = await pool.query(
      `SELECT DATE(paid_at) AS day, SUM(total) AS total
       FROM invoices
       WHERE tenant_id = ? AND status = 'paid'
         AND YEAR(paid_at) = ? AND MONTH(paid_at) = ?
       GROUP BY day ORDER BY day`,
      [t, year, month]
    );

    res.json({
      year: Number(year),
      month: Number(month),
      summary: {
        appointments: apptCount.count,
        work_orders: woCount.count,
        invoices_total: invTotal.count,
        invoices_paid: invPaid.count,
        revenue: revenue.total,
        new_customers: newCustomers.count,
      },
      top_services: topServices,
      low_stock_tires: lowStockTires,
      daily_revenue: dailyRevenue,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
