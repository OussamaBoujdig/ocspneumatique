const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Auth
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const data = await request<{ token: string; user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("token", data.token);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
}

export async function getMe(): Promise<AuthUser> {
  return request<AuthUser>("/auth/me");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Types
export interface Client {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vehicles?: Vehicle[];
  appointments?: Appointment[];
}

export interface Vehicle {
  id: number;
  client_id: number;
  client_name?: string;
  brand: string;
  model: string;
  year: number | null;
  license_plate: string | null;
  vin: string | null;
  mileage: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TireBrand {
  id: number;
  name: string;
}

export interface Tire {
  id: number;
  brand_id: number | null;
  brand_name: string | null;
  model: string;
  size: string;
  type: "summer" | "winter" | "all_season" | "sport";
  price: number;
  cost: number;
  stock_qty: number;
  min_stock: number;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  name: string;
  description: string | null;
  default_price: number;
  duration_minutes: number;
  category: string;
  active: boolean;
  created_at: string;
}

export interface Appointment {
  id: number;
  client_id: number | null;
  vehicle_id: number | null;
  full_name: string;
  phone: string;
  email: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  service_type: string;
  preferred_date: string;
  preferred_time: string;
  message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: number;
  appointment_id: number | null;
  client_id: number | null;
  vehicle_id: number | null;
  client_name: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  license_plate: string | null;
  status: string;
  technician: string | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  items?: WorkOrderItem[];
}

export interface WorkOrderItem {
  id: number;
  work_order_id: number;
  service_id: number | null;
  tire_id: number | null;
  service_name?: string;
  tire_model?: string;
  tire_size?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  work_order_id: number | null;
  client_id: number | null;
  client_name: string | null;
  client_phone?: string;
  client_email?: string;
  client_address?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: WorkOrderItem[];
}

export interface DashboardStats {
  clients: number;
  vehicles: number;
  activeAppointments: number;
  todayAppointments: number;
  openOrders: number;
  lowStock: number;
  monthRevenue: number;
  unpaidInvoices: { count: number; total: number };
  recentAppointments: Appointment[];
  revenueByMonth: { month: string; total: number }[];
}
