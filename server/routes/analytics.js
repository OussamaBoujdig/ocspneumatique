import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/revenue", async (req, res) => {
  try {
    const t = req.tenantId;
    const { period = "monthly", from, to } = req.query;

    let dateFormat;
    switch (period) {
      case "daily":   dateFormat = "%Y-%m-%d"; break;
      case "weekly":  dateFormat = "%x-W%v";   break;
      case "yearly":  dateFormat = "%Y";       break;
      default:        dateFormat = "%Y-%m";    break;
    }

    let sql = `SELECT DATE_FORMAT(paid_at, ?) AS date,
                      SUM(total) AS revenue,
                      COUNT(*) AS invoice_count
               FROM invoices
               WHERE tenant_id = ? AND status = 'paid'`;
    const params = [dateFormat, t];

    if (from) { sql += " AND paid_at >= ?"; params.push(from); }
    if (to)   { sql += " AND paid_at <= ?"; params.push(to); }

    sql += " GROUP BY date ORDER BY date";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/services", async (req, res) => {
  try {
    const t = req.tenantId;
    const { from, to } = req.query;

    let sql = `SELECT s.name AS service_name,
                      COUNT(*) AS count,
                      SUM(woi.total) AS revenue
               FROM work_order_items woi
               INNER JOIN work_orders wo ON woi.work_order_id = wo.id AND wo.tenant_id = ?
               INNER JOIN services s ON woi.service_id = s.id
               WHERE woi.service_id IS NOT NULL`;
    const params = [t];

    if (from) { sql += " AND wo.created_at >= ?"; params.push(from); }
    if (to)   { sql += " AND wo.created_at <= ?"; params.push(to); }

    sql += " GROUP BY s.id, s.name ORDER BY count DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/inventory", async (req, res) => {
  try {
    const t = req.tenantId;

    const [[totalValue]] = await pool.query(
      "SELECT COALESCE(SUM(stock_qty * sale_price), 0) AS total_value FROM tires WHERE tenant_id = ?", [t]
    );
    const [[lowStockCount]] = await pool.query(
      "SELECT COUNT(*) AS count FROM tires WHERE tenant_id = ? AND stock_qty <= min_stock", [t]
    );
    const [itemsBySeason] = await pool.query(
      `SELECT season, COUNT(*) AS count, COALESCE(SUM(stock_qty * sale_price), 0) AS value
       FROM tires WHERE tenant_id = ?
       GROUP BY season ORDER BY count DESC`, [t]
    );
    const [topSelling] = await pool.query(
      `SELECT t.model AS tire_model, t.size AS tire_size,
              COALESCE(SUM(im.quantity), 0) AS sold_qty
       FROM inventory_movements im
       INNER JOIN tires t ON im.tire_id = t.id AND t.tenant_id = ?
       WHERE im.tenant_id = ? AND im.type = 'sale'
       GROUP BY t.id, t.model, t.size
       ORDER BY sold_qty DESC
       LIMIT 10`,
      [t, t]
    );

    res.json({
      total_value: totalValue.total_value,
      low_stock_count: lowStockCount.count,
      items_by_season: itemsBySeason,
      top_selling: topSelling,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/employees", async (req, res) => {
  try {
    const t = req.tenantId;
    const { from, to } = req.query;

    let dateFilter = "";
    const params = [t, t, t];

    if (from) { dateFilter += " AND wo.completed_at >= ?"; params.push(from); }
    if (to)   { dateFilter += " AND wo.completed_at <= ?"; params.push(to); }

    const [rows] = await pool.query(
      `SELECT e.name AS employee_name,
              COUNT(DISTINCT wo.id) AS orders_completed,
              COALESCE(AVG(wo.actual_duration), 0) AS avg_duration,
              COALESCE(SUM(i.total), 0) AS revenue_generated
       FROM employees e
       LEFT JOIN work_orders wo ON wo.assigned_to = e.id AND wo.tenant_id = ? AND wo.status = 'completed'${dateFilter}
       LEFT JOIN invoices i ON i.work_order_id = wo.id AND i.tenant_id = ? AND i.status = 'paid'
       WHERE e.tenant_id = ? AND e.is_active = 1
       GROUP BY e.id, e.name
       ORDER BY orders_completed DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/customers", async (req, res) => {
  try {
    const t = req.tenantId;

    const [[total]] = await pool.query(
      "SELECT COUNT(*) AS count FROM customers WHERE tenant_id = ?", [t]
    );
    const [[newThisMonth]] = await pool.query(
      `SELECT COUNT(*) AS count FROM customers
       WHERE tenant_id = ? AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())`, [t]
    );
    const [topSpenders] = await pool.query(
      `SELECT full_name AS name, total_spent, visit_count
       FROM customers WHERE tenant_id = ?
       ORDER BY total_spent DESC LIMIT 10`, [t]
    );

    const [[returning]] = await pool.query(
      "SELECT COUNT(*) AS count FROM customers WHERE tenant_id = ? AND visit_count > 1", [t]
    );
    const retentionRate = total.count > 0
      ? Math.round((returning.count / total.count) * 10000) / 100
      : 0;

    res.json({
      total: total.count,
      new_this_month: newThisMonth.count,
      top_spenders: topSpenders,
      retention_rate: retentionRate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
