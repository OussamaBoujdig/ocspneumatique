import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authMiddleware } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import customersRoutes from "./routes/customers.js";
import vehiclesRoutes from "./routes/vehicles.js";
import tiresRoutes from "./routes/tires.js";
import servicesRoutes from "./routes/services.js";
import employeesRoutes from "./routes/employees.js";
import appointmentsRoutes from "./routes/appointments.js";
import appointmentsPublicRoutes from "./routes/appointments-public.js";
import workOrdersRoutes from "./routes/work-orders.js";
import invoicesRoutes from "./routes/invoices.js";
import dashboardRoutes from "./routes/dashboard.js";
import analyticsRoutes from "./routes/analytics.js";
import reportsRoutes from "./routes/reports.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Public routes
app.use("/api/auth", authRoutes);
app.use("/api/appointments/public", appointmentsPublicRoutes);

// Protected routes
app.use("/api/customers", authMiddleware, customersRoutes);
app.use("/api/vehicles", authMiddleware, vehiclesRoutes);
app.use("/api/tires", authMiddleware, tiresRoutes);
app.use("/api/services", authMiddleware, servicesRoutes);
app.use("/api/employees", authMiddleware, employeesRoutes);
app.use("/api/appointments", authMiddleware, appointmentsRoutes);
app.use("/api/work-orders", authMiddleware, workOrdersRoutes);
app.use("/api/invoices", authMiddleware, invoicesRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);
app.use("/api/analytics", authMiddleware, analyticsRoutes);
app.use("/api/reports", authMiddleware, reportsRoutes);

app.listen(PORT, () => {
  console.log(`TireGarage OS API running on http://localhost:${PORT}`);
});
