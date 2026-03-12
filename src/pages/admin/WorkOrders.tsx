import { useEffect, useState } from "react";
import { api, type WorkOrder, type Client, type Vehicle, type Service as ServiceType, type Tire } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList, Plus, Loader2, Play, CheckCircle, Trash2, Eye, Pencil, Printer, Timer, AlertCircle } from "lucide-react";
import { sendInvoiceWhatsApp, sendCompletionWhatsApp } from "@/lib/whatsapp";

const statusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};
const statusLabels: Record<string, string> = {
  all: "Tous", open: "Ouvert", in_progress: "En cours", completed: "Terminé", cancelled: "Annulé",
};
const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};
const priorityLabels: Record<string, string> = {
  low: "Basse", normal: "Normale", high: "Haute", urgent: "Urgente",
};

interface OrderItem {
  service_id: string;
  tire_id: string;
  description: string;
  quantity: string;
  unit_price: string;
}

export default function WorkOrders() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [tires, setTires] = useState<Tire[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [detailDialog, setDetailDialog] = useState<WorkOrder | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ client_id: "", vehicle_id: "", technician: "", notes: "", priority: "normal", estimated_duration: "" });
  const [items, setItems] = useState<OrderItem[]>([{ service_id: "", tire_id: "", description: "", quantity: "1", unit_price: "" }]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      setOrders(await api.get<WorkOrder[]>(`/work-orders${params}`));
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [filter]);
  useEffect(() => {
    api.get<Client[]>("/clients").then(setClients).catch(() => {});
    api.get<Vehicle[]>("/vehicles").then(setVehicles).catch(() => {});
    api.get<ServiceType[]>("/services").then(setServices).catch(() => {});
    api.get<Tire[]>("/tires").then(setTires).catch(() => {});
  }, []);

  const openNew = () => {
    setEditingOrder(null);
    setForm({ client_id: "", vehicle_id: "", technician: "", notes: "", priority: "normal", estimated_duration: "" });
    setItems([{ service_id: "", tire_id: "", description: "", quantity: "1", unit_price: "" }]);
    setDialogOpen(true);
  };

  const openEdit = async (id: number) => {
    try {
      const data = await api.get<WorkOrder>(`/work-orders/${id}`);
      setEditingOrder(data);
      setForm({
        client_id: data.client_id ? String(data.client_id) : "",
        vehicle_id: data.vehicle_id ? String(data.vehicle_id) : "",
        technician: data.technician || "",
        notes: data.notes || "",
        priority: data.priority || "normal",
        estimated_duration: data.estimated_duration ? String(data.estimated_duration) : "",
      });
      setItems(
        data.items?.length
          ? data.items.map((i) => ({
              service_id: i.service_id ? String(i.service_id) : "",
              tire_id: i.tire_id ? String(i.tire_id) : "",
              description: i.description,
              quantity: String(i.quantity),
              unit_price: String(i.unit_price),
            }))
          : [{ service_id: "", tire_id: "", description: "", quantity: "1", unit_price: "" }]
      );
      setDialogOpen(true);
    } catch {
      toast.error("Erreur");
    }
  };

  const viewDetail = async (id: number) => {
    try {
      setDetailDialog(await api.get<WorkOrder>(`/work-orders/${id}`));
    } catch {
      toast.error("Erreur");
    }
  };

  const addItem = () => setItems([...items, { service_id: "", tire_id: "", description: "", quantity: "1", unit_price: "" }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string) => {
    const updated = [...items];
    (updated[i] as Record<string, string>)[field] = value;

    if (field === "service_id" && value) {
      const svc = services.find((s) => s.id === Number(value));
      if (svc) {
        updated[i].description = svc.name;
        updated[i].unit_price = String(svc.default_price);
      }
    }
    if (field === "tire_id" && value) {
      const tire = tires.find((t) => t.id === Number(value));
      if (tire) {
        updated[i].description = `${tire.brand_name || ""} ${tire.model} ${tire.size}`.trim();
        updated[i].unit_price = String(tire.price);
      }
    }
    setItems(updated);
  };

  const handleSave = async () => {
    const validItems = items.filter((i) => i.description);
    if (!form.client_id || validItems.length === 0) {
      toast.error("Client et au moins une ligne requise");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        client_id: Number(form.client_id),
        vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null,
        technician: form.technician || null,
        notes: form.notes || null,
        priority: form.priority,
        estimated_duration: form.estimated_duration ? Number(form.estimated_duration) : null,
        items: validItems.map((i) => ({
          service_id: i.service_id ? Number(i.service_id) : null,
          tire_id: i.tire_id ? Number(i.tire_id) : null,
          description: i.description,
          quantity: Number(i.quantity) || 1,
          unit_price: Number(i.unit_price) || 0,
        })),
      };

      if (editingOrder) {
        await api.put(`/work-orders/${editingOrder.id}`, payload);
        toast.success("Ordre mis à jour");
      } else {
        await api.post("/work-orders", payload);
        toast.success("Ordre créé");
      }
      setDialogOpen(false);
      fetchOrders();
    } catch {
      toast.error("Erreur");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const result = await api.put<WorkOrder & { auto_invoice?: { id: number; invoice_number: string } }>(`/work-orders/${id}/status`, { status });
      toast.success("Statut mis à jour");

      if (status === "completed") {
        if (result.auto_invoice) {
          toast.success(`Facture ${result.auto_invoice.invoice_number} créée automatiquement`);
          try {
            await sendInvoiceWhatsApp(result.auto_invoice.id);
            toast.success("Facture envoyée au client par WhatsApp");
          } catch { /* no phone */ }
        }
        if (result.appointment_id) {
          try { await sendCompletionWhatsApp(result.appointment_id); } catch {}
        }
      }

      fetchOrders();
    } catch {
      toast.error("Erreur");
    }
  };

  const deleteOrder = async (id: number) => {
    if (!confirm("Supprimer cet ordre ?")) return;
    try { await api.delete(`/work-orders/${id}`); toast.success("Supprimé"); fetchOrders(); } catch { toast.error("Erreur"); }
  };

  const printTicket = (order: WorkOrder) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const total = order.items?.reduce((s, i) => s + Number(i.total), 0) || 0;
    w.document.write(`
      <html><head><title>Bon de travail #${order.id}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#333;max-width:600px;margin:0 auto}
        h1{color:#dc2626;font-size:20px;margin-bottom:5px}
        h2{font-size:16px;margin-top:0;color:#666}
        .info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:15px 0;font-size:13px}
        .info strong{color:#333}
        table{width:100%;border-collapse:collapse;margin-top:15px;font-size:13px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
        th{background:#f5f5f5}
        .priority{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold}
        .urgent{background:#fee2e2;color:#dc2626}
        .high{background:#ffedd5;color:#ea580c}
        .normal{background:#dbeafe;color:#2563eb}
        .low{background:#f3f4f6;color:#6b7280}
        .footer{margin-top:30px;border-top:1px solid #ddd;padding-top:15px;font-size:12px}
        .sig{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:30px}
        .sig div{border-top:1px solid #333;padding-top:5px;text-align:center;font-size:12px}
        @media print{body{padding:15px}}
      </style>
      </head><body>
      <h1>OCS PNEUS — Bon de Travail</h1>
      <h2>Ordre #${order.id} <span class="priority ${order.priority}">${priorityLabels[order.priority] || order.priority}</span></h2>
      <div class="info">
        <p><strong>Client:</strong> ${order.client_name || "—"}</p>
        <p><strong>Véhicule:</strong> ${order.vehicle_brand ? `${order.vehicle_brand} ${order.vehicle_model}` : "—"} ${order.license_plate ? `(${order.license_plate})` : ""}</p>
        <p><strong>Technicien:</strong> ${order.technician || "—"}</p>
        <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString("fr-FR")}</p>
        ${order.estimated_duration ? `<p><strong>Durée estimée:</strong> ${order.estimated_duration} min</p>` : ""}
        ${order.actual_duration ? `<p><strong>Durée réelle:</strong> ${order.actual_duration} min</p>` : ""}
      </div>
      ${order.notes ? `<p><em>Notes: ${order.notes}</em></p>` : ""}
      <table>
        <tr><th>Description</th><th>Qté</th><th>Prix unit.</th><th>Total</th></tr>
        ${(order.items || []).map((i) => `<tr><td>${i.description}</td><td>${i.quantity}</td><td>${Number(i.unit_price).toFixed(2)} DH</td><td>${Number(i.total).toFixed(2)} DH</td></tr>`).join("")}
      </table>
      <p style="text-align:right;font-weight:bold;font-size:15px;margin-top:10px">Total: ${total.toFixed(2)} DH</p>
      <div class="sig">
        <div>Signature technicien</div>
        <div>Signature client</div>
      </div>
      <div class="footer">
        <p style="text-align:center;color:#888">OCS PNEUS — Imprimé le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}</p>
      </div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const getElapsedTime = (order: WorkOrder) => {
    if (order.status !== "in_progress" || !order.started_at) return null;
    const elapsed = Math.round((Date.now() - new Date(order.started_at).getTime()) / 60000);
    const h = Math.floor(elapsed / 60);
    const m = elapsed % 60;
    return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}min`;
  };

  const filteredVehicles = form.client_id ? vehicles.filter((v) => v.client_id === Number(form.client_id)) : vehicles;
  const selectClass = "w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary/50 outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <ClipboardList size={24} className="text-primary" /> Ordres de travail
          </h1>
          <p className="text-muted-foreground text-sm">{orders.length} ordres</p>
        </div>
        <Button onClick={openNew}><Plus size={16} className="mr-1" /> Nouveau</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(statusLabels).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === k ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:border-primary/30"}`}
          >{v}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Aucun ordre trouvé.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 px-4 font-medium text-muted-foreground">#</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Client</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Véhicule</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Technicien</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Priorité</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Statut</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Temps</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Date</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const elapsed = getElapsedTime(o);
                return (
                  <tr key={o.id} className={`border-b border-border hover:bg-accent/50 transition-colors ${o.priority === "urgent" ? "bg-red-50/30" : ""}`}>
                    <td className="py-3 px-4 font-mono text-foreground">#{o.id}</td>
                    <td className="py-3 px-4 text-foreground">{o.client_name || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{o.vehicle_brand ? `${o.vehicle_brand} ${o.vehicle_model}` : "—"} {o.license_plate ? `(${o.license_plate})` : ""}</td>
                    <td className="py-3 px-4 text-muted-foreground">{o.technician || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[o.priority] || priorityColors.normal}`}>
                        {o.priority === "urgent" && <AlertCircle size={10} className="inline mr-0.5" />}
                        {priorityLabels[o.priority] || o.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status]}`}>{statusLabels[o.status]}</span></td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {elapsed && (
                        <span className="flex items-center gap-1 text-purple-600 font-medium">
                          <Timer size={12} className="animate-pulse" /> {elapsed}
                        </span>
                      )}
                      {o.actual_duration && <span className="text-xs">{o.actual_duration}min</span>}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{new Date(o.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => viewDetail(o.id)} title="Détails"><Eye size={14} /></Button>
                        {(o.status === "open" || o.status === "in_progress") && (
                          <Button size="sm" variant="ghost" onClick={() => openEdit(o.id)} title="Modifier"><Pencil size={14} /></Button>
                        )}
                        {o.status === "open" && <Button size="sm" variant="ghost" onClick={() => updateStatus(o.id, "in_progress")} title="Démarrer"><Play size={14} /></Button>}
                        {o.status === "in_progress" && <Button size="sm" variant="ghost" onClick={() => updateStatus(o.id, "completed")} title="Terminer"><CheckCircle size={14} /></Button>}
                        <Button size="sm" variant="ghost" onClick={() => deleteOrder(o.id)} className="text-destructive hover:text-destructive" title="Supprimer"><Trash2 size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New/Edit order dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingOrder ? `Modifier ordre #${editingOrder.id}` : "Nouvel ordre de travail"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client *</Label>
                <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value, vehicle_id: "" })} className={selectClass} disabled={!!editingOrder}>
                  <option value="">Sélectionner...</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div>
                <Label>Véhicule</Label>
                <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} className={selectClass} disabled={!!editingOrder}>
                  <option value="">Sélectionner...</option>
                  {filteredVehicles.map((v) => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.license_plate ? `(${v.license_plate})` : ""}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Technicien</Label>
                <Input value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} placeholder="Nom du technicien" />
              </div>
              <div>
                <Label>Priorité</Label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={selectClass}>
                  {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <Label>Durée estimée (min)</Label>
                <Input type="number" value={form.estimated_duration} onChange={(e) => setForm({ ...form, estimated_duration: e.target.value })} placeholder="60" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Lignes de travail</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus size={14} className="mr-1" /> Ajouter</Button>
              </div>
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="bg-accent/50 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Service</label>
                        <select value={item.service_id} onChange={(e) => updateItem(i, "service_id", e.target.value)} className={selectClass}>
                          <option value="">Aucun</option>
                          {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({Number(s.default_price).toFixed(2)} DH)</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Pneu</label>
                        <select value={item.tire_id} onChange={(e) => updateItem(i, "tire_id", e.target.value)} className={selectClass}>
                          <option value="">Aucun</option>
                          {tires.filter((t) => t.stock_qty > 0).map((t) => <option key={t.id} value={t.id}>{t.brand_name} {t.model} {t.size} (stock: {t.stock_qty})</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_80px_100px_40px] gap-2 items-end">
                      <div>
                        <label className="text-xs text-muted-foreground">Description</label>
                        <Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Description..." />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Qté</label>
                        <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Prix unit.</label>
                        <Input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", e.target.value)} />
                      </div>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeItem(i)} className="text-destructive"><Trash2 size={14} /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              {editingOrder ? "Mettre à jour" : "Créer l'ordre"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Ordre #{detailDialog?.id}</DialogTitle>
              <Button size="sm" variant="outline" onClick={() => detailDialog && printTicket(detailDialog)}>
                <Printer size={14} className="mr-1" /> Imprimer
              </Button>
            </div>
          </DialogHeader>
          {detailDialog && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><span className="text-muted-foreground">Client:</span> {detailDialog.client_name || "—"}</p>
                <p><span className="text-muted-foreground">Véhicule:</span> {detailDialog.vehicle_brand ? `${detailDialog.vehicle_brand} ${detailDialog.vehicle_model}` : "—"}</p>
                <p><span className="text-muted-foreground">Technicien:</span> {detailDialog.technician || "—"}</p>
                <p>
                  <span className="text-muted-foreground">Statut:</span>{" "}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[detailDialog.status]}`}>{statusLabels[detailDialog.status]}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Priorité:</span>{" "}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[detailDialog.priority] || priorityColors.normal}`}>{priorityLabels[detailDialog.priority] || detailDialog.priority}</span>
                </p>
                {detailDialog.estimated_duration && <p><span className="text-muted-foreground">Durée estimée:</span> {detailDialog.estimated_duration} min</p>}
                {detailDialog.actual_duration && <p><span className="text-muted-foreground">Durée réelle:</span> {detailDialog.actual_duration} min</p>}
                {detailDialog.started_at && <p><span className="text-muted-foreground">Démarré:</span> {new Date(detailDialog.started_at).toLocaleString("fr-FR")}</p>}
                {detailDialog.completed_at && <p><span className="text-muted-foreground">Terminé:</span> {new Date(detailDialog.completed_at).toLocaleString("fr-FR")}</p>}
              </div>
              {detailDialog.notes && <p className="text-sm text-muted-foreground italic">{detailDialog.notes}</p>}
              {detailDialog.items && detailDialog.items.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Lignes</h4>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border"><th className="text-left py-1 text-muted-foreground">Description</th><th className="text-right py-1 text-muted-foreground">Qté</th><th className="text-right py-1 text-muted-foreground">Prix</th><th className="text-right py-1 text-muted-foreground">Total</th></tr></thead>
                    <tbody>
                      {detailDialog.items.map((item) => (
                        <tr key={item.id} className="border-b border-border">
                          <td className="py-1">{item.description}</td>
                          <td className="py-1 text-right">{item.quantity}</td>
                          <td className="py-1 text-right">{Number(item.unit_price).toFixed(2)} DH</td>
                          <td className="py-1 text-right font-medium">{Number(item.total).toFixed(2)} DH</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr><td colSpan={3} className="pt-2 text-right font-semibold">Total:</td><td className="pt-2 text-right font-bold">{detailDialog.items.reduce((s, i) => s + Number(i.total), 0).toFixed(2)} DH</td></tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
