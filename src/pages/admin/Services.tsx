import { useEffect, useState } from "react";
import { api, type Service } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wrench, Plus, Pencil, Trash2, Loader2, Clock, DollarSign } from "lucide-react";

const categoryLabels: Record<string, string> = {
  montage: "Montage", equilibrage: "Équilibrage", reparation: "Réparation",
  permutation: "Permutation", controle: "Contrôle", geometrie: "Géométrie", autre: "Autre",
};

const emptyForm = { name: "", description: "", default_price: "", duration_minutes: "30", category: "autre", active: true };

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
    try { setServices(await api.get<Service[]>("/services")); } catch { toast.error("Erreur"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchServices(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name, description: s.description || "", default_price: String(s.default_price),
      duration_minutes: String(s.duration_minutes), category: s.category, active: !!s.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("Nom requis"); return; }
    setSaving(true);
    try {
      const payload = { ...form, default_price: Number(form.default_price) || 0, duration_minutes: Number(form.duration_minutes) || 30, active: form.active ? 1 : 0 };
      if (editing) { await api.put(`/services/${editing.id}`, payload); toast.success("Service mis à jour"); }
      else { await api.post("/services", payload); toast.success("Service créé"); }
      setDialogOpen(false);
      fetchServices();
    } catch { toast.error("Erreur"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce service ?")) return;
    try { await api.delete(`/services/${id}`); toast.success("Supprimé"); fetchServices(); } catch { toast.error("Erreur"); }
  };

  const selectClass = "w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary/50 outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Wrench size={24} className="text-primary" /> Services
          </h1>
          <p className="text-muted-foreground text-sm">{services.length} services</p>
        </div>
        <Button onClick={openNew}><Plus size={16} className="mr-1" /> Nouveau</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.id} className={`bg-card border border-border rounded-xl p-5 ${!s.active ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-accent text-foreground mb-2 inline-block">
                    {categoryLabels[s.category] || s.category}
                  </span>
                  <h3 className="font-semibold text-foreground">{s.name}</h3>
                  {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)} className="text-destructive hover:text-destructive"><Trash2 size={14} /></Button>
                </div>
              </div>
              <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><DollarSign size={14} />{Number(s.default_price).toFixed(2)} €</span>
                <span className="flex items-center gap-1"><Clock size={14} />{s.duration_minutes} min</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier le service" : "Nouveau service"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Montage pneus" /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>Catégorie</Label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={selectClass}>
                {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Prix par défaut (€)</Label><Input type="number" step="0.01" value={form.default_price} onChange={(e) => setForm({ ...form, default_price: e.target.value })} /></div>
              <div><Label>Durée (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="rounded" />
              <Label htmlFor="active">Actif</Label>
            </div>
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
