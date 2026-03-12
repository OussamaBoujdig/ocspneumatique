import { useEffect, useState } from "react";
import { api, type WorkOrder, type Client, type Vehicle, type Service as ServiceType, type Tire } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList, Plus, Loader2, Play, CheckCircle, Trash2, Eye, FileText, MessageCircle } from "lucide-react";
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
  const [detailDialog, setDetailDialog] = useState<WorkOrder | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ client_id: "", vehicle_id: "", technician: "", notes: "" });
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
    setForm({ client_id: "", vehicle_id: "", technician: "", notes: "" });
    setItems([{ service_id: "", tire_id: "", description: "", quantity: "1", unit_price: "" }]);
    setDialogOpen(true);
  };

  const viewDetail = async (id: number) => {
    try {
      const data = await api.get<WorkOrder>(`/work-orders/${id}`);
      setDetailDialog(data);
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
      await api.post("/work-orders", {
        client_id: Number(form.client_id),
        vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null,
        technician: form.technician || null,
        notes: form.notes || null,
        items: validItems.map((i) => ({
          service_id: i.service_id ? Number(i.service_id) : null,
          tire_id: i.tire_id ? Number(i.tire_id) : null,
          description: i.description,
          quantity: Number(i.quantity) || 1,
          unit_price: Number(i.unit_price) || 0,
        })),
      });
      toast.success("Ordre créé");
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
          try {
            await sendCompletionWhatsApp(result.appointment_id);
          } catch { /* no phone */ }
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
                <th className="py-3 px-4 font-medium text-muted-foreground">Statut</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Date</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-foreground">#{o.id}</td>
                  <td className="py-3 px-4 text-foreground">{o.client_name || "—"}</td>
                  <td className="py-3 px-4 text-muted-foreground">{o.vehicle_brand ? `${o.vehicle_brand} ${o.vehicle_model}` : "—"} {o.license_plate ? `(${o.license_plate})` : ""}</td>
                  <td className="py-3 px-4 text-muted-foreground">{o.technician || "—"}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status]}`}>{statusLabels[o.status]}</span></td>
                  <td className="py-3 px-4 text-muted-foreground">{new Date(o.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => viewDetail(o.id)}><Eye size={14} /></Button>
                      {o.status === "open" && <Button size="sm" variant="ghost" onClick={() => updateStatus(o.id, "in_progress")}><Play size={14} /></Button>}
                      {o.status === "in_progress" && <Button size="sm" variant="ghost" onClick={() => updateStatus(o.id, "completed")}><CheckCircle size={14} /></Button>}
                      <Button size="sm" variant="ghost" onClick={() => deleteOrder(o.id)} className="text-destructive hover:text-destructive"><Trash2 size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New order dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvel ordre de travail</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client *</Label>
                <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value, vehicle_id: "" })} className={selectClass}>
                  <option value="">Sélectionner...</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div>
                <Label>Véhicule</Label>
                <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} className={selectClass}>
                  <option value="">Sélectionner...</option>
                  {filteredVehicles.map((v) => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.license_plate ? `(${v.license_plate})` : ""}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Technicien</Label>
              <Input value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} placeholder="Nom du technicien" />
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
                          {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({Number(s.default_price).toFixed(2)}€)</option>)}
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
              Créer l'ordre
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Ordre #{detailDialog?.id}</DialogTitle></DialogHeader>
          {detailDialog && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><span className="text-muted-foreground">Client:</span> {detailDialog.client_name || "—"}</p>
                <p><span className="text-muted-foreground">Véhicule:</span> {detailDialog.vehicle_brand ? `${detailDialog.vehicle_brand} ${detailDialog.vehicle_model}` : "—"}</p>
                <p><span className="text-muted-foreground">Technicien:</span> {detailDialog.technician || "—"}</p>
                <p><span className="text-muted-foreground">Statut:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[detailDialog.status]}`}>{statusLabels[detailDialog.status]}</span></p>
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
                          <td className="py-1 text-right">{Number(item.unit_price).toFixed(2)}€</td>
                          <td className="py-1 text-right font-medium">{Number(item.total).toFixed(2)}€</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr><td colSpan={3} className="pt-2 text-right font-semibold">Total:</td><td className="pt-2 text-right font-bold">{detailDialog.items.reduce((s, i) => s + Number(i.total), 0).toFixed(2)}€</td></tr>
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
