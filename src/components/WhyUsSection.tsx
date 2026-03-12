import { CheckCircle } from "lucide-react";
import tireImage from "@/assets/tire-product.png";

const points = [
  { title: "Équipement Professionnel", desc: "Dernières technologies pour un entretien précis." },
  { title: "Service Rapide", desc: "Prise en charge efficace pour vous remettre sur la route." },
  { title: "Prix Compétitifs", desc: "Le meilleur rapport qualité/prix de la région." },
];

const WhyUsSection = () => (
  <section id="pourquoi" className="py-20 bg-secondary">
    <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
      <div className="flex-1">
        <img src={tireImage} alt="Pneu premium" className="max-w-sm mx-auto" />
      </div>
      <div className="flex-1">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 font-heading text-foreground">
          Pourquoi choisir <span className="text-primary">OCS Pneus</span> ?
        </h2>
        <div className="flex flex-col gap-6">
          {points.map((p) => (
            <div key={p.title} className="flex items-start gap-4">
              <CheckCircle className="text-primary mt-1 shrink-0" size={22} />
              <div>
                <h4 className="font-semibold text-foreground">{p.title}</h4>
                <p className="text-muted-foreground text-sm">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default WhyUsSection;
