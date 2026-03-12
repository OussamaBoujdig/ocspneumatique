import { NavLink } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/lib/i18n";
import {
  LayoutDashboard,
  Users,
  Car,
  CircleDot,
  Wrench,
  CalendarDays,
  ClipboardList,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  X,
  Languages,
} from "lucide-react";
import { useState } from "react";

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/admin", icon: LayoutDashboard, label: t("sidebar.dashboard"), end: true },
    { to: "/admin/appointments", icon: CalendarDays, label: t("sidebar.appointments") },
    { to: "/admin/clients", icon: Users, label: t("sidebar.clients") },
    { to: "/admin/vehicles", icon: Car, label: t("sidebar.vehicles") },
    { to: "/admin/tires", icon: CircleDot, label: t("sidebar.tires") },
    { to: "/admin/services", icon: Wrench, label: t("sidebar.services") },
    { to: "/admin/work-orders", icon: ClipboardList, label: t("sidebar.workOrders") },
    { to: "/admin/invoices", icon: FileText, label: t("sidebar.invoices") },
    { to: "/admin/reports", icon: BarChart3, label: t("sidebar.reports") },
  ];

  const toggleLang = () => setLang(lang === "fr" ? "ar" : "fr");

  const nav = (
    <nav className="flex flex-col h-full">
      <div className="p-5 border-b border-border">
        <h1 className="font-heading text-xl font-bold text-foreground">
          OCS<span className="text-primary">PNEUS</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">{t("sidebar.title")}</p>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`
            }
          >
            <l.icon size={18} />
            {l.label}
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-border space-y-3">
        {/* Language switcher */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Languages size={16} />
          {lang === "fr" ? t("common.arabic") : t("common.french")}
        </button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
            {user?.name?.charAt(0) || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut size={16} />
          {t("sidebar.logout")}
        </button>
      </div>
    </nav>
  );

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border shadow-md rtl:left-auto rtl:right-4"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 z-40 w-64 bg-card border-border transform transition-transform lg:transform-none ${
          lang === "ar"
            ? `right-0 border-l ${open ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`
            : `left-0 border-r ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`
        }`}
      >
        {nav}
      </aside>
    </>
  );
}
