import { useEffect, useState } from "react";
import { api, type Invoice, type WorkOrder, type Client } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Plus, Loader2, Eye, CheckCircle, Send, Trash2, Printer, MessageCircle, Copy, CreditCard, Banknote, ReceiptText } from "lucide-react";
import { sendInvoiceWhatsApp } from "@/lib/whatsapp";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-orange-100 text-orange-800",
  cancelled: "bg-red-100 text-red-800",
};
const statusLabels: Record<string, string> = {
  all: "Toutes", draft: "Brouillon", sent: "Envoyée", paid: "Payée", overdue: "En retard", cancelled: "Annulée",
};
const paymentLabels: Record<string, string> = {
  cash: "Espèces", card: "Carte bancaire", bank_transfer: "Virement", cheque: "Chèque", other: "Autre",
};

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState<Invoice | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    work_order_id: "", client_id: "", tax_rate: "20", notes: "", due_date: "",
    discount_amount: "0", discount_type: "fixed" as "fixed" | "percent", payment_method: "cash",
  });
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "cash" });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      setInvoices(await api.get<Invoice[]>(`/invoices${params}`));
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [filter]);
  useEffect(() => {
    api.get<WorkOrder[]>("/work-orders?status=completed").then(setWorkOrders).catch(() => {});
    api.get<Client[]>("/clients").then(setClients).catch(() => {});
  }, []);

  const openNew = () => {
    setForm({ work_order_id: "", client_id: "", tax_rate: "20", notes: "", due_date: "", discount_amount: "0", discount_type: "fixed", payment_method: "cash" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/invoices", {
        work_order_id: form.work_order_id ? Number(form.work_order_id) : null,
        client_id: form.client_id ? Number(form.client_id) : null,
        tax_rate: Number(form.tax_rate) || 20,
        notes: form.notes || null,
        due_date: form.due_date || null,
        discount_amount: Number(form.discount_amount) || 0,
        discount_type: form.discount_type,
        payment_method: form.payment_method,
      });
      toast.success("Facture créée");
      setDialogOpen(false);
      fetchInvoices();
    } catch {
      toast.error("Erreur");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/invoices/${id}/status`, { status });
      toast.success("Statut mis à jour");
      fetchInvoices();
      if (detailDialog?.id === id) viewDetail(id);
    } catch {
      toast.error("Erreur");
    }
  };

  const viewDetail = async (id: number) => {
    try {
      setDetailDialog(await api.get<Invoice>(`/invoices/${id}`));
    } catch {
      toast.error("Erreur");
    }
  };

  const sendWhatsApp = async (id: number) => {
    try {
      await sendInvoiceWhatsApp(id);
      toast.success("WhatsApp ouvert — facture marquée comme envoyée");
      fetchInvoices();
    } catch {
      toast.error("Impossible d'envoyer (vérifiez le numéro du client)");
    }
  };

  const duplicateInvoice = async (id: number) => {
    try {
      const dup = await api.post<Invoice>(`/invoices/${id}/duplicate`, {});
      toast.success(`Facture dupliquée: ${dup.invoice_number}`);
      fetchInvoices();
    } catch {
      toast.error("Erreur de duplication");
    }
  };

  const createCreditNote = async (id: number) => {
    if (!confirm("Créer un avoir (note de crédit) pour cette facture ?")) return;
    try {
      const cn = await api.post<Invoice>(`/invoices/${id}/credit-note`, {});
      toast.success(`Avoir créé: ${cn.invoice_number}`);
      fetchInvoices();
    } catch {
      toast.error("Erreur");
    }
  };

  const handlePayment = async () => {
    if (!paymentDialog || !paymentForm.amount) return;
    try {
      await api.put(`/invoices/${paymentDialog.id}/payment`, {
        amount_paid: Number(paymentForm.amount),
        payment_method: paymentForm.method,
      });
      toast.success("Paiement enregistré");
      setPaymentDialog(null);
      fetchInvoices();
    } catch {
      toast.error("Erreur");
    }
  };

  const deleteInvoice = async (id: number) => {
    if (!confirm("Supprimer cette facture ?")) return;
    try { await api.delete(`/invoices/${id}`); toast.success("Supprimée"); fetchInvoices(); } catch { toast.error("Erreur"); }
  };

  const printInvoice = () => {
    if (!detailDialog) return;
    const inv = detailDialog;
    const w = window.open("", "_blank");
    if (!w) return;
    const remaining = Number(inv.total) - Number(inv.amount_paid);
    w.document.write(`
      <html><head><title>Facture ${inv.invoice_number}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:40px;color:#333;max-width:800px;margin:0 auto}
        h1{color:#dc2626;margin-bottom:5px}
        .header{display:flex;justify-content:space-between;margin-bottom:30px}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{border:1px solid #ddd;padding:8px;text-align:left}
        th{background:#f5f5f5}
        .total{font-weight:bold;font-size:1.2em}
        .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold}
        .credit{color:#dc2626;font-style:italic}
        .summary{margin-top:20px;text-align:right}
        .summary p{margin:4px 0}
        @media print{body{padding:20px}}
      </style>
      </head><body>
      <div class="header">
        <div>
          <h1>OCS PNEUS</h1>
          <p>Garage pneumatique professionnel</p>
        </div>
        <div style="text-align:right">
          <h2>${inv.is_credit_note ? "AVOIR" : "FACTURE"} ${inv.invoice_number}</h2>
          <p>Date: ${new Date(inv.created_at).toLocaleDateString("fr-FR")}</p>
          ${inv.due_date ? `<p>Échéance: ${inv.due_date}</p>` : ""}
        </div>
      </div>
      <p><strong>Client:</strong> ${inv.client_name || "—"}</p>
      ${inv.client_address ? `<p><strong>Adresse:</strong> ${inv.client_address}</p>` : ""}
      ${inv.client_phone ? `<p><strong>Tél:</strong> ${inv.client_phone}</p>` : ""}
      <table><tr><th>Description</th><th>Qté</th><th>Prix unit.</th><th>Total</th></tr>
      ${(inv.items || []).map((i) => `<tr><td>${i.description}</td><td>${i.quantity}</td><td>${Number(i.unit_price).toFixed(2)} DH</td><td>${Number(i.total).toFixed(2)} DH</td></tr>`).join("")}
      </table>
      <div class="summary">
        <p>Sous-total HT: ${Number(inv.subtotal).toFixed(2)} DH</p>
        ${Number(inv.discount_amount) > 0 ? `<p>Remise: -${Number(inv.discount_amount).toFixed(2)} DH</p>` : ""}
        <p>TVA (${inv.tax_rate}%): ${Number(inv.tax_amount).toFixed(2)} DH</p>
        <p class="total">Total TTC: ${Number(inv.total).toFixed(2)} DH</p>
        ${Number(inv.amount_paid) > 0 ? `<p>Payé: ${Number(inv.amount_paid).toFixed(2)} DH</p><p><strong>Reste à payer: ${remaining.toFixed(2)} DH</strong></p>` : ""}
        <p>Mode de paiement: ${paymentLabels[inv.payment_method] || inv.payment_method}</p>
      </div>
      ${inv.notes ? `<p style="margin-top:20px"><em>${inv.notes}</em></p>` : ""}
      <hr style="margin-top:40px">
      <p style="text-align:center;font-size:11px;color:#888">OCS PNEUS — Merci pour votre confiance</p>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const selectedWO = workOrders.find((wo) => wo.id === Number(form.work_order_id));
  const selectClass = "w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary/50 outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <FileText size={24} className="text-primary" /> Factures
          </h1>
          <p className="text-muted-foreground text-sm">{invoices.length} factures</p>
        </div>
        <Button onClick={openNew}><Plus size={16} className="mr-1" /> Nouvelle</Button>
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
      ) : invoices.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Aucune facture trouvée.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 px-4 font-medium text-muted-foreground">N° Facture</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Client</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Total TTC</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Payé</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Paiement</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Statut</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Date</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const remaining = Number(inv.total) - Number(inv.amount_paid);
                return (
                  <tr key={inv.id} className={`border-b border-border hover:bg-accent/50 transition-colors ${inv.is_credit_note ? "bg-red-50/50" : ""}`}>
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {inv.invoice_number}
                      {inv.is_credit_note && <span className="ml-1 text-xs text-red-500">(Avoir)</span>}
                    </td>
                    <td className="py-3 px-4 text-foreground">{inv.client_name || "—"}</td>
                    <td className="py-3 px-4 font-medium text-foreground">{Number(inv.total).toFixed(2)} DH</td>
                    <td className="py-3 px-4">
                      {Number(inv.amount_paid) > 0 ? (
                        <span className={remaining <= 0 ? "text-green-600 font-medium" : "text-orange-600"}>
                          {Number(inv.amount_paid).toFixed(2)} DH
                          {remaining > 0 && <span className="text-xs block text-muted-foreground">Reste: {remaining.toFixed(2)}</span>}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{paymentLabels[inv.payment_method] || "—"}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status]}`}>{statusLabels[inv.status]}</span></td>
                    <td className="py-3 px-4 text-muted-foreground">{new Date(inv.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1 justify-end flex-wrap">
                        <Button size="sm" variant="ghost" onClick={() => viewDetail(inv.id)} title="Détails"><Eye size={14} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => sendWhatsApp(inv.id)} className="text-green-600 hover:text-green-700" title="WhatsApp"><MessageCircle size={14} /></Button>
                        {inv.status !== "paid" && !inv.is_credit_note && (
                          <Button size="sm" variant="ghost" onClick={() => { setPaymentDialog(inv); setPaymentForm({ amount: String(Number(inv.total) - Number(inv.amount_paid)), method: inv.payment_method }); }} title="Paiement" className="text-blue-600">
                            <Banknote size={14} />
                          </Button>
                        )}
                        {inv.status === "draft" && <Button size="sm" variant="ghost" onClick={() => updateStatus(inv.id, "sent")} title="Marquer envoyée"><Send size={14} /></Button>}
                        {(inv.status === "sent" || inv.status === "overdue") && <Button size="sm" variant="ghost" onClick={() => updateStatus(inv.id, "paid")} title="Marquer payée"><CheckCircle size={14} /></Button>}
                        <Button size="sm" variant="ghost" onClick={() => duplicateInvoice(inv.id)} title="Dupliquer"><Copy size={14} /></Button>
                        {!inv.is_credit_note && inv.status === "paid" && (
                          <Button size="sm" variant="ghost" onClick={() => createCreditNote(inv.id)} title="Avoir" className="text-red-600"><ReceiptText size={14} /></Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteInvoice(inv.id)} className="text-destructive hover:text-destructive" title="Supprimer"><Trash2 size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New invoice dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvelle facture</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Ordre de travail (terminé)</Label>
              <select value={form.work_order_id} onChange={(e) => {
                const wo = workOrders.find((w) => w.id === Number(e.target.value));
                setForm({ ...form, work_order_id: e.target.value, client_id: wo?.client_id ? String(wo.client_id) : form.client_id });
              }} className={selectClass}>
                <option value="">Aucun (facture libre)</option>
                {workOrders.map((wo) => <option key={wo.id} value={wo.id}>#{wo.id} — {wo.client_name || "Client"} {wo.vehicle_brand ? `(${wo.vehicle_brand} ${wo.vehicle_model})` : ""}</option>)}
              </select>
            </div>
            <div>
              <Label>Client</Label>
              <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className={selectClass} disabled={!!selectedWO}>
                <option value="">Sélectionner...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Taux TVA (%)</Label><Input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} /></div>
              <div><Label>Date d'échéance</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Remise</Label>
                <Input type="number" step="0.01" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} />
              </div>
              <div>
                <Label>Type remise</Label>
                <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as "fixed" | "percent" })} className={selectClass}>
                  <option value="fixed">Montant fixe (DH)</option>
                  <option value="percent">Pourcentage (%)</option>
                </select>
              </div>
              <div>
                <Label>Mode paiement</Label>
                <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className={selectClass}>
                  {Object.entries(paymentLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Créer la facture
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
          {paymentDialog && (
            <div className="space-y-4 mt-2">
              <div className="bg-accent/50 rounded-lg p-3 text-sm space-y-1">
                <p>Facture: <strong>{paymentDialog.invoice_number}</strong></p>
                <p>Total: <strong>{Number(paymentDialog.total).toFixed(2)} DH</strong></p>
                <p>Déjà payé: {Number(paymentDialog.amount_paid).toFixed(2)} DH</p>
                <p className="font-bold">Reste: {(Number(paymentDialog.total) - Number(paymentDialog.amount_paid)).toFixed(2)} DH</p>
              </div>
              <div>
                <Label>Montant du paiement (DH)</Label>
                <Input type="number" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
              </div>
              <div>
                <Label>Mode de paiement</Label>
                <select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })} className={selectClass}>
                  {Object.entries(paymentLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <Button onClick={handlePayment} className="w-full">
                <CreditCard size={16} className="mr-1" /> Enregistrer le paiement
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail/print dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {detailDialog?.is_credit_note ? "Avoir" : "Facture"} {detailDialog?.invoice_number}
              </DialogTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => detailDialog && sendWhatsApp(detailDialog.id)} className="text-green-600 border-green-200 hover:bg-green-50"><MessageCircle size={14} className="mr-1" /> WhatsApp</Button>
                <Button size="sm" variant="outline" onClick={printInvoice}><Printer size={14} className="mr-1" /> Imprimer</Button>
              </div>
            </div>
          </DialogHeader>
          {detailDialog && (
            <div className="space-y-4 mt-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <p><span className="text-muted-foreground">Client:</span> {detailDialog.client_name || "—"}</p>
                <p><span className="text-muted-foreground">Statut:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[detailDialog.status]}`}>{statusLabels[detailDialog.status]}</span></p>
                <p><span className="text-muted-foreground">Date:</span> {new Date(detailDialog.created_at).toLocaleDateString("fr-FR")}</p>
                {detailDialog.due_date && <p><span className="text-muted-foreground">Échéance:</span> {detailDialog.due_date}</p>}
                <p><span className="text-muted-foreground">Paiement:</span> {paymentLabels[detailDialog.payment_method] || detailDialog.payment_method}</p>
              </div>

              {detailDialog.items && detailDialog.items.length > 0 && (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border"><th className="text-left py-1 text-muted-foreground">Description</th><th className="text-right py-1 text-muted-foreground">Qté</th><th className="text-right py-1 text-muted-foreground">Prix</th><th className="text-right py-1 text-muted-foreground">Total</th></tr></thead>
                  <tbody>
                    {detailDialog.items.map((item) => (
                      <tr key={item.id} className="border-b border-border">
                        <td className="py-1">{item.description}</td>
                        <td className="py-1 text-right">{item.quantity}</td>
                        <td className="py-1 text-right">{Number(item.unit_price).toFixed(2)} DH</td>
                        <td className="py-1 text-right">{Number(item.total).toFixed(2)} DH</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="bg-accent/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Sous-total HT</span><span>{Number(detailDialog.subtotal).toFixed(2)} DH</span></div>
                {Number(detailDialog.discount_amount) > 0 && (
                  <div className="flex justify-between text-red-600"><span>Remise</span><span>-{Number(detailDialog.discount_amount).toFixed(2)} DH</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">TVA ({detailDialog.tax_rate}%)</span><span>{Number(detailDialog.tax_amount).toFixed(2)} DH</span></div>
                <div className="flex justify-between font-bold text-base border-t border-border pt-1"><span>Total TTC</span><span>{Number(detailDialog.total).toFixed(2)} DH</span></div>
                {Number(detailDialog.amount_paid) > 0 && (
                  <>
                    <div className="flex justify-between text-green-600"><span>Payé</span><span>{Number(detailDialog.amount_paid).toFixed(2)} DH</span></div>
                    <div className="flex justify-between font-bold"><span>Reste à payer</span><span>{(Number(detailDialog.total) - Number(detailDialog.amount_paid)).toFixed(2)} DH</span></div>
                  </>
                )}
              </div>
              {detailDialog.notes && <p className="text-muted-foreground italic">{detailDialog.notes}</p>}

              <div className="flex gap-2 flex-wrap">
                {detailDialog.status !== "paid" && !detailDialog.is_credit_note && (
                  <Button size="sm" variant="outline" onClick={() => { setDetailDialog(null); setPaymentDialog(detailDialog); setPaymentForm({ amount: String(Number(detailDialog.total) - Number(detailDialog.amount_paid)), method: detailDialog.payment_method }); }}>
                    <Banknote size={14} className="mr-1" /> Paiement
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => duplicateInvoice(detailDialog.id)}>
                  <Copy size={14} className="mr-1" /> Dupliquer
                </Button>
                {!detailDialog.is_credit_note && detailDialog.status === "paid" && (
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => createCreditNote(detailDialog.id)}>
                    <ReceiptText size={14} className="mr-1" /> Avoir
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
