import { useEffect, useState } from "react";
import { api, type DashboardStats } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Users, Car, CalendarDays, ClipboardList, AlertTriangle, TrendingUp, Loader2, MessageCircle, Bell, ExternalLink } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getTomorrowReminders, type ReminderAppointment } from "@/lib/whatsapp";
import { toast } from "sonner";

export default function Dashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<ReminderAppointment[]>([]);

  const statCards = [
    { key: "clients", label: t("dash.clients"), icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { key: "todayAppointments", label: t("dash.todayAppt"), icon: CalendarDays, color: "text-green-500", bg: "bg-green-500/10" },
    { key: "activeAppointments", label: t("dash.activeAppt"), icon: CalendarDays, color: "text-amber-500", bg: "bg-amber-500/10" },
    { key: "openOrders", label: t("dash.openOrders"), icon: ClipboardList, color: "text-purple-500", bg: "bg-purple-500/10" },
    { key: "vehicles", label: t("dash.vehicles"), icon: Car, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { key: "lowStock", label: t("dash.lowStock"), icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
  ] as const;

  useEffect(() => {
    api.get<DashboardStats>("/dashboard/stats")
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
    getTomorrowReminders().then(setReminders).catch(() => {});
  }, []);

  const sendAllReminders = () => {
    let count = 0;
    for (const r of reminders) {
      if (r.whatsapp_url) {
        setTimeout(() => window.open(r.whatsapp_url!, "_blank"), count * 1500);
        count++;
      }
    }
    if (count > 0) toast.success(`${count} ${t("dash.remindersOpened")}`);
    else toast.error(t("dash.noReminders"));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!stats) return <p className="text-center text-muted-foreground py-10">{t("dash.loadError")}</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">{t("dash.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("dash.subtitle")}</p>
      </div>

      {reminders.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell size={20} className="text-green-600" />
              <h2 className="font-semibold text-foreground">{t("dash.tomorrowReminders")} — {reminders.length}</h2>
            </div>
            <Button size="sm" onClick={sendAllReminders} className="bg-green-600 hover:bg-green-700 text-white">
              <MessageCircle size={14} className="mr-1" /> {t("dash.sendAllReminders")}
            </Button>
          </div>
          <div className="space-y-2">
            {reminders.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-card/50 rounded-lg px-4 py-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium text-foreground">{r.full_name}</span>
                  <span className="text-muted-foreground">{r.preferred_time}</span>
                  <span className="text-muted-foreground">{r.service_type}</span>
                  <span className="text-muted-foreground">{r.phone}</span>
                </div>
                {r.whatsapp_url && (
                  <a href={r.whatsapp_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700">
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((c) => (
          <div key={c.key} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg ${c.bg} flex items-center justify-center`}>
              <c.icon size={22} className={c.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats[c.key as keyof DashboardStats] as number}</p>
              <p className="text-sm text-muted-foreground">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary" />
            <h2 className="font-semibold text-foreground">{t("dash.revenue")}</h2>
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div>
              <p className="text-3xl font-bold text-foreground">{Number(stats.monthRevenue).toFixed(2)} €</p>
              <p className="text-sm text-muted-foreground">{t("dash.thisMonth")}</p>
            </div>
            <div className="border-l border-border pl-4 rtl:border-l-0 rtl:border-r rtl:pr-4 rtl:pl-0">
              <p className="text-xl font-bold text-amber-500">{stats.unpaidInvoices.count}</p>
              <p className="text-sm text-muted-foreground">{t("dash.unpaidInvoices")} ({Number(stats.unpaidInvoices.total).toFixed(2)} €)</p>
            </div>
          </div>
          {stats.revenueByMonth.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} labelStyle={{ color: "hsl(var(--foreground))" }} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={18} className="text-primary" />
            <h2 className="font-semibold text-foreground">{t("dash.recentAppt")}</h2>
          </div>
          <div className="space-y-3">
            {stats.recentAppointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{a.full_name}</p>
                  <p className="text-xs text-muted-foreground">{a.service_type} — {a.preferred_date} {a.preferred_time}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  a.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                  a.status === "confirmed" ? "bg-green-100 text-green-800" :
                  a.status === "completed" ? "bg-blue-100 text-blue-800" :
                  "bg-red-100 text-red-800"
                }`}>{a.status}</span>
              </div>
            ))}
            {stats.recentAppointments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t("dash.noAppt")}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
