import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, registerTenant } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CircleDot, Shield, BarChart3, Users, Zap } from "lucide-react";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "",
    tenant_name: "", tenant_slug: "", name: "", phone: "",
  });

  const handleSlug = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
    setForm((f) => ({ ...f, tenant_name: name, tenant_slug: slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const data = await login(form.email, form.password);
        setUser(data.user);
        toast.success(`Bienvenue, ${data.user.name}`);
      } else {
        if (!form.tenant_name || !form.name || !form.email || !form.password) {
          toast.error("Veuillez remplir tous les champs obligatoires");
          setLoading(false);
          return;
        }
        const data = await registerTenant({
          tenant_name: form.tenant_name,
          tenant_slug: form.tenant_slug,
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
        });
        setUser(data.user);
        toast.success(`Garage "${data.tenant.name}" créé avec succès !`);
      }
      navigate("/admin");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: CircleDot, text: "Gestion complète du stock pneus" },
    { icon: Users, text: "CRM clients & véhicules" },
    { icon: BarChart3, text: "Analytiques & rapports avancés" },
    { icon: Shield, text: "Multi-garage, rôles & permissions" },
    { icon: Zap, text: "Facturation & WhatsApp automatiques" },
  ];

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2">
            Tire<span className="text-white/80">Garage</span> OS
          </h1>
          <p className="text-white/70 text-lg">Plateforme SaaS de gestion de garage pneumatique</p>
        </div>
        <div className="relative z-10 space-y-6">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <f.icon size={20} className="text-white" />
              </div>
              <p className="text-white/90 text-sm font-medium">{f.text}</p>
            </div>
          ))}
        </div>
        <p className="relative z-10 text-white/50 text-sm">&copy; 2026 TireGarage OS. Tous droits réservés.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground">
              Tire<span className="text-primary">Garage</span> OS
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Gestion de garage pneumatique</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {mode === "login" ? "Connexion" : "Créer votre garage"}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === "login"
                ? "Accédez à votre tableau de bord"
                : "Démarrez en quelques secondes"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <Label>Nom du garage *</Label>
                  <Input
                    value={form.tenant_name}
                    onChange={(e) => handleSlug(e.target.value)}
                    placeholder="Mon Garage Pneus"
                    required
                  />
                  {form.tenant_slug && (
                    <p className="text-xs text-muted-foreground mt-1">
                      URL: tiregarage.app/<span className="font-mono text-primary">{form.tenant_slug}</span>
                    </p>
                  )}
                </div>
                <div>
                  <Label>Votre nom *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ahmed Benali"
                    required
                  />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+212600000000"
                  />
                </div>
              </>
            )}

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@mongarage.com"
                required
              />
            </div>
            <div>
              <Label>Mot de passe *</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading && <Loader2 className="animate-spin mr-2" size={16} />}
              {mode === "login" ? "Se connecter" : "Créer mon garage"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "login" ? (
              <>
                Pas encore de compte ?{" "}
                <button onClick={() => setMode("register")} className="text-primary font-medium hover:underline">
                  Créer un garage
                </button>
              </>
            ) : (
              <>
                Déjà un compte ?{" "}
                <button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">
                  Se connecter
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
