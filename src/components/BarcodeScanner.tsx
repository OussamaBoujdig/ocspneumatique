import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCam, setActiveCam] = useState(0);
  const containerId = "barcode-reader";

  const startScanner = async (cameraIndex: number) => {
    try {
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
      }

      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      const devices = await Html5Qrcode.getCameras();
      if (devices.length === 0) {
        setError("Aucune caméra détectée");
        return;
      }
      setCameras(devices);

      const idx = cameraIndex < devices.length ? cameraIndex : 0;
      await scanner.start(
        devices[idx].id,
        {
          fps: 10,
          qrbox: { width: 300, height: 150 },
          aspectRatio: 1.777,
        },
        (decodedText) => {
          onScan(decodedText);
          scanner.stop().catch(() => {});
        },
        () => {}
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes("NotAllowed")
        ? "Accès caméra refusé. Veuillez autoriser l'accès."
        : `Erreur caméra: ${msg}`);
    }
  };

  useEffect(() => {
    startScanner(activeCam);
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const switchCamera = () => {
    const next = (activeCam + 1) % cameras.length;
    setActiveCam(next);
    startScanner(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Camera size={20} className="text-primary" />
            <h3 className="font-semibold text-foreground">Scanner code-barres</h3>
          </div>
          <div className="flex gap-2">
            {cameras.length > 1 && (
              <Button size="sm" variant="ghost" onClick={switchCamera}>
                <SwitchCamera size={16} />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X size={16} />
            </Button>
          </div>
        </div>

        <div className="p-4">
          {error ? (
            <div className="text-center py-10">
              <p className="text-destructive text-sm mb-4">{error}</p>
              <Button variant="outline" onClick={() => { setError(""); startScanner(activeCam); }}>
                Réessayer
              </Button>
            </div>
          ) : (
            <div id={containerId} className="rounded-lg overflow-hidden" />
          )}
          <p className="text-xs text-muted-foreground text-center mt-3">
            Placez le code-barres du pneu devant la caméra
          </p>
        </div>
      </div>
    </div>
  );
}
