"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { dataUrlToBlob, uploadBlob, type FrameDTO } from "@/lib/client";

type Loaded = { el: HTMLImageElement; w: number; h: number };

function loadImage(src: string): Promise<Loaded> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve({ el, w: el.naturalWidth, h: el.naturalHeight });
    el.onerror = reject;
    el.src = src;
  });
}

export default function StudioEditor({
  frames,
  initialFrameId,
}: {
  frames: FrameDTO[];
  initialFrameId?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [frameId, setFrameId] = useState<string | null>(
    initialFrameId && frames.some((f) => f.id === initialFrameId)
      ? initialFrameId
      : (frames[0]?.id ?? null),
  );
  const frame = frames.find((f) => f.id === frameId) ?? null;

  const [frameImg, setFrameImg] = useState<Loaded | null>(null);
  const [photo, setPhoto] = useState<Loaded | null>(null);

  // photo transform
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const SIZE = frame?.width ?? 1080;
  const SIZE_H = frame?.height ?? 1080;

  // load frame image when selection changes
  useEffect(() => {
    if (!frame) {
      setFrameImg(null);
      return;
    }
    let alive = true;
    loadImage(frame.imageUrl).then((img) => alive && setFrameImg(img)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [frame]);

  // reset transform when photo or frame changes
  const resetTransform = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    loadImage(url).then((img) => {
      setPhoto(img);
      resetTransform();
    });
  }

  // compute draw geometry for the photo given current state
  const geometry = useCallback(() => {
    if (!photo || !frame) return null;
    const slot = {
      x: frame.slotX * SIZE,
      y: frame.slotY * SIZE_H,
      w: frame.slotW * SIZE,
      h: frame.slotH * SIZE_H,
    };
    const base = Math.max(slot.w / photo.w, slot.h / photo.h);
    const eff = base * scale;
    const drawW = photo.w * eff;
    const drawH = photo.h * eff;
    const cx = slot.x + slot.w / 2 + tx;
    const cy = slot.y + slot.h / 2 + ty;
    return { x: cx - drawW / 2, y: cy - drawH / 2, w: drawW, h: drawH };
  }, [photo, frame, scale, tx, ty, SIZE, SIZE_H]);

  // redraw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = SIZE;
    canvas.height = SIZE_H;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, SIZE, SIZE_H);

    // transparent checkerboard background (so empty areas are visible)
    const tile = 40;
    for (let y = 0; y < SIZE_H; y += tile) {
      for (let x = 0; x < SIZE; x += tile) {
        ctx.fillStyle = (x / tile + y / tile) % 2 === 0 ? "#161d2e" : "#0f1626";
        ctx.fillRect(x, y, tile, tile);
      }
    }

    const g = geometry();
    if (photo && g) ctx.drawImage(photo.el, g.x, g.y, g.w, g.h);
    if (frameImg) ctx.drawImage(frameImg.el, 0, 0, SIZE, SIZE_H);
  }, [SIZE, SIZE_H, geometry, photo, frameImg]);

  useEffect(() => {
    draw();
  }, [draw]);

  // dragging
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  function ratio() {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    return SIZE / canvas.getBoundingClientRect().width;
  }
  function onPointerDown(e: React.PointerEvent) {
    if (!photo) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, tx, ty };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const r = ratio();
    setTx(drag.current.tx + (e.clientX - drag.current.x) * r);
    setTy(drag.current.ty + (e.clientY - drag.current.y) * r);
  }
  function onPointerUp() {
    drag.current = null;
  }
  function onWheel(e: React.WheelEvent) {
    if (!photo) return;
    setScale((s) => Math.min(5, Math.max(0.2, s - e.deltaY * 0.001)));
  }

  function exportDataUrl(): string | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  }

  function download() {
    const url = exportDataUrl();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `arte-${Date.now()}.png`;
    a.click();
  }

  async function saveToGallery() {
    const dataUrl = exportDataUrl();
    if (!dataUrl) return;
    setSaving(true);
    setMsg(null);
    try {
      const url = await uploadBlob(dataUrlToBlob(dataUrl), "artwork");
      const res = await fetch("/api/artworks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url, frameId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMsg("Arte salva na galeria ✓");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao salvar");
    }
    setSaving(false);
  }

  if (frames.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-gray-300">Você ainda não tem nenhuma moldura.</p>
        <Link href="/dashboard/frames" className="btn-primary mt-4">Criar primeira moldura</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Canvas area */}
      <div className="card">
        <div className="mx-auto max-w-[560px]">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
            className="w-full touch-none cursor-grab rounded-xl border border-white/10 active:cursor-grabbing"
            style={{ aspectRatio: `${SIZE} / ${SIZE_H}` }}
          />
          <p className="mt-3 text-center text-xs text-gray-500">
            {photo ? "Arraste para posicionar • role o mouse para dar zoom" : "Envie uma foto para começar"}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-5">
        <div className="card space-y-4">
          <div>
            <label className="label">Moldura</label>
            <select className="input" value={frameId ?? ""} onChange={(e) => setFrameId(e.target.value)}>
              {frames.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Foto do carro</label>
            <label className="btn-ghost w-full cursor-pointer">
              {photo ? "Trocar foto" : "Enviar foto"}
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </label>
          </div>

          {photo && (
            <div>
              <label className="label">Zoom</label>
              <input
                type="range"
                min={0.2}
                max={5}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-sky-500"
              />
              <button onClick={resetTransform} className="mt-2 text-xs text-gray-400 hover:text-gray-200">
                ↺ Centralizar / resetar
              </button>
            </div>
          )}
        </div>

        <div className="card space-y-3">
          <button onClick={download} disabled={!photo} className="btn-primary w-full">
            ⬇ Baixar arte (PNG)
          </button>
          <button onClick={saveToGallery} disabled={!photo || saving} className="btn-ghost w-full">
            {saving ? "Salvando..." : "★ Salvar na galeria"}
          </button>
          {msg && <p className="text-center text-sm text-gray-300">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
