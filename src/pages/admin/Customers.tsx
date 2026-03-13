import { useEffect, useState } from "react";
import { api, type Customer } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, Search, Pencil, Trash2, Loader2, Phone, Mail, MapPin, Car, TrendingUp, Eye } from "lucide-react";

const emptyForm = { full_name: "", phone: "", email: "", address: "", city: "", notes: "", tags: "" };

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (sort) params.set("sort", sort);
      setCustomers(await api.get<Customer[]>(`/customers?${params}`));
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, [sort]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      full_name: c.full_name, phone: c.phone, email: c.email || "",
      address: c.address || "", city: c.city || "", notes: c.notes || "", tags: c.tags || "",
    });
    setDialogOpen(true);
  };

  const viewDetail = async (id: number) => {
    try {
      setDetailDialog(await api.get<Customer>(`/customers/${id}`));
    } catch { toast.error("Erreur"); }
  };

  const handleSave = async () => {
    if (!form.full_name || !form.phone) { toast.error("Nom et téléphone requis"); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/customers/${editing.id}`, form);
        toast.success("Client mis à jour");
      } else {
        await api.post("/customers", form);
        toast.success("Client créé");
      }
      setDialogOpen(false);
      fetchCustomers();
    } catch { toast.error("Erreur"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce client et toutes ses données ?")) return;
    try { await api.delete(`/customers/${id}`); toast.success("Client supprimé"); fetchCustomers(); } catch { toast.error("Erreur"); }
  };

  const selectClass = "px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary/50 outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Users size={24} className="text-primary" /> Clients
          </h1>
          <p className="text-muted-foreground text-sm">{customers.length} clients</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchCustomers()} className="pl-9 w-56" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectClass}>
            <option value="recent">Plus récents</option>
            <option value="name">Nom A-Z</option>
            <option value="spent">Plus dépensé</option>
          </select>
          <Button onClick={openNew}><Plus size={16} className="mr-1" /> Nouveau</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : customers.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Aucun client trouvé.</div>
      ) : (
        <div className="grid gap-3">
          {customers.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4 hover:shadow-sm transition-shadow">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {c.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{c.full_name}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Phone size={12} />{c.phone}</span>
                      {c.email && <span className="flex items-center gap-1"><Mail size={12} />{c.email}</span>}
                      {c.city && <span className="flex items-center gap-1"><MapPin size={12} />{c.city}</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="hidden sm:flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground"><Car size={14} /> {c.vehicle_count || 0}</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><TrendingUp size={14} /> {Number(c.total_spent).toFixed(0)} DH</span>
                  <span className="text-xs text-muted-foreground">{c.visit_count} visites</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => viewDetail(c.id)}><Eye size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="text-destructive hover:text-destructive"><Trash2 size={14} /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Fiche client</DialogTitle></DialogHeader>
          {detailDialog && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {detailDialog.full_name.charAt(0)}
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{detailDialog.full_name}</p>
                  <p className="text-sm text-muted-foreground">{detailDialog.phone} {detailDialog.email && `• ${detailDialog.email}`}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-accent/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{Number(detailDialog.total_spent).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">DH dépensé</p>
                </div>
                <div className="bg-accent/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{detailDialog.visit_count}</p>
                  <p className="text-xs text-muted-foreground">Visites</p>
                </div>
                <div className="bg-accent/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{detailDialog.vehicles?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Véhicules</p>
                </div>
              </div>
              {detailDialog.vehicles && detailDialog.vehicles.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Véhicules</h4>
                  {detailDialog.vehicles.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <Car size={16} className="text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{v.brand} {v.model} {v.year || ""}</p>
                        <p className="text-xs text-muted-foreground">{v.license_plate} {v.tire_size && `• ${v.tire_size}`}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {detailDialog.address && <p className="text-sm text-muted-foreground"><MapPin size={14} className="inline mr-1" />{detailDialog.address} {detailDialog.city}</p>}
              {detailDialog.notes && <p className="text-sm text-muted-foreground italic">{detailDialog.notes}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier le client" : "Nouveau client"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Nom complet *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Mohammed Alaoui" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Téléphone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+212600000000" /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Casablanca" /></div>
            </div>
            <div><Label>Tags</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="vip, fidèle" /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              {editing ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
