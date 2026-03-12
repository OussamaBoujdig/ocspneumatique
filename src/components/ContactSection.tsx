import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";

const ContactSection = () => (
  <section id="contact" className="py-20 bg-background">
    <div className="container mx-auto px-4">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 font-heading text-foreground">
        Nous <span className="text-primary">Contacter</span>
      </h2>
      <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
        Une question ? Besoin d'un devis ? N'hésitez pas à nous joindre par téléphone ou à passer directement au garage.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-card border border-border rounded-xl p-6 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="text-primary" size={22} />
          </div>
          <h3 className="font-heading font-semibold text-foreground">Téléphone</h3>
          <a href="tel:0123456789" className="text-muted-foreground text-sm hover:text-primary transition-colors">
            01 23 45 67 89
          </a>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="text-primary" size={22} />
          </div>
          <h3 className="font-heading font-semibold text-foreground">Email</h3>
          <a href="mailto:contact@ocspneus.fr" className="text-muted-foreground text-sm hover:text-primary transition-colors">
            contact@ocspneus.fr
          </a>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="text-primary" size={22} />
          </div>
          <h3 className="font-heading font-semibold text-foreground">Adresse</h3>
          <p className="text-muted-foreground text-sm">123 Avenue de l'Automobile, 75000 Paris</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="text-primary" size={22} />
          </div>
          <h3 className="font-heading font-semibold text-foreground">Horaires</h3>
          <p className="text-muted-foreground text-sm">Lun-Ven: 08h30-18h30</p>
          <p className="text-muted-foreground text-sm">Sam: 09h00-12h00</p>
        </div>
      </div>

      {/* Call to action */}
      <div className="bg-surface-dark rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-bold font-heading text-surface-dark-foreground mb-2">
            Appelez-nous maintenant
          </h3>
          <p className="text-surface-dark-foreground/70 text-sm">
            Notre équipe est disponible pour répondre à toutes vos questions et vous conseiller.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <a href="tel:0123456789">
            <Button variant="hero" size="lg" className="gap-2">
              <Phone size={18} /> 01 23 45 67 89
            </Button>
          </a>
          <a href="https://wa.me/33123456789" target="_blank" rel="noopener noreferrer">
            <Button variant="heroOutline" size="lg" className="gap-2 border-surface-dark-foreground/30 text-surface-dark-foreground hover:bg-surface-dark-foreground/10">
              <MessageCircle size={18} /> WhatsApp
            </Button>
          </a>
        </div>
      </div>
    </div>
  </section>
);

export default ContactSection;
