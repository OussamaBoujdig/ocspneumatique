import { Wrench, CircleDot, Settings, ShoppingBag, RefreshCcw, Gauge } from "lucide-react";

const services = [
  { icon: Wrench, title: "Montage", desc: "Installation experte de vos nouveaux pneus tous types de véhicules avec précision." },
  { icon: CircleDot, title: "Équilibrage", desc: "Réglage électronique pour supprimer les vibrations et assurer une conduite fluide." },
  { icon: Settings, title: "Réparation", desc: "Réparation de crevaisons rapides et fiables selon les normes de sécurité." },
  { icon: ShoppingBag, title: "Vente de pneus", desc: "Large choix de pneus parmi les plus grandes marques mondiales." },
  { icon: RefreshCcw, title: "Permutation", desc: "Optimisez l'usure de vos gommes par une permutation saisonnière ou régulière." },
  { icon: Gauge, title: "Contrôle pression", desc: "Vérification et ajustement de la pression pour votre sécurité et économie d'énergie." },
];

const ServicesSection = () => (
  <section id="services" className="py-20 bg-background">
    <div className="container mx-auto px-4">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-heading text-foreground">
        Nos Services <span className="text-primary">Professionnels</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map((s) => (
          <div key={s.title} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all group">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <s.icon className="text-primary" size={24} />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{s.title}</h3>
            <p className="text-muted-foreground text-sm">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ServicesSection;
