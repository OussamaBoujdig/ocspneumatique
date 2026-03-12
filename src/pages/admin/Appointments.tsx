import { useEffect, useState } from "react";
import { api, type Appointment } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CalendarDays, Clock, Phone, User, Car, Wrench, CheckCircle, XCircle, Loader2, Search, Play, Trash2, MessageCircle, Bell, ClipboardList } from "lucide-react";
import { sendAppointmentConfirmWhatsApp, sendAppointmentReminderWhatsApp } from "@/lib/whatsapp";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  all: "Tous",
  pending: "En attente",
  confirmed: "Confirmés",
  in_progress: "En cours",
  completed: "Terminés",
  cancelled: "Annulés",
};

export default function Appointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (search) params.set("search", search);
      const data = await api.get<Appointment[]>(`/appointments?${params}`);
      setAppointments(data);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [filter]);

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/appointments/${id}`, { status });
      toast.success(`Statut mis à jour: ${statusLabels[status] || status}`);

      if (status === "confirmed") {
        try {
          await sendAppointmentConfirmWhatsApp(id);
          toast.success("Confirmation WhatsApp envoyée au client");
        } catch { /* client may not have phone */ }
      }

      fetch();
    } catch {
      toast.error("Erreur de mise à jour");
    }
  };

  const sendReminder = async (id: number) => {
    try {
      await sendAppointmentReminderWhatsApp(id);
      toast.success("Rappel WhatsApp ouvert");
    } catch {
      toast.error("Impossible d'envoyer le rappel");
    }
  };

  const convertToWorkOrder = async (id: number) => {
    try {
      await api.post(`/work-orders/from-appointment/${id}`, {});
      toast.success("Ordre de travail créé à partir du rendez-vous");
      fetch();
      navigate("/admin/work-orders");
    } catch {
      toast.error("Erreur de conversion");
    }
  };

  const deleteAppointment = async (id: number) => {
    if (!confirm("Supprimer ce rendez-vous ?")) return;
    try {
      await api.delete(`/appointments/${id}`);
      toast.success("Rendez-vous supprimé");
      fetch();
    } catch {
      toast.error("Erreur de suppression");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Rendez-vous</h1>
          <p className="text-muted-foreground text-sm">{appointments.length} rendez-vous</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetch()}
              className="pl-9 w-64"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(statusLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:border-primary/30"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Aucun rendez-vous trouvé.</div>
      ) : (
        <div className="grid gap-4">
          {appointments.map((a) => (
            <div key={a.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-primary" />
                    <span className="font-semibold text-foreground">{a.full_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[a.status] || "bg-muted text-muted-foreground"}`}>
                      {statusLabels[a.status] || a.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone size={14} />{a.phone}</span>
                    <span className="flex items-center gap-1"><CalendarDays size={14} />{a.preferred_date}</span>
                    <span className="flex items-center gap-1"><Clock size={14} />{a.preferred_time}</span>
                    <span className="flex items-center gap-1"><Wrench size={14} />{a.service_type}</span>
                    {a.vehicle_brand && <span className="flex items-center gap-1"><Car size={14} />{a.vehicle_brand} {a.vehicle_model}</span>}
                  </div>
                  {a.message && <p className="text-sm text-muted-foreground mt-1 italic">"{a.message}"</p>}
                  {a.email && <p className="text-xs text-muted-foreground">{a.email}</p>}
                </div>
                <div className="flex gap-2">
                  {a.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(a.id, "confirmed")}>
                        <CheckCircle size={14} className="mr-1" /> Confirmer
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, "cancelled")}>
                        <XCircle size={14} className="mr-1" /> Annuler
                      </Button>
                    </>
                  )}
                  {a.status === "confirmed" && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(a.id, "in_progress")}>
                        <Play size={14} className="mr-1" /> Démarrer
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => convertToWorkOrder(a.id)} title="Créer un ordre de travail">
                        <ClipboardList size={14} className="mr-1" /> Ordre
                      </Button>
                    </>
                  )}
                  {a.status === "in_progress" && (
                    <Button size="sm" onClick={() => updateStatus(a.id, "completed")}>
                      <CheckCircle size={14} className="mr-1" /> Terminé
                    </Button>
                  )}
                  {(a.status === "confirmed" || a.status === "pending") && (
                    <Button size="sm" variant="ghost" onClick={() => sendReminder(a.id)} className="text-green-600 hover:text-green-700" title="Rappel WhatsApp">
                      <Bell size={14} />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => deleteAppointment(a.id)} className="text-destructive hover:text-destructive">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
