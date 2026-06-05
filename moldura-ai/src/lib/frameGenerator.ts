// Client-side automatic frame generator.
// Draws a branded marketing overlay (transparent "window" in the middle where the
// car photo shows through) onto a canvas and returns a PNG data URL + the photo slot.

export type Brand = {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
  logoUrl: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  tagline: string | null;
};

export type FrameStyle = "header-footer" | "bottom-banner" | "corner";

export type Slot = { x: number; y: number; w: number; h: number };

export const FRAME_STYLES: { id: FrameStyle; label: string; desc: string }[] = [
  { id: "header-footer", label: "Clássica", desc: "Faixa no topo e rodapé com contato" },
  { id: "bottom-banner", label: "Banner inferior", desc: "Foto ampla com faixa degradê embaixo" },
  { id: "corner", label: "Selo de canto", desc: "Logo em destaque e faixa fina de contato" },
];

const SIZE = 1080;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function readable(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length < 6) return "#ffffff";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#0b1220" : "#ffffff";
}

function drawLogoContained(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  const ratio = Math.min(bw / logo.width, bh / logo.height);
  const w = logo.width * ratio;
  const h = logo.height * ratio;
  ctx.drawImage(logo, bx + (bw - w) / 2, by + (bh - h) / 2, w, h);
}

export async function generateFrame(
  brand: Brand,
  style: FrameStyle,
): Promise<{ dataUrl: string; slot: Slot; width: number; height: number }> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, SIZE, SIZE);

  let logo: HTMLImageElement | null = null;
  if (brand.logoUrl) {
    try {
      logo = await loadImage(brand.logoUrl);
    } catch {
      logo = null;
    }
  }

  const font = brand.fontFamily || "Inter";
  const onPrimary = readable(brand.primaryColor);
  const onAccent = readable(brand.accentColor);

  let slot: Slot = { x: 0, y: 0, w: 1, h: 1 };

  if (style === "header-footer") {
    const headH = 150;
    const footH = 180;

    // Header
    ctx.fillStyle = brand.primaryColor;
    ctx.fillRect(0, 0, SIZE, headH);
    if (logo) drawLogoContained(ctx, logo, 28, 20, 110, 110);
    ctx.fillStyle = onPrimary;
    ctx.font = `bold 52px ${font}`;
    ctx.textBaseline = "middle";
    ctx.fillText(brand.name, logo ? 160 : 36, headH / 2, SIZE - 200);

    // Footer
    ctx.fillStyle = brand.secondaryColor;
    ctx.fillRect(0, SIZE - footH, SIZE, footH);
    ctx.fillStyle = brand.accentColor;
    ctx.fillRect(0, SIZE - footH, SIZE, 12);
    ctx.fillStyle = brand.textColor;
    ctx.font = `bold 56px ${font}`;
    ctx.textBaseline = "alphabetic";
    if (brand.phone) ctx.fillText(brand.phone, 40, SIZE - footH + 80);
    ctx.font = `400 34px ${font}`;
    ctx.fillStyle = brand.textColor;
    const sub = [brand.website, brand.address].filter(Boolean).join("  •  ");
    if (sub) ctx.fillText(sub, 40, SIZE - footH + 132);

    slot = { x: 0, y: headH / SIZE, w: 1, h: (SIZE - headH - footH) / SIZE };
  } else if (style === "bottom-banner") {
    const bandH = 300;
    const grad = ctx.createLinearGradient(0, SIZE - bandH, 0, SIZE);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.35, hexToRgba(brand.secondaryColor, 0.85));
    grad.addColorStop(1, hexToRgba(brand.secondaryColor, 0.98));
    ctx.fillStyle = grad;
    ctx.fillRect(0, SIZE - bandH, SIZE, bandH);

    // accent bar bottom
    ctx.fillStyle = brand.accentColor;
    ctx.fillRect(0, SIZE - 90, SIZE, 90);

    if (logo) drawLogoContained(ctx, logo, 40, SIZE - bandH + 30, 150, 110);
    ctx.fillStyle = brand.textColor;
    ctx.font = `bold 48px ${font}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(brand.name, logo ? 210 : 40, SIZE - bandH + 105);
    if (brand.tagline) {
      ctx.font = `400 32px ${font}`;
      ctx.fillText(brand.tagline, logo ? 210 : 40, SIZE - bandH + 150);
    }
    ctx.fillStyle = onAccent;
    ctx.font = `bold 44px ${font}`;
    ctx.textBaseline = "middle";
    if (brand.phone) ctx.fillText(brand.phone, 40, SIZE - 45);

    slot = { x: 0, y: 0, w: 1, h: (SIZE - bandH) / SIZE };
  } else {
    // corner
    // top-left logo badge
    const badge = 220;
    ctx.fillStyle = brand.primaryColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(badge, 0);
    ctx.lineTo(0, badge);
    ctx.closePath();
    ctx.fill();
    if (logo) drawLogoContained(ctx, logo, 16, 16, 110, 110);

    // top-right accent triangle
    ctx.fillStyle = brand.accentColor;
    ctx.beginPath();
    ctx.moveTo(SIZE, 0);
    ctx.lineTo(SIZE - 160, 0);
    ctx.lineTo(SIZE, 160);
    ctx.closePath();
    ctx.fill();

    // thin bottom contact bar
    const barH = 96;
    ctx.fillStyle = brand.secondaryColor;
    ctx.fillRect(0, SIZE - barH, SIZE, barH);
    ctx.fillStyle = brand.accentColor;
    ctx.fillRect(0, SIZE - barH, SIZE, 8);
    ctx.fillStyle = brand.textColor;
    ctx.font = `bold 40px ${font}`;
    ctx.textBaseline = "middle";
    ctx.fillText(brand.name, 32, SIZE - barH / 2);
    if (brand.phone) {
      ctx.textAlign = "right";
      ctx.fillText(brand.phone, SIZE - 32, SIZE - barH / 2);
      ctx.textAlign = "left";
    }

    slot = { x: 0, y: 0, w: 1, h: (SIZE - barH) / SIZE };
  }

  return { dataUrl: canvas.toDataURL("image/png"), slot, width: SIZE, height: SIZE };
}

function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
