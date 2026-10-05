import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { RotateCcw, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

async function cropToFile(src: string, area: Area, rotation: number): Promise<File> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bw = img.width * cos + img.height * sin;
  const bh = img.width * sin + img.height * cos;
  const rotated = document.createElement("canvas");
  rotated.width = bw;
  rotated.height = bh;
  const rc = rotated.getContext("2d")!;
  rc.translate(bw / 2, bh / 2);
  rc.rotate(rad);
  rc.drawImage(img, -img.width / 2, -img.height / 2);
  const out = document.createElement("canvas");
  const scale = Math.min(1, 1600 / Math.max(area.width, area.height));
  out.width = Math.round(area.width * scale);
  out.height = Math.round(area.height * scale);
  out
    .getContext("2d")!
    .drawImage(rotated, area.x, area.y, area.width, area.height, 0, 0, out.width, out.height);
  const blob = await new Promise<Blob>((res) => out.toBlob((b) => res(b!), "image/jpeg", 0.9));
  return new File([blob], "imagem.jpg", { type: "image/jpeg" });
}

/** Modal para cortar, girar e dar zoom antes de enviar uma imagem. */
export function ImageCropper({
  file,
  aspect,
  round = false,
  onCancel,
  onDone,
}: {
  file: File;
  aspect: number;
  round?: boolean;
  onCancel: () => void;
  onDone: (file: File) => void;
}) {
  const [src] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-4">
      <div className="w-full max-w-lg rounded-md bg-card p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Ajustar imagem</h2>
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Fechar">
            <X />
          </Button>
        </div>
        <div className="relative h-80 overflow-hidden rounded-md bg-foreground">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape={round ? "round" : "rect"}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={(_, px) => setArea(px)}
          />
        </div>
        <label className="mt-4 block text-xs font-semibold text-muted-foreground">
          Zoom
          <input
            type="range"
            min={1}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </label>
        <label className="mt-2 block text-xs font-semibold text-muted-foreground">
          Girar ({Math.round(rotation)}°)
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </label>
        <div className="mt-3 flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Girar para a esquerda"
              onClick={() => setRotation((r) => ((r - 90 + 540) % 360) - 180)}
            >
              <RotateCcw />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Girar para a direita"
              onClick={() => setRotation((r) => ((r + 90 + 540) % 360) - 180)}
            >
              <RotateCw />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!area || busy}
              onClick={async () => {
                if (!area) return;
                setBusy(true);
                try {
                  onDone(await cropToFile(src, area, rotation));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Processando…" : "Usar imagem"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
