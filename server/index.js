import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authMiddleware } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import clientsRoutes from "./routes/clients.js";
import vehiclesRoutes from "./routes/vehicles.js";
import tiresRoutes from "./routes/tires.js";
import servicesRoutes from "./routes/services.js";
import appointmentsRoutes from "./routes/appointments.js";
import appointmentsPublicRoutes from "./routes/appointments-public.js";
import workOrdersRoutes from "./routes/work-orders.js";
import invoicesRoutes from "./routes/invoices.js";
import dashboardRoutes from "./routes/dashboard.js";
import whatsappRoutes from "./routes/whatsapp.js";
import reportsRoutes from "./routes/reports.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Public routes (no auth required)
app.use("/api/auth", authRoutes);
app.use("/api/appointments/public", appointmentsPublicRoutes);

// Protected routes (auth required)
app.use("/api/clients", authMiddleware, clientsRoutes);
app.use("/api/vehicles", authMiddleware, vehiclesRoutes);
app.use("/api/tires", authMiddleware, tiresRoutes);
app.use("/api/services", authMiddleware, servicesRoutes);
app.use("/api/appointments", authMiddleware, appointmentsRoutes);
app.use("/api/work-orders", authMiddleware, workOrdersRoutes);
app.use("/api/invoices", authMiddleware, invoicesRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);
app.use("/api/whatsapp", authMiddleware, whatsappRoutes);
app.use("/api/reports", authMiddleware, reportsRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
