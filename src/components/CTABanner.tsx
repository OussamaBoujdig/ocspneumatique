import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

const CTABanner = () => (
  <section className="bg-primary py-12">
    <div className="container mx-auto px-4 text-center">
      <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground font-heading mb-4">
        Besoin de pneus ou d'une réparation rapide ?
      </h2>
      <a href="tel:0123456789">
        <Button variant="heroOutline" size="lg" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
          <Phone size={18} /> Appelez maintenant
        </Button>
      </a>
    </div>
  </section>
);

export default CTABanner;
