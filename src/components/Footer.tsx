const Footer = () => (
  <footer className="bg-surface-dark py-12">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-heading text-xl font-bold text-surface-dark-foreground mb-3">
            OCS<span className="text-primary">PNEUS</span>
          </h3>
          <p className="text-surface-dark-foreground/60 text-sm">
            Votre partenaire de confiance pour tous vos besoins pneumatiques et entretien automobile.
          </p>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-surface-dark-foreground mb-3">Liens rapides</h4>
          <ul className="flex flex-col gap-2 text-sm text-surface-dark-foreground/60">
            <li><a href="#" className="hover:text-primary transition-colors">Accueil</a></li>
            <li><a href="#services" className="hover:text-primary transition-colors">Services</a></li>
            <li><a href="#contact" className="hover:text-primary transition-colors">Contact</a></li>
            <li><a href="#rdv" className="hover:text-primary transition-colors">Prendre RDV</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-surface-dark-foreground mb-3">Suivez-nous</h4>
          <p className="text-surface-dark-foreground/60 text-sm">Facebook · Instagram</p>
        </div>
      </div>
      <div className="border-t border-surface-dark-foreground/10 mt-8 pt-6 text-center">
        <p className="text-surface-dark-foreground/40 text-xs">© 2025 OCS Pneus. Tous droits réservés.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
