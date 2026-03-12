import { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BarChart3, Download, FileText, CalendarDays, Loader2 } from "lucide-react";

interface DailyReport {
  date: string;
  summary: { appointments: number; workOrders: number; invoices: number; revenue: number; newClients: number };
  appointments: Array<Record<string, unknown>>;
  workOrders: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
}

interface MonthlyReport {
  year: number;
  month: number;
  summary: {
    appointments: number;
    appointmentsByStatus: { pending: number; confirmed: number; completed: number; cancelled: number };
    workOrders: number;
    invoices: number;
    totalInvoiced: number;
    paidInvoices: number;
    paidAmount: number;
    revenue: number;
    newClients: number;
  };
  topServices: Array<{ service_type: string; count: number }>;
  lowStockTires: Array<{ brand_name: string; model: string; size: string; stock_qty: number; min_stock: number }>;
  dailyRevenue: Array<{ day: string; total: number }>;
  invoices: Array<Record<string, unknown>>;
}

function toCSV(headers: string[], rows: string[][]): string {
  const bom = "\uFEFF";
  const head = headers.join(";");
  const body = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  return bom + head + "\n" + body;
}

function downloadFile(content: string, filename: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadHtmlAsPdf(html: string, title: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  setTimeout(() => w.print(), 500);
}

export default function Reports() {
  const { t, lang } = useI18n();
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split("T")[0]);
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);

  const fetchDaily = async () => {
    setLoadingDaily(true);
    try {
      const data = await api.get<DailyReport>(`/reports/daily?date=${dailyDate}`);
      setDailyReport(data);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoadingDaily(false);
    }
  };

  const fetchMonthly = async () => {
    setLoadingMonthly(true);
    try {
      const [y, m] = monthYear.split("-");
      const data = await api.get<MonthlyReport>(`/reports/monthly?year=${y}&month=${m}`);
      setMonthlyReport(data);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoadingMonthly(false);
    }
  };

  const downloadDailyCSV = () => {
    if (!dailyReport) return;
    const s = dailyReport.summary;
    const headers = [t("rpt.appointments"), t("rpt.workOrders"), t("rpt.invoices"), t("rpt.revenue"), t("dash.clients")];
    const rows = [[String(s.appointments), String(s.workOrders), String(s.invoices), `${s.revenue}€`, String(s.newClients)]];

    if (dailyReport.appointments.length > 0) {
      rows.push([]);
      rows.push([t("rpt.appointments"), "", "", "", ""]);
      rows.push([lang === "ar" ? "الاسم" : "Nom", lang === "ar" ? "الهاتف" : "Téléphone", lang === "ar" ? "الخدمة" : "Service", lang === "ar" ? "الوقت" : "Heure", lang === "ar" ? "الحالة" : "Statut"]);
      for (const a of dailyReport.appointments as Array<Record<string, string>>) {
        rows.push([a.full_name, a.phone, a.service_type, a.preferred_time, a.status]);
      }
    }

    if (dailyReport.invoices.length > 0) {
      rows.push([]);
      rows.push([t("rpt.invoices"), "", "", "", ""]);
      rows.push([lang === "ar" ? "رقم الفاتورة" : "N° Facture", lang === "ar" ? "العميل" : "Client", lang === "ar" ? "المبلغ" : "Montant", lang === "ar" ? "الحالة" : "Statut", ""]);
      for (const inv of dailyReport.invoices as Array<Record<string, string>>) {
        rows.push([inv.invoice_number, inv.client_name || "—", `${Number(inv.total).toFixed(2)}€`, inv.status, ""]);
      }
    }

    downloadFile(toCSV(headers, rows), `rapport-quotidien-${dailyReport.date}.csv`);
    toast.success(t("common.success"));
  };

  const downloadDailyPDF = () => {
    if (!dailyReport) return;
    const s = dailyReport.summary;
    const dir = lang === "ar" ? "rtl" : "ltr";
    const html = `<html dir="${dir}"><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;padding:40px;color:#333;direction:${dir}}
      h1{color:#dc2626;margin-bottom:5px}h2{color:#555;margin-top:30px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #ddd;padding:8px;text-align:${lang === "ar" ? "right" : "left"}}
      th{background:#f5f5f5}.stat{display:inline-block;margin:10px 20px 10px 0;padding:15px 20px;background:#f9f9f9;border-radius:8px;text-align:center}
      .stat strong{display:block;font-size:1.5em;color:#dc2626}
    </style></head><body>
    <h1>OCS PNEUS</h1>
    <h2>${t("rpt.daily")} — ${dailyReport.date}</h2>
    <div>
      <div class="stat"><strong>${s.appointments}</strong>${t("rpt.appointments")}</div>
      <div class="stat"><strong>${s.workOrders}</strong>${t("rpt.workOrders")}</div>
      <div class="stat"><strong>${s.invoices}</strong>${t("rpt.invoices")}</div>
      <div class="stat"><strong>${Number(s.revenue).toFixed(2)}€</strong>${t("rpt.revenue")}</div>
      <div class="stat"><strong>${s.newClients}</strong>${t("dash.clients")}</div>
    </div>
    ${dailyReport.appointments.length ? `
      <h2>${t("rpt.appointments")}</h2>
      <table><tr><th>${lang === "ar" ? "الاسم" : "Nom"}</th><th>${lang === "ar" ? "الهاتف" : "Tél"}</th><th>${lang === "ar" ? "الخدمة" : "Service"}</th><th>${lang === "ar" ? "الوقت" : "Heure"}</th><th>${lang === "ar" ? "الحالة" : "Statut"}</th></tr>
      ${(dailyReport.appointments as Array<Record<string, string>>).map((a) => `<tr><td>${a.full_name}</td><td>${a.phone}</td><td>${a.service_type}</td><td>${a.preferred_time}</td><td>${a.status}</td></tr>`).join("")}
      </table>` : ""}
    ${dailyReport.invoices.length ? `
      <h2>${t("rpt.invoices")}</h2>
      <table><tr><th>${lang === "ar" ? "رقم" : "N°"}</th><th>${lang === "ar" ? "العميل" : "Client"}</th><th>${lang === "ar" ? "المبلغ" : "Montant"}</th><th>${lang === "ar" ? "الحالة" : "Statut"}</th></tr>
      ${(dailyReport.invoices as Array<Record<string, string>>).map((i) => `<tr><td>${i.invoice_number}</td><td>${i.client_name || "—"}</td><td>${Number(i.total).toFixed(2)}€</td><td>${i.status}</td></tr>`).join("")}
      </table>` : ""}
    </body></html>`;
    downloadHtmlAsPdf(html, `rapport-quotidien-${dailyReport.date}`);
  };

  const downloadMonthlyCSV = () => {
    if (!monthlyReport) return;
    const s = monthlyReport.summary;
    const headers = [t("rpt.appointments"), t("rpt.workOrders"), t("rpt.invoices"), t("rpt.revenue"), t("dash.clients")];
    const rows: string[][] = [[String(s.appointments), String(s.workOrders), String(s.invoices), `${Number(s.revenue).toFixed(2)}€`, String(s.newClients)]];

    rows.push([]);
    rows.push([t("rpt.topServices"), "", "", "", ""]);
    for (const svc of monthlyReport.topServices) rows.push([svc.service_type, String(svc.count), "", "", ""]);

    rows.push([]);
    rows.push([t("rpt.invoices"), "", "", "", ""]);
    rows.push([lang === "ar" ? "رقم" : "N°", lang === "ar" ? "العميل" : "Client", lang === "ar" ? "المبلغ" : "Montant", lang === "ar" ? "الحالة" : "Statut", lang === "ar" ? "التاريخ" : "Date"]);
    for (const inv of monthlyReport.invoices as Array<Record<string, string>>) {
      rows.push([inv.invoice_number, inv.client_name || "—", `${Number(inv.total).toFixed(2)}€`, inv.status, new Date(inv.created_at).toLocaleDateString("fr-FR")]);
    }

    if (monthlyReport.lowStockTires.length) {
      rows.push([]);
      rows.push([t("rpt.stockAlerts"), "", "", "", ""]);
      for (const tire of monthlyReport.lowStockTires) {
        rows.push([`${tire.brand_name || ""} ${tire.model}`, tire.size, String(tire.stock_qty), String(tire.min_stock), ""]);
      }
    }

    downloadFile(toCSV(headers, rows), `rapport-mensuel-${monthlyReport.year}-${String(monthlyReport.month).padStart(2, "0")}.csv`);
    toast.success(t("common.success"));
  };

  const downloadMonthlyPDF = () => {
    if (!monthlyReport) return;
    const s = monthlyReport.summary;
    const dir = lang === "ar" ? "rtl" : "ltr";
    const monthName = new Date(monthlyReport.year, monthlyReport.month - 1).toLocaleDateString(lang === "ar" ? "ar-SA" : "fr-FR", { month: "long", year: "numeric" });
    const html = `<html dir="${dir}"><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;padding:40px;color:#333;direction:${dir}}
      h1{color:#dc2626;margin-bottom:5px}h2{color:#555;margin-top:30px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #ddd;padding:8px;text-align:${lang === "ar" ? "right" : "left"}}
      th{background:#f5f5f5}.stat{display:inline-block;margin:10px 20px 10px 0;padding:15px 20px;background:#f9f9f9;border-radius:8px;text-align:center}
      .stat strong{display:block;font-size:1.5em;color:#dc2626}
    </style></head><body>
    <h1>OCS PNEUS</h1>
    <h2>${t("rpt.monthly")} — ${monthName}</h2>
    <div>
      <div class="stat"><strong>${s.appointments}</strong>${t("rpt.appointments")}</div>
      <div class="stat"><strong>${s.workOrders}</strong>${t("rpt.workOrders")}</div>
      <div class="stat"><strong>${s.invoices}</strong>${t("rpt.invoices")}</div>
      <div class="stat"><strong>${Number(s.revenue).toFixed(2)}€</strong>${t("rpt.revenue")}</div>
      <div class="stat"><strong>${s.newClients}</strong>${t("dash.clients")}</div>
    </div>
    <h2>${t("rpt.topServices")}</h2>
    <table><tr><th>${lang === "ar" ? "الخدمة" : "Service"}</th><th>${lang === "ar" ? "العدد" : "Nombre"}</th></tr>
    ${monthlyReport.topServices.map((s) => `<tr><td>${s.service_type}</td><td>${s.count}</td></tr>`).join("")}
    </table>
    ${monthlyReport.invoices.length ? `
      <h2>${t("rpt.invoices")}</h2>
      <table><tr><th>${lang === "ar" ? "رقم" : "N°"}</th><th>${lang === "ar" ? "العميل" : "Client"}</th><th>${lang === "ar" ? "المبلغ" : "Montant"}</th><th>${lang === "ar" ? "الحالة" : "Statut"}</th></tr>
      ${(monthlyReport.invoices as Array<Record<string, string>>).map((i) => `<tr><td>${i.invoice_number}</td><td>${i.client_name || "—"}</td><td>${Number(i.total).toFixed(2)}€</td><td>${i.status}</td></tr>`).join("")}
      </table>` : ""}
    ${monthlyReport.lowStockTires.length ? `
      <h2>${t("rpt.stockAlerts")}</h2>
      <table><tr><th>${lang === "ar" ? "الإطار" : "Pneu"}</th><th>${lang === "ar" ? "المقاس" : "Taille"}</th><th>${lang === "ar" ? "المخزون" : "Stock"}</th><th>${lang === "ar" ? "الحد الأدنى" : "Min"}</th></tr>
      ${monthlyReport.lowStockTires.map((t) => `<tr><td>${t.brand_name || ""} ${t.model}</td><td>${t.size}</td><td style="color:${t.stock_qty <= t.min_stock ? 'red' : 'green'}">${t.stock_qty}</td><td>${t.min_stock}</td></tr>`).join("")}
      </table>` : ""}
    </body></html>`;
    downloadHtmlAsPdf(html, `rapport-mensuel-${monthlyReport.year}-${monthlyReport.month}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
          <BarChart3 size={24} className="text-primary" /> {t("rpt.title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t("rpt.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Report */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={18} className="text-primary" />
            <h2 className="font-semibold text-foreground text-lg">{t("rpt.daily")}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t("rpt.dailyDesc")}</p>

          <div className="flex items-end gap-3 mb-4">
            <div className="flex-1">
              <Label>{t("rpt.selectDate")}</Label>
              <Input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
            </div>
            <Button onClick={fetchDaily} disabled={loadingDaily}>
              {loadingDaily ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
              {loadingDaily ? t("rpt.generating") : t("common.search")}
            </Button>
          </div>

          {dailyReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-accent/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{dailyReport.summary.appointments}</p>
                  <p className="text-xs text-muted-foreground">{t("rpt.appointments")}</p>
                </div>
                <div className="bg-accent/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{dailyReport.summary.workOrders}</p>
                  <p className="text-xs text-muted-foreground">{t("rpt.workOrders")}</p>
                </div>
                <div className="bg-accent/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-primary">{Number(dailyReport.summary.revenue).toFixed(2)}€</p>
                  <p className="text-xs text-muted-foreground">{t("rpt.revenue")}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadDailyCSV} className="flex-1">
                  <Download size={14} className="mr-1" /> {t("rpt.download")}
                </Button>
                <Button variant="outline" size="sm" onClick={downloadDailyPDF} className="flex-1">
                  <FileText size={14} className="mr-1" /> {t("rpt.downloadPdf")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Monthly Report */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-primary" />
            <h2 className="font-semibold text-foreground text-lg">{t("rpt.monthly")}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t("rpt.monthlyDesc")}</p>

          <div className="flex items-end gap-3 mb-4">
            <div className="flex-1">
              <Label>{t("rpt.selectMonth")}</Label>
              <Input type="month" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} />
            </div>
            <Button onClick={fetchMonthly} disabled={loadingMonthly}>
              {loadingMonthly ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
              {loadingMonthly ? t("rpt.generating") : t("common.search")}
            </Button>
          </div>

          {monthlyReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-accent/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{monthlyReport.summary.appointments}</p>
                  <p className="text-xs text-muted-foreground">{t("rpt.appointments")}</p>
                </div>
                <div className="bg-accent/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{monthlyReport.summary.invoices}</p>
                  <p className="text-xs text-muted-foreground">{t("rpt.invoices")}</p>
                </div>
                <div className="bg-accent/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-primary">{Number(monthlyReport.summary.revenue).toFixed(2)}€</p>
                  <p className="text-xs text-muted-foreground">{t("rpt.revenue")}</p>
                </div>
              </div>

              {monthlyReport.topServices.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">{t("rpt.topServices")}</p>
                  <div className="space-y-1">
                    {monthlyReport.topServices.slice(0, 5).map((s) => (
                      <div key={s.service_type} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{s.service_type}</span>
                        <span className="font-medium text-foreground">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {monthlyReport.lowStockTires.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-500 mb-2">{t("rpt.stockAlerts")} ({monthlyReport.lowStockTires.length})</p>
                  <div className="space-y-1">
                    {monthlyReport.lowStockTires.slice(0, 5).map((tire, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{tire.brand_name} {tire.model} {tire.size}</span>
                        <span className="font-medium text-red-500">{tire.stock_qty}/{tire.min_stock}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadMonthlyCSV} className="flex-1">
                  <Download size={14} className="mr-1" /> {t("rpt.download")}
                </Button>
                <Button variant="outline" size="sm" onClick={downloadMonthlyPDF} className="flex-1">
                  <FileText size={14} className="mr-1" /> {t("rpt.downloadPdf")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
