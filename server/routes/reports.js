import { Router } from "express";
import pool from "../db.js";

const router = Router();

// Daily report
router.get("/daily", async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0];

    const [appointments] = await pool.query(
      `SELECT a.*, c.full_name as client_name_ref FROM appointments a LEFT JOIN clients c ON a.client_id = c.id
       WHERE a.preferred_date = ? ORDER BY a.preferred_time`,
      [date]
    );

    const [workOrders] = await pool.query(
      `SELECT wo.*, c.full_name as client_name, v.brand as vehicle_brand, v.model as vehicle_model
       FROM work_orders wo LEFT JOIN clients c ON wo.client_id = c.id LEFT JOIN vehicles v ON wo.vehicle_id = v.id
       WHERE DATE(wo.created_at) = ? ORDER BY wo.created_at`,
      [date]
    );

    const [invoices] = await pool.query(
      `SELECT i.*, c.full_name as client_name FROM invoices i LEFT JOIN clients c ON i.client_id = c.id
       WHERE DATE(i.created_at) = ? ORDER BY i.created_at`,
      [date]
    );

    const [[dailyRevenue]] = await pool.query(
      "SELECT COALESCE(SUM(total),0) as total FROM invoices WHERE status = 'paid' AND DATE(paid_at) = ?",
      [date]
    );

    const [newClients] = await pool.query(
      "SELECT * FROM clients WHERE DATE(created_at) = ?", [date]
    );

    res.json({
      date,
      summary: {
        appointments: appointments.length,
        workOrders: workOrders.length,
        invoices: invoices.length,
        revenue: dailyRevenue.total,
        newClients: newClients.length,
      },
      appointments,
      workOrders,
      invoices,
      newClients,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monthly report
router.get("/monthly", async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || (new Date().getMonth() + 1);

    const [[apptCount]] = await pool.query(
      "SELECT COUNT(*) as count FROM appointments WHERE YEAR(preferred_date) = ? AND MONTH(preferred_date) = ?",
      [year, month]
    );
    const [[apptByStatus]] = await pool.query(
      `SELECT
        SUM(status='pending') as pending, SUM(status='confirmed') as confirmed,
        SUM(status='completed') as completed, SUM(status='cancelled') as cancelled
       FROM appointments WHERE YEAR(preferred_date) = ? AND MONTH(preferred_date) = ?`,
      [year, month]
    );

    const [[woCount]] = await pool.query(
      "SELECT COUNT(*) as count FROM work_orders WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?",
      [year, month]
    );

    const [[invStats]] = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total_amount,
        SUM(status='paid') as paid_count, COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END),0) as paid_amount
       FROM invoices WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?`,
      [year, month]
    );

    const [[revenue]] = await pool.query(
      "SELECT COALESCE(SUM(total),0) as total FROM invoices WHERE status = 'paid' AND YEAR(paid_at) = ? AND MONTH(paid_at) = ?",
      [year, month]
    );

    const [[newClientsCount]] = await pool.query(
      "SELECT COUNT(*) as count FROM clients WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?",
      [year, month]
    );

    const [topServices] = await pool.query(
      `SELECT service_type, COUNT(*) as count FROM appointments
       WHERE YEAR(preferred_date) = ? AND MONTH(preferred_date) = ?
       GROUP BY service_type ORDER BY count DESC LIMIT 10`,
      [year, month]
    );

    const [lowStockTires] = await pool.query(
      "SELECT t.*, tb.name as brand_name FROM tires t LEFT JOIN tire_brands tb ON t.brand_id = tb.id WHERE t.stock_qty <= t.min_stock ORDER BY t.stock_qty"
    );

    const [dailyRevenue] = await pool.query(
      `SELECT DATE(paid_at) as day, SUM(total) as total FROM invoices
       WHERE status = 'paid' AND YEAR(paid_at) = ? AND MONTH(paid_at) = ?
       GROUP BY day ORDER BY day`,
      [year, month]
    );

    const [invoices] = await pool.query(
      `SELECT i.*, c.full_name as client_name FROM invoices i LEFT JOIN clients c ON i.client_id = c.id
       WHERE YEAR(i.created_at) = ? AND MONTH(i.created_at) = ? ORDER BY i.created_at`,
      [year, month]
    );

    res.json({
      year: Number(year),
      month: Number(month),
      summary: {
        appointments: apptCount.count,
        appointmentsByStatus: apptByStatus,
        workOrders: woCount.count,
        invoices: invStats.count,
        totalInvoiced: invStats.total_amount,
        paidInvoices: invStats.paid_count,
        paidAmount: invStats.paid_amount,
        revenue: revenue.total,
        newClients: newClientsCount.count,
      },
      topServices,
      lowStockTires,
      dailyRevenue,
      invoices,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
