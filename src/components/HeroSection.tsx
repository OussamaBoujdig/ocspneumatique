import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-garage.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-start overflow-hidden">
      <img src={heroImage} alt="Garage automobile OCS Pneus" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-surface-dark/90 via-surface-dark/60 to-transparent" />
      <div className="container mx-auto px-4 relative z-10 pt-24">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-bold text-surface-dark-foreground leading-tight mb-6">
            Votre spécialiste des pneus et de{" "}
            <span className="text-primary">l'entretien automobile</span>
          </h1>
          <p className="text-surface-dark-foreground/70 text-lg mb-8 max-w-lg">
            Montage, équilibrage, réparation et vente de pneus pour tous types de véhicules. Service rapide et professionnel garanti.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="#rdv"><Button variant="hero" size="lg">Prendre rendez-vous</Button></a>
            <a href="#contact"><Button variant="heroOutline" size="lg">Nous contacter</Button></a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
