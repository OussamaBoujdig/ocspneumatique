import { useEffect, useState } from "react";
import { api, type Tire, type TireBrand } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CircleDot, Plus, Search, Pencil, Trash2, Loader2, AlertTriangle, Camera, Barcode } from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner";

const typeLabels: Record<string, string> = { summer: "Été", winter: "Hiver", all_season: "4 Saisons", sport: "Sport" };
const emptyForm = { brand_id: "", model: "", size: "", type: "all_season", price: "", cost: "", stock_qty: "", min_stock: "2", location: "", notes: "", barcode: "", dot_code: "" };

export default function Tires() {
  const [tires, setTires] = useState<Tire[]>([]);
  const [brands, setBrands] = useState<TireBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tire | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMode, setScanMode] = useState<"search" | "add">("search");
  const [scannedProduct, setScannedProduct] = useState<Tire | null>(null);
  const [scannedDialogOpen, setScannedDialogOpen] = useState(false);

  const fetchTires = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      if (lowStockOnly) params.set("low_stock", "true");
      setTires(await api.get<Tire[]>(`/tires?${params}`));
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTires();
    api.get<TireBrand[]>("/tires/brands").then(setBrands).catch(() => {});
  }, [typeFilter, lowStockOnly]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (t: Tire) => {
    setEditing(t);
    setForm({
      brand_id: t.brand_id ? String(t.brand_id) : "",
      model: t.model, size: t.size, type: t.type,
      price: String(t.price), cost: String(t.cost),
      stock_qty: String(t.stock_qty), min_stock: String(t.min_stock),
      location: t.location || "", notes: t.notes || "",
      barcode: t.barcode || "", dot_code: t.dot_code || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.model || !form.size) { toast.error("Modèle et taille requis"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        brand_id: form.brand_id ? Number(form.brand_id) : null,
        price: Number(form.price) || 0,
        cost: Number(form.cost) || 0,
        stock_qty: Number(form.stock_qty) || 0,
        min_stock: Number(form.min_stock) || 2,
      };
      if (editing) {
        await api.put(`/tires/${editing.id}`, payload);
        toast.success("Pneu mis à jour");
      } else {
        await api.post("/tires", payload);
        toast.success("Pneu créé");
      }
      setDialogOpen(false);
      fetchTires();
    } catch {
      toast.error("Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce pneu ?")) return;
    try { await api.delete(`/tires/${id}`); toast.success("Supprimé"); fetchTires(); } catch { toast.error("Erreur"); }
  };

  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);

    if (scanMode === "search") {
      try {
        const tire = await api.get<Tire>(`/tires/barcode/${encodeURIComponent(code)}`);
        setScannedProduct(tire);
        setScannedDialogOpen(true);
        toast.success(`Produit trouvé: ${tire.brand_name || ""} ${tire.model}`);
      } catch {
        toast.info(`Code-barres "${code}" non trouvé. Voulez-vous l'ajouter ?`);
        setEditing(null);
        setForm({ ...emptyForm, barcode: code });
        setDialogOpen(true);
      }
    } else {
      setEditing(null);
      setForm({ ...emptyForm, barcode: code });
      setDialogOpen(true);
      toast.info(`Code-barres scanné: ${code}`);
    }
  };

  const openScanSearch = () => { setScanMode("search"); setScannerOpen(true); };
  const openScanAdd = () => { setScanMode("add"); setScannerOpen(true); };

  const selectClass = "w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary/50 outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <CircleDot size={24} className="text-primary" /> Pneus & Stock
          </h1>
          <p className="text-muted-foreground text-sm">{tires.length} références</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchTires()} className="pl-9 w-56" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background text-sm">
            <option value="">Tous types</option>
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-2 rounded-md text-sm border transition-colors flex items-center gap-1 ${lowStockOnly ? "bg-red-500/10 border-red-500/30 text-red-600" : "border-input text-muted-foreground"}`}
          >
            <AlertTriangle size={14} /> Stock bas
          </button>
          <Button variant="outline" onClick={openScanSearch} className="gap-1">
            <Camera size={16} /> Scanner
          </Button>
          <Button onClick={openScanAdd} variant="secondary" className="gap-1">
            <Barcode size={16} /> Scan + Ajouter
          </Button>
          <Button onClick={openNew}><Plus size={16} className="mr-1" /> Nouveau</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : tires.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Aucun pneu trouvé.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 px-4 font-medium text-muted-foreground">Marque</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Modèle</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Taille</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Type</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Code-barres</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Prix</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Stock</th>
                <th className="py-3 px-4 font-medium text-muted-foreground">Emplacement</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {tires.map((t) => (
                <tr key={t.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">{t.brand_name || "—"}</td>
                  <td className="py-3 px-4 text-foreground">{t.model}</td>
                  <td className="py-3 px-4 text-muted-foreground font-mono">{t.size}</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full text-xs bg-accent text-foreground">{typeLabels[t.type] || t.type}</span></td>
                  <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{t.barcode || "—"}</td>
                  <td className="py-3 px-4 text-foreground">{Number(t.price).toFixed(2)} DH</td>
                  <td className="py-3 px-4">
                    <span className={`font-medium ${t.stock_qty <= t.min_stock ? "text-red-500" : "text-green-600"}`}>
                      {t.stock_qty}
                    </span>
                    {t.stock_qty <= t.min_stock && <AlertTriangle size={14} className="inline ml-1 text-red-500" />}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{t.location || "—"}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)} className="text-destructive hover:text-destructive"><Trash2 size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Scanned product detail */}
      <Dialog open={scannedDialogOpen} onOpenChange={setScannedDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Produit scanné</DialogTitle></DialogHeader>
          {scannedProduct && (
            <div className="space-y-3 mt-2">
              <div className="bg-accent/50 rounded-lg p-4 space-y-2">
                <p className="text-lg font-bold text-foreground">{scannedProduct.brand_name || ""} {scannedProduct.model}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-muted-foreground">Taille:</span> {scannedProduct.size}</p>
                  <p><span className="text-muted-foreground">Type:</span> {typeLabels[scannedProduct.type]}</p>
                  <p><span className="text-muted-foreground">Prix:</span> {Number(scannedProduct.price).toFixed(2)} DH</p>
                  <p><span className="text-muted-foreground">Stock:</span> <span className={scannedProduct.stock_qty <= scannedProduct.min_stock ? "text-red-500 font-bold" : "text-green-600 font-bold"}>{scannedProduct.stock_qty}</span></p>
                  <p><span className="text-muted-foreground">Code-barres:</span> <span className="font-mono text-xs">{scannedProduct.barcode}</span></p>
                  {scannedProduct.dot_code && <p><span className="text-muted-foreground">DOT:</span> {scannedProduct.dot_code}</p>}
                  {scannedProduct.location && <p><span className="text-muted-foreground">Emplacement:</span> {scannedProduct.location}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => { setScannedDialogOpen(false); openEdit(scannedProduct); }}>
                  <Pencil size={14} className="mr-1" /> Modifier
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setScannedDialogOpen(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le pneu" : "Nouveau pneu"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code-barres</Label>
                <div className="flex gap-1">
                  <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="EAN / UPC" className="font-mono" />
                  <Button type="button" size="sm" variant="outline" onClick={() => { setScanMode("add"); setScannerOpen(true); }}>
                    <Camera size={14} />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Code DOT</Label>
                <Input value={form.dot_code} onChange={(e) => setForm({ ...form, dot_code: e.target.value })} placeholder="2024" />
              </div>
            </div>
            <div>
              <Label>Marque</Label>
              <select value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })} className={selectClass}>
                <option value="">Sélectionner...</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Modèle *</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Primacy 4" /></div>
              <div><Label>Taille *</Label><Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="205/55R16" /></div>
            </div>
            <div>
              <Label>Type</Label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={selectClass}>
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Prix vente (DH)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div><Label>Coût achat (DH)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Stock</Label><Input type="number" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} /></div>
              <div><Label>Stock min.</Label><Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></div>
              <div><Label>Emplacement</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="A3-R2" /></div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              {editing ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {scannerOpen && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
}
