import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, Package, Users, UserCog, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { toast } from "sonner";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

interface RevenueData { date: string; revenue: number; invoice_count: number }
interface ServiceData { service_name: string; count: number; revenue: number }
interface InventoryData { total_value: number; low_stock_count: number; items_by_season: { season: string; count: number; value: number }[]; top_selling: { tire_model: string; tire_size: string; sold_qty: number }[] }
interface EmployeeData { employee_name: string; orders_completed: number; avg_duration: number; revenue_generated: number }
interface CustomerData { total: number; new_this_month: number; top_spenders: { name: string; total_spent: number; visit_count: number }[]; retention_rate: number }

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("monthly");
  const [revenue, setRevenue] = useState<RevenueData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [customers, setCustomers] = useState<CustomerData | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rev, svc, inv, emp, cust] = await Promise.all([
        api.get<RevenueData[]>(`/analytics/revenue?period=${period}`),
        api.get<ServiceData[]>("/analytics/services"),
        api.get<InventoryData>("/analytics/inventory"),
        api.get<EmployeeData[]>("/analytics/employees"),
        api.get<CustomerData>("/analytics/customers"),
      ]);
      setRevenue(rev);
      setServices(svc);
      setInventory(inv);
      setEmployees(emp);
      setCustomers(cust);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [period]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const seasonLabels: Record<string, string> = { summer: "Été", winter: "Hiver", all_season: "4 Saisons", sport: "Sport" };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <TrendingUp size={24} className="text-primary" /> Analytiques
          </h1>
          <p className="text-muted-foreground text-sm">Intelligence d'affaires</p>
        </div>
        <div className="flex gap-2">
          {["daily", "weekly", "monthly", "yearly"].map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:border-primary/30"}`}
            >
              {p === "daily" ? "Jour" : p === "weekly" ? "Semaine" : p === "monthly" ? "Mois" : "Année"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {customers && inventory && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Clients total</p>
            <p className="text-2xl font-bold text-foreground">{customers.total}</p>
            <p className="text-xs text-green-600">+{customers.new_this_month} ce mois</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Taux de rétention</p>
            <p className="text-2xl font-bold text-foreground">{customers.retention_rate}%</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Valeur du stock</p>
            <p className="text-2xl font-bold text-foreground">{Number(inventory.total_value).toFixed(0)} DH</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Stock bas</p>
            <p className="text-2xl font-bold text-red-500">{inventory.low_stock_count}</p>
          </div>
        </div>
      )}

      {/* Revenue Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-primary" /> Évolution du chiffre d'affaires</h2>
        {revenue.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-center text-muted-foreground py-10">Aucune donnée</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Popularity */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Package size={18} className="text-primary" /> Popularité des services</h2>
          {services.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={services} dataKey="count" nameKey="service_name" cx="50%" cy="50%" outerRadius={90} label={({ service_name, percent }) => `${service_name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                    {services.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {services.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span>{s.service_name}</span>
                    </div>
                    <span className="text-muted-foreground">{s.count}x — {Number(s.revenue).toFixed(0)} DH</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-center text-muted-foreground py-10">Aucune donnée</p>}
        </div>

        {/* Inventory by Season */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Package size={18} className="text-primary" /> Stock par saison</h2>
          {inventory && inventory.items_by_season.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={inventory.items_by_season.map((s) => ({ ...s, label: seasonLabels[s.season] || s.season }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Quantité" />
                </BarChart>
              </ResponsiveContainer>
              {inventory.top_selling.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold mb-2">Meilleures ventes</h3>
                  {inventory.top_selling.slice(0, 5).map((t, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                      <span>{t.tire_model} ({t.tire_size})</span>
                      <span className="font-medium">{t.sold_qty} vendus</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : <p className="text-center text-muted-foreground py-10">Aucune donnée</p>}
        </div>

        {/* Employee Productivity */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2"><UserCog size={18} className="text-primary" /> Productivité des employés</h2>
          {employees.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={employees} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="employee_name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={120} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="orders_completed" fill="#3b82f6" name="Ordres" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground py-10">Aucune donnée</p>}
        </div>

        {/* Top Customers */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Users size={18} className="text-primary" /> Meilleurs clients</h2>
          {customers && customers.top_spenders.length > 0 ? (
            <div className="space-y-3">
              {customers.top_spenders.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.visit_count} visites</p>
                    </div>
                  </div>
                  <p className="font-bold text-foreground">{Number(c.total_spent).toFixed(0)} DH</p>
                </div>
              ))}
            </div>
          ) : <p className="text-center text-muted-foreground py-10">Aucune donnée</p>}
        </div>
      </div>
    </div>
  );
}
