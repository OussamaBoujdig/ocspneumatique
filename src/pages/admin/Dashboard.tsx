import { useEffect, useState } from "react";
import { api, type DashboardStats } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/components/AuthProvider";
import { Users, Car, CalendarDays, ClipboardList, AlertTriangle, TrendingUp, Loader2, CircleDot, FileText, CheckCircle, UserCog } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

export default function Dashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashboardStats>("/dashboard/stats")
      .then(setStats)
      .catch(() => toast.error("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!stats) return <p className="text-center text-muted-foreground py-10">Erreur de chargement</p>;

  const statCards = [
    { key: "customers", label: "Clients", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", value: stats.customers },
    { key: "todayAppointments", label: "RDV aujourd'hui", icon: CalendarDays, color: "text-green-500", bg: "bg-green-500/10", value: stats.todayAppointments },
    { key: "openOrders", label: "Ordres ouverts", icon: ClipboardList, color: "text-purple-500", bg: "bg-purple-500/10", value: stats.openOrders },
    { key: "completedToday", label: "Terminés aujourd'hui", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10", value: stats.completedToday },
    { key: "vehicles", label: "Véhicules", icon: Car, color: "text-cyan-500", bg: "bg-cyan-500/10", value: stats.vehicles },
    { key: "lowStock", label: "Stock bas", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", value: stats.lowStock },
    { key: "tiresSold", label: "Pneus vendus (mois)", icon: CircleDot, color: "text-amber-500", bg: "bg-amber-500/10", value: stats.tiresSoldThisMonth },
    { key: "activeAppt", label: "RDV actifs", icon: CalendarDays, color: "text-orange-500", bg: "bg-orange-500/10", value: stats.activeAppointments },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Bonjour, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{user?.tenant_name} — Vue d'ensemble</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <div key={c.key} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
              <c.icon size={20} className={c.color} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" /> Chiffre d'affaires
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-3xl font-bold text-foreground">{Number(stats.monthRevenue).toFixed(0)} DH</p>
              <p className="text-sm text-muted-foreground">Ce mois</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{Number(stats.yearRevenue).toFixed(0)} DH</p>
              <p className="text-sm text-muted-foreground">Cette année</p>
            </div>
          </div>
          {stats.revenueByMonth.length > 0 && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Unpaid + Top Services */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
              <FileText size={16} className="text-amber-500" /> Factures impayées
            </h3>
            <p className="text-3xl font-bold text-amber-500">{stats.unpaidInvoices.count}</p>
            <p className="text-sm text-muted-foreground">{Number(stats.unpaidInvoices.total).toFixed(0)} DH en attente</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
              <CircleDot size={16} className="text-primary" /> Services populaires
            </h3>
            <div className="space-y-2">
              {stats.topServices?.map((s, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="font-medium">{s.count}x</span>
                </div>
              ))}
              {(!stats.topServices || stats.topServices.length === 0) && (
                <p className="text-sm text-muted-foreground">Aucune donnée</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Appointments + Employee Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <CalendarDays size={18} className="text-primary" /> Derniers rendez-vous
          </h2>
          <div className="space-y-3">
            {stats.recentAppointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{a.full_name}</p>
                  <p className="text-xs text-muted-foreground">{a.service_type} — {a.scheduled_date} {a.scheduled_time}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  a.status === "scheduled" ? "bg-yellow-100 text-yellow-800" :
                  a.status === "confirmed" ? "bg-green-100 text-green-800" :
                  a.status === "completed" ? "bg-blue-100 text-blue-800" :
                  "bg-red-100 text-red-800"
                }`}>{a.status}</span>
              </div>
            ))}
            {stats.recentAppointments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun rendez-vous</p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <UserCog size={18} className="text-primary" /> Performance équipe
          </h2>
          <div className="space-y-3">
            {stats.employeeStats?.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                    {e.name.charAt(0)}
                  </div>
                  <p className="text-sm font-medium">{e.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{e.completed_orders} ordres</p>
                  <p className="text-xs text-muted-foreground">{Number(e.revenue).toFixed(0)} DH</p>
                </div>
              </div>
            ))}
            {(!stats.employeeStats || stats.employeeStats.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
