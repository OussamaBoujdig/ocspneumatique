import { useState } from "react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-dark/95 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between py-4 px-4">
        <a href="#" className="font-heading text-2xl font-bold text-surface-dark-foreground">
          OCS<span className="text-primary">PNEUS</span>
        </a>
        <div className="hidden md:flex items-center gap-6">
          <a href="#services" className="text-surface-dark-foreground/80 hover:text-primary transition-colors text-sm font-medium">Services</a>
          <a href="#pourquoi" className="text-surface-dark-foreground/80 hover:text-primary transition-colors text-sm font-medium">Pourquoi nous?</a>
          <a href="#contact" className="text-surface-dark-foreground/80 hover:text-primary transition-colors text-sm font-medium">Contact</a>
          <a href="#rdv">
            <Button variant="hero" size="sm">Prendre RDV</Button>
          </a>
          <ThemeToggle />
        </div>
        <button className="md:hidden text-surface-dark-foreground" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-surface-dark border-t border-border/20 px-4 pb-4 flex flex-col gap-3">
          <a href="#services" className="text-surface-dark-foreground/80 py-2" onClick={() => setOpen(false)}>Services</a>
          <a href="#pourquoi" className="text-surface-dark-foreground/80 py-2" onClick={() => setOpen(false)}>Pourquoi nous?</a>
          <a href="#contact" className="text-surface-dark-foreground/80 py-2" onClick={() => setOpen(false)}>Contact</a>
          <a href="#rdv" onClick={() => setOpen(false)}>
            <Button variant="hero" size="sm" className="w-full">Prendre RDV</Button>
          </a>
          <div className="flex items-center justify-between rounded-md border border-border/20 px-3 py-2">
            <span className="text-surface-dark-foreground/80 text-sm">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
