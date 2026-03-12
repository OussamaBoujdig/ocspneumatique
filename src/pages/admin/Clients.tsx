import { useEffect, useState } from "react";
import { api, type Client } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, Search, Pencil, Trash2, Loader2, Phone, Mail, MapPin } from "lucide-react";

const emptyForm = { full_name: "", phone: "", email: "", address: "", notes: "" };

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      setClients(await api.get<Client[]>(`/clients${params}`));
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({ full_name: c.full_name, phone: c.phone, email: c.email || "", address: c.address || "", notes: c.notes || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.phone) { toast.error("Nom et téléphone requis"); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/clients/${editing.id}`, form);
        toast.success("Client mis à jour");
      } else {
        await api.post("/clients", form);
        toast.success("Client créé");
      }
      setDialogOpen(false);
      fetchClients();
    } catch {
      toast.error("Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce client et toutes ses données ?")) return;
    try {
      await api.delete(`/clients/${id}`);
      toast.success("Client supprimé");
      fetchClients();
    } catch {
      toast.error("Erreur de suppression");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Users size={24} className="text-primary" /> Clients
          </h1>
          <p className="text-muted-foreground text-sm">{clients.length} clients</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchClients()}
              className="pl-9 w-64"
            />
          </div>
          <Button onClick={openNew}><Plus size={16} className="mr-1" /> Nouveau</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Aucun client trouvé.</div>
      ) : (
        <div className="grid gap-3">
          {clients.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4 hover:shadow-sm transition-shadow">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{c.full_name}</p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><Phone size={14} />{c.phone}</span>
                  {c.email && <span className="flex items-center gap-1"><Mail size={14} />{c.email}</span>}
                  {c.address && <span className="flex items-center gap-1"><MapPin size={14} />{c.address}</span>}
                </div>
                {c.notes && <p className="text-xs text-muted-foreground mt-1 italic">{c.notes}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="text-destructive hover:text-destructive"><Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le client" : "Nouveau client"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nom complet *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jean Dupont" />
            </div>
            <div>
              <Label>Téléphone *</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="06 12 34 56 78" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jean@email.com" />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 rue..." />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes internes..." />
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
