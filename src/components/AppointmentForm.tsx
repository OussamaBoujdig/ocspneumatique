import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { MapPin, Phone, Clock } from "lucide-react";

const serviceTypes = ["Montage", "Équilibrage", "Réparation", "Permutation", "Contrôle pression", "Autre"];
const timeSlots = ["08h00", "09h00", "10h00", "11h00", "14h00", "15h00", "16h00", "17h00"];

const AppointmentForm = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", vehicle_brand: "", vehicle_model: "",
    service_type: "Montage", preferred_date: "", preferred_time: "08h00", message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.phone || !form.preferred_date || !form.service_type) {
      toast.error("Veuillez remplir les champs obligatoires.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/appointments/public", form);
      toast.success("Rendez-vous confirmé ! Nous vous contacterons bientôt.");
      setForm({ full_name: "", phone: "", email: "", vehicle_brand: "", vehicle_model: "", service_type: "Montage", preferred_date: "", preferred_time: "08h00", message: "" });
    } catch {
      toast.error("Erreur lors de l'envoi. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all";
  const selectClass = inputClass;
  const labelClass = "text-sm font-medium text-foreground mb-1 block";

  return (
    <section id="rdv" className="py-20 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-heading text-foreground">
          Nous <span className="text-primary">trouver</span>
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-3">
              <MapPin className="text-primary mt-1 shrink-0" size={20} />
              <p className="text-foreground text-sm">123 Avenue de l'Automobile, 75000 Paris</p>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="text-primary mt-1 shrink-0" size={20} />
              <p className="text-foreground text-sm">01 23 45 67 89</p>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="text-primary mt-1 shrink-0" size={20} />
              <p className="text-foreground text-sm">Lun - Ven: 08h30 - 18h30 | Sam: 09h00 - 12h00</p>
            </div>
            <div className="bg-muted rounded-xl h-64 flex items-center justify-center mt-4 overflow-hidden">
              <iframe
                title="Localisation OCS Pneus"
                src="https://www.openstreetmap.org/export/embed.html?bbox=2.3,48.85,2.38,48.87&layer=mapnik"
                className="w-full h-full border-0"
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 md:p-8 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nom complet *</label>
                <input name="full_name" value={form.full_name} onChange={handleChange} className={inputClass} placeholder="Jean Dupont" required />
              </div>
              <div>
                <label className={labelClass}>Téléphone *</label>
                <input name="phone" value={form.phone} onChange={handleChange} className={inputClass} placeholder="06 12 34 56 78" required />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className={inputClass} placeholder="jean@email.com" />
            </div>
            <div>
              <label className={labelClass}>Type d'intervention *</label>
              <select name="service_type" value={form.service_type} onChange={handleChange} className={selectClass}>
                {serviceTypes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Marque véhicule</label>
                <input name="vehicle_brand" value={form.vehicle_brand} onChange={handleChange} className={inputClass} placeholder="ex: Peugeot" />
              </div>
              <div>
                <label className={labelClass}>Modèle véhicule</label>
                <input name="vehicle_model" value={form.vehicle_model} onChange={handleChange} className={inputClass} placeholder="ex: 308" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Date souhaitée *</label>
                <input name="preferred_date" type="date" value={form.preferred_date} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Heure souhaitée *</label>
                <select name="preferred_time" value={form.preferred_time} onChange={handleChange} className={selectClass}>
                  {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Message</label>
              <textarea name="message" value={form.message} onChange={handleChange} className={inputClass + " min-h-[80px] resize-none"} placeholder="Détails supplémentaires..." />
            </div>
            <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full mt-2">
              {loading ? "Envoi en cours..." : "Confirmer le rendez-vous"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default AppointmentForm;
