import { useEffect, useState } from "react";
import { api, type Employee } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserCog, Plus, Loader2, Pencil, Trash2, Eye, CheckCircle, XCircle, TrendingUp, ClipboardList } from "lucide-react";

const emptyForm = { name: "", phone: "", role_title: "", specialization: "", hourly_rate: "", hire_date: "", notes: "" };

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState<Employee | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = showInactive ? "" : "?active=true";
      setEmployees(await api.get<Employee[]>(`/employees${params}`));
    } catch { toast.error("Erreur"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchEmployees(); }, [showInactive]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setForm({
      name: e.name, phone: e.phone || "", role_title: e.role_title || "",
      specialization: e.specialization || "", hourly_rate: String(e.hourly_rate || ""),
      hire_date: e.hire_date || "", notes: e.notes || "",
    });
    setDialogOpen(true);
  };

  const viewDetail = async (id: number) => {
    try { setDetailDialog(await api.get<Employee>(`/employees/${id}`)); } catch { toast.error("Erreur"); }
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("Nom requis"); return; }
    setSaving(true);
    try {
      const payload = { ...form, hourly_rate: Number(form.hourly_rate) || 0 };
      if (editing) {
        await api.put(`/employees/${editing.id}`, payload);
        toast.success("Employé mis à jour");
      } else {
        await api.post("/employees", payload);
        toast.success("Employé ajouté");
      }
      setDialogOpen(false);
      fetchEmployees();
    } catch { toast.error("Erreur"); } finally { setSaving(false); }
  };

  const deactivate = async (id: number) => {
    if (!confirm("Désactiver cet employé ?")) return;
    try { await api.delete(`/employees/${id}`); toast.success("Employé désactivé"); fetchEmployees(); } catch { toast.error("Erreur"); }
  };

  const roleColors: Record<string, string> = {
    Owner: "bg-purple-100 text-purple-800",
    Manager: "bg-blue-100 text-blue-800",
    Technician: "bg-green-100 text-green-800",
    Receptionist: "bg-amber-100 text-amber-800",
  };

  const selectClass = "w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary/50 outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <UserCog size={24} className="text-primary" /> Employés
          </h1>
          <p className="text-muted-foreground text-sm">{employees.length} employés</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`px-3 py-2 rounded-md text-sm border transition-colors ${showInactive ? "bg-accent border-primary/30 text-foreground" : "border-input text-muted-foreground"}`}
          >
            {showInactive ? "Tous" : "Actifs uniquement"}
          </button>
          <Button onClick={openNew}><Plus size={16} className="mr-1" /> Nouveau</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : employees.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Aucun employé trouvé.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((e) => (
            <div key={e.id} className={`bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow ${!e.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {e.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{e.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[e.role_title || ""] || "bg-gray-100 text-gray-700"}`}>
                      {e.role_title || "—"}
                    </span>
                  </div>
                </div>
                {e.is_active ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
              </div>
              {e.specialization && <p className="text-xs text-muted-foreground mb-2">{e.specialization}</p>}
              {e.phone && <p className="text-sm text-muted-foreground">{e.phone}</p>}
              <div className="flex gap-1 mt-3 pt-3 border-t border-border">
                <Button size="sm" variant="ghost" onClick={() => viewDetail(e.id)}><Eye size={14} /></Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil size={14} /></Button>
                {e.is_active && (
                  <Button size="sm" variant="ghost" onClick={() => deactivate(e.id)} className="text-destructive hover:text-destructive"><Trash2 size={14} /></Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Fiche employé</DialogTitle></DialogHeader>
          {detailDialog && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {detailDialog.name.charAt(0)}
                </div>
                <div>
                  <p className="text-lg font-bold">{detailDialog.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[detailDialog.role_title || ""] || "bg-gray-100 text-gray-700"}`}>
                    {detailDialog.role_title}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-accent/50 rounded-lg p-3 text-center">
                  <ClipboardList size={18} className="mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold">{detailDialog.completed_orders || 0}</p>
                  <p className="text-xs text-muted-foreground">Ordres terminés</p>
                </div>
                <div className="bg-accent/50 rounded-lg p-3 text-center">
                  <TrendingUp size={18} className="mx-auto text-green-500 mb-1" />
                  <p className="text-2xl font-bold">{Number(detailDialog.revenue_generated || 0).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">DH générés</p>
                </div>
              </div>
              <div className="text-sm space-y-1">
                {detailDialog.phone && <p><span className="text-muted-foreground">Tél:</span> {detailDialog.phone}</p>}
                {detailDialog.specialization && <p><span className="text-muted-foreground">Spécialisation:</span> {detailDialog.specialization}</p>}
                {detailDialog.hourly_rate > 0 && <p><span className="text-muted-foreground">Taux horaire:</span> {detailDialog.hourly_rate} DH/h</p>}
                {detailDialog.hire_date && <p><span className="text-muted-foreground">Embauché le:</span> {detailDialog.hire_date}</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier l'employé" : "Nouvel employé"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ahmed Benali" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div>
                <Label>Poste</Label>
                <select value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} className={selectClass}>
                  <option value="">Sélectionner...</option>
                  <option value="Owner">Propriétaire</option>
                  <option value="Manager">Manager</option>
                  <option value="Technician">Technicien</option>
                  <option value="Receptionist">Réceptionniste</option>
                </select>
              </div>
            </div>
            <div><Label>Spécialisation</Label><Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Montage & Équilibrage" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Taux horaire (DH)</Label><Input type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} /></div>
              <div><Label>Date d'embauche</Label><Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              {editing ? "Mettre à jour" : "Ajouter"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
