import { Star } from "lucide-react";

const testimonials = [
  { name: "Jean Dupont", text: "Service exceptionnel et très rapide. Les prix sont imbattables et l'accueil est au top !", rating: 5 },
  { name: "Marie Morel", text: "Je suis venu pour un montage de pneus hiver. Le technicien a été de bon conseil et très pro.", rating: 5 },
  { name: "Stéphane L.", text: "Une équipe réactive. Pneus commandés et posés en moins de 2h. Parfait !", rating: 5 },
];

const TestimonialsSection = () => (
  <section className="py-20 bg-background">
    <div className="container mx-auto px-4">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-heading text-foreground">
        Ils nous font <span className="text-primary">confiance</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t) => (
          <div key={t.name} className="bg-card border border-border rounded-xl p-6">
            <div className="flex gap-1 mb-3">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="text-primary fill-primary" size={16} />
              ))}
            </div>
            <p className="text-muted-foreground text-sm mb-4">"{t.text}"</p>
            <p className="font-semibold text-foreground text-sm">{t.name}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
