import { useEffect, useState } from "react";
import { api, type Vehicle, type Client } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Car, Plus, Search, Pencil, Trash2, Loader2, User } from "lucide-react";

const emptyForm = { client_id: "", brand: "", model: "", year: "", license_plate: "", vin: "", mileage: "", notes: "" };

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      setVehicles(await api.get<Vehicle[]>(`/vehicles${params}`));
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try { setClients(await api.get<Client[]>("/clients")); } catch {}
  };

  useEffect(() => { fetchVehicles(); fetchClients(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    setForm({
      client_id: String(v.client_id),
      brand: v.brand,
      model: v.model,
      year: v.year ? String(v.year) : "",
      license_plate: v.license_plate || "",
      vin: v.vin || "",
      mileage: v.mileage ? String(v.mileage) : "",
      notes: v.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.client_id || !form.brand || !form.model) { toast.error("Client, marque et modèle requis"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        client_id: Number(form.client_id),
        year: form.year ? Number(form.year) : null,
        mileage: form.mileage ? Number(form.mileage) : null,
      };
      if (editing) {
        await api.put(`/vehicles/${editing.id}`, payload);
        toast.success("Véhicule mis à jour");
      } else {
        await api.post("/vehicles", payload);
        toast.success("Véhicule créé");
      }
      setDialogOpen(false);
      fetchVehicles();
    } catch {
      toast.error("Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce véhicule ?")) return;
    try {
      await api.delete(`/vehicles/${id}`);
      toast.success("Véhicule supprimé");
      fetchVehicles();
    } catch {
      toast.error("Erreur");
    }
  };

  const selectClass = "w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary/50 outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Car size={24} className="text-primary" /> Véhicules
          </h1>
          <p className="text-muted-foreground text-sm">{vehicles.length} véhicules</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchVehicles()} className="pl-9 w-64" />
          </div>
          <Button onClick={openNew}><Plus size={16} className="mr-1" /> Nouveau</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Aucun véhicule trouvé.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 px-4 font-medium text-muted-foreground">Véhicule</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Client</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Immatriculation</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Année</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Kilométrage</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">{v.brand} {v.model}</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    <span className="flex items-center gap-1"><User size={14} />{v.client_name}</span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{v.license_plate || "—"}</td>
                  <td className="py-3 px-4 text-muted-foreground">{v.year || "—"}</td>
                  <td className="py-3 px-4 text-muted-foreground">{v.mileage ? `${v.mileage.toLocaleString()} km` : "—"}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(v)}><Pencil size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(v.id)} className="text-destructive hover:text-destructive"><Trash2 size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le véhicule" : "Nouveau véhicule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Client *</Label>
              <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className={selectClass}>
                <option value="">Sélectionner un client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Marque *</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Peugeot" />
              </div>
              <div>
                <Label>Modèle *</Label>
                <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="308" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Année</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2024" />
              </div>
              <div>
                <Label>Immatriculation</Label>
                <Input value={form.license_plate} onChange={(e) => setForm({ ...form, license_plate: e.target.value })} placeholder="AB-123-CD" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>VIN</Label>
                <Input value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} placeholder="Optionnel" />
              </div>
              <div>
                <Label>Kilométrage</Label>
                <Input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} placeholder="50000" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." />
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
