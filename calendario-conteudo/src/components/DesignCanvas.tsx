"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as htmlToImage from "html-to-image";

export type DesignCanvasHandle = { toBlob: () => Promise<Blob> };

function waitForLoad(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    if (iframe.contentDocument?.readyState === "complete") return resolve();
    iframe.addEventListener("load", () => resolve(), { once: true });
  });
}

// Renderiza o design HTML criado pelo Claude (1080x1080) e expõe a exportação
// para PNG. A prévia é escalada para caber no painel; um frame oculto em tamanho
// real é usado para gerar a imagem final.
const DesignCanvas = forwardRef<DesignCanvasHandle, { html: string }>(function DesignCanvas(
  { html },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0.33);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / 1080);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    async toBlob() {
      const iframe = exportRef.current;
      if (!iframe) throw new Error("Área de exportação não está pronta");
      await waitForLoad(iframe);
      const doc = iframe.contentDocument;
      if (!doc) throw new Error("Não foi possível ler o design");
      try {
        // Espera as fontes carregarem antes de capturar.
        await (doc as Document & { fonts?: FontFaceSet }).fonts?.ready;
      } catch {
        // segue sem bloquear
      }
      await new Promise((r) => setTimeout(r, 400));
      const blob = await htmlToImage.toBlob(doc.body, {
        width: 1080,
        height: 1080,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      if (!blob) throw new Error("Falha ao exportar a imagem");
      return blob;
    },
  }));

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden rounded-lg border border-white/10" style={{ aspectRatio: "1 / 1" }}>
      {/* Prévia escalada */}
      <iframe
        title="Prévia da arte"
        srcDoc={html}
        sandbox="allow-same-origin"
        scrolling="no"
        style={{
          width: 1080,
          height: 1080,
          border: 0,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          pointerEvents: "none",
        }}
      />
      {/* Frame oculto em tamanho real, usado só para exportar */}
      <iframe
        ref={exportRef}
        title="Exportação"
        srcDoc={html}
        sandbox="allow-same-origin"
        scrolling="no"
        aria-hidden
        style={{ position: "fixed", left: -99999, top: 0, width: 1080, height: 1080, border: 0 }}
      />
    </div>
  );
});

export default DesignCanvas;
