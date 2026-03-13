import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/stats", async (req, res) => {
  try {
    const t = req.tenantId;

    const [[customers]] = await pool.query(
      "SELECT COUNT(*) AS count FROM customers WHERE tenant_id = ?", [t]
    );
    const [[vehicles]] = await pool.query(
      "SELECT COUNT(*) AS count FROM vehicles WHERE tenant_id = ?", [t]
    );
    const [[todayAppointments]] = await pool.query(
      "SELECT COUNT(*) AS count FROM appointments WHERE tenant_id = ? AND scheduled_date = CURDATE()", [t]
    );
    const [[activeAppointments]] = await pool.query(
      "SELECT COUNT(*) AS count FROM appointments WHERE tenant_id = ? AND status IN ('scheduled','confirmed','in_progress')", [t]
    );
    const [[openOrders]] = await pool.query(
      "SELECT COUNT(*) AS count FROM work_orders WHERE tenant_id = ? AND status IN ('open','in_progress')", [t]
    );
    const [[completedToday]] = await pool.query(
      "SELECT COUNT(*) AS count FROM work_orders WHERE tenant_id = ? AND status = 'completed' AND DATE(completed_at) = CURDATE()", [t]
    );
    const [[lowStock]] = await pool.query(
      "SELECT COUNT(*) AS count FROM tires WHERE tenant_id = ? AND stock_qty <= min_stock", [t]
    );
    const [[tiresSoldThisMonth]] = await pool.query(
      `SELECT COALESCE(SUM(quantity), 0) AS total FROM inventory_movements
       WHERE tenant_id = ? AND type = 'sale'
         AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())`, [t]
    );
    const [[monthRevenue]] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total FROM invoices
       WHERE tenant_id = ? AND status = 'paid'
         AND MONTH(paid_at) = MONTH(NOW()) AND YEAR(paid_at) = YEAR(NOW())`, [t]
    );
    const [[yearRevenue]] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total FROM invoices
       WHERE tenant_id = ? AND status = 'paid' AND YEAR(paid_at) = YEAR(NOW())`, [t]
    );
    const [[unpaidInvoices]] = await pool.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total - amount_paid), 0) AS total
       FROM invoices WHERE tenant_id = ? AND status IN ('sent','overdue','partial')`, [t]
    );

    const [recentAppointments] = await pool.query(
      `SELECT a.*, c.full_name AS customer_name, c.phone AS customer_phone
       FROM appointments a
       LEFT JOIN customers c ON a.customer_id = c.id AND c.tenant_id = ?
       WHERE a.tenant_id = ?
       ORDER BY a.scheduled_date DESC, a.scheduled_time DESC
       LIMIT 10`,
      [t, t]
    );

    const [revenueByMonth] = await pool.query(
      `SELECT DATE_FORMAT(paid_at, '%Y-%m') AS month, SUM(total) AS total
       FROM invoices
       WHERE tenant_id = ? AND status = 'paid'
         AND paid_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY month ORDER BY month`, [t]
    );

    const [topServices] = await pool.query(
      `SELECT s.name AS service_name, COUNT(*) AS usage_count
       FROM work_order_items woi
       INNER JOIN work_orders wo ON woi.work_order_id = wo.id AND wo.tenant_id = ?
       INNER JOIN services s ON woi.service_id = s.id
       WHERE MONTH(wo.created_at) = MONTH(NOW()) AND YEAR(wo.created_at) = YEAR(NOW())
       GROUP BY s.id, s.name
       ORDER BY usage_count DESC
       LIMIT 5`, [t]
    );

    const [employeeStats] = await pool.query(
      `SELECT e.name,
              COUNT(DISTINCT wo.id) AS completed_orders,
              COALESCE(SUM(i.total), 0) AS revenue
       FROM employees e
       LEFT JOIN work_orders wo ON wo.assigned_to = e.id AND wo.tenant_id = ? AND wo.status = 'completed'
       LEFT JOIN invoices i ON i.work_order_id = wo.id AND i.tenant_id = ? AND i.status = 'paid'
       WHERE e.tenant_id = ? AND e.is_active = 1
       GROUP BY e.id, e.name
       ORDER BY completed_orders DESC`,
      [t, t, t]
    );

    res.json({
      customers: customers.count,
      vehicles: vehicles.count,
      todayAppointments: todayAppointments.count,
      activeAppointments: activeAppointments.count,
      openOrders: openOrders.count,
      completedToday: completedToday.count,
      lowStock: lowStock.count,
      tiresSoldThisMonth: tiresSoldThisMonth.total,
      monthRevenue: monthRevenue.total,
      yearRevenue: yearRevenue.total,
      unpaidInvoices: { count: unpaidInvoices.count, total: unpaidInvoices.total },
      recentAppointments,
      revenueByMonth,
      topServices,
      employeeStats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
