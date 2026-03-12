import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/stats", async (_req, res) => {
  try {
    const [[clients]] = await pool.query("SELECT COUNT(*) as count FROM clients");
    const [[vehicles]] = await pool.query("SELECT COUNT(*) as count FROM vehicles");
    const [[appointments]] = await pool.query("SELECT COUNT(*) as count FROM appointments WHERE status IN ('pending','confirmed')");
    const [[todayAppointments]] = await pool.query("SELECT COUNT(*) as count FROM appointments WHERE preferred_date = CURDATE()");
    const [[openOrders]] = await pool.query("SELECT COUNT(*) as count FROM work_orders WHERE status IN ('open','in_progress')");
    const [[lowStock]] = await pool.query("SELECT COUNT(*) as count FROM tires WHERE stock_qty <= min_stock");
    const [[monthRevenue]] = await pool.query(
      "SELECT COALESCE(SUM(total),0) as total FROM invoices WHERE status = 'paid' AND MONTH(paid_at) = MONTH(NOW()) AND YEAR(paid_at) = YEAR(NOW())"
    );
    const [[unpaidInvoices]] = await pool.query("SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE status IN ('sent','overdue')");

    const [recentAppointments] = await pool.query(
      "SELECT * FROM appointments ORDER BY created_at DESC LIMIT 5"
    );

    const [revenueByMonth] = await pool.query(`
      SELECT DATE_FORMAT(paid_at, '%Y-%m') as month, SUM(total) as total
      FROM invoices WHERE status = 'paid' AND paid_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY month ORDER BY month
    `);

    res.json({
      clients: clients.count,
      vehicles: vehicles.count,
      activeAppointments: appointments.count,
      todayAppointments: todayAppointments.count,
      openOrders: openOrders.count,
      lowStock: lowStock.count,
      monthRevenue: monthRevenue.total,
      unpaidInvoices: { count: unpaidInvoices.count, total: unpaidInvoices.total },
      recentAppointments,
      revenueByMonth,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
