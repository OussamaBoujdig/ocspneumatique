# TireGarage OS

Multi-tenant SaaS platform for tire garage management. Built with React, Express.js, and MySQL.

## Features

- **Multi-tenant** — Each garage has isolated data (customers, inventory, invoices)
- **Dashboard** — Real-time analytics with revenue, appointments, stock alerts
- **CRM** — Customer profiles with vehicles, service history, spending tracking
- **Vehicle Management** — Track vehicles, tire installations, mileage
- **Tire Inventory** — Barcode scanning, stock alerts, supplier tracking, purchase history
- **Service Catalog** — Configurable services with pricing and duration
- **Appointment Scheduling** — Calendar view, status tracking, employee assignment
- **Work Orders** — Priority levels, timer, auto-invoice generation
- **Invoicing** — Discounts, partial payments, credit notes, PDF printing, WhatsApp
- **Employee Management** — Roles, performance tracking, scheduling
- **Analytics** — Revenue trends, service popularity, inventory turnover, employee productivity
- **Reports** — Daily and monthly reports with CSV/PDF export
- **i18n** — French and Arabic with RTL support
- **Dark/Light theme**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, Recharts |
| Backend | Node.js, Express.js, JWT authentication |
| Database | MySQL 8.0 |
| Infra | Docker, Docker Compose |

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8.0+ (or Docker)

### Option 1: Docker

```bash
docker-compose up -d
cd server && npm run setup
```

### Option 2: Local

1. **Install dependencies**

```bash
npm install
cd server && npm install
```

2. **Configure environment**

```bash
cp server/.env.example server/.env
# Edit server/.env with your MySQL credentials
```

3. **Setup database**

```bash
cd server
node migrate-saas.js
node seed-saas.js
```

4. **Run**

```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
npm run dev
```

5. **Open** http://localhost:8080

### Default Login

- **Email:** admin@ocspneus.com
- **Password:** admin123

## Database Schema

19 tables with full multi-tenant isolation:

- `tenants` — Garage organizations
- `roles` — Permission roles per tenant
- `users` — Authentication & user profiles
- `customers` — CRM with spending tracking
- `vehicles` — Customer vehicles with tire size
- `tire_brands` — Tire manufacturers
- `suppliers` — Tire suppliers
- `tires` — Inventory with barcode support
- `inventory_movements` — Stock audit trail
- `services` — Service catalog
- `employees` — Staff with performance metrics
- `appointments` — Scheduling system
- `work_orders` — Work order management
- `work_order_items` — Work order line items
- `invoices` — Billing with partial payments
- `invoice_items` — Invoice line items
- `tire_installations` — Tire lifecycle tracking
- `notifications` — Notification log
- `activity_log` — Audit trail

## API Endpoints

### Authentication
- `POST /api/auth/login` — Login
- `POST /api/auth/register-tenant` — Register new garage
- `GET /api/auth/me` — Current user

### Resources (all tenant-isolated)
- `/api/customers` — CRUD + history
- `/api/vehicles` — CRUD + tire installations
- `/api/tires` — CRUD + barcode lookup + stock movements
- `/api/services` — CRUD
- `/api/employees` — CRUD + performance + schedule
- `/api/appointments` — CRUD + calendar view
- `/api/work-orders` — CRUD + status workflow + auto-invoicing
- `/api/invoices` — CRUD + payments + duplicate + credit notes
- `/api/dashboard/stats` — Dashboard metrics
- `/api/analytics/*` — Revenue, services, inventory, employees, customers
- `/api/reports/*` — Daily and monthly reports

## License

MIT
