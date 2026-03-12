import { Shield, Award, Zap } from "lucide-react";

const features = [
  { icon: Shield, title: "Sécurité Garantie", desc: "Contrôles rigoureux sur chaque intervention." },
  { icon: Award, title: "Qualité Premium", desc: "Pneus et pièces certifiés constructeurs." },
  { icon: Zap, title: "Rapidité d'exécution", desc: "Interventions express sans compromis." },
];

const FeaturesBar = () => (
  <section className="bg-background py-12 border-b border-border">
    <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
      {features.map((f) => (
        <div key={f.title} className="flex items-start gap-4">
          <div className="bg-primary/10 p-3 rounded-lg">
            <f.icon className="text-primary" size={24} />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground">{f.title}</h3>
            <p className="text-muted-foreground text-sm">{f.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default FeaturesBar;
