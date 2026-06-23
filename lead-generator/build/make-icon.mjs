// Gera build/icon.png (1024x1024) sem dependências: desenha um "alvo" (🎯)
// num quadrado arredondado com gradiente, encodando o PNG na mão (zlib nativo).
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const S = 1024;
const buf = Buffer.alloc(S * S * 4);

function set(x, y, r, g, b, a = 255) {
  const i = (y * S + x) * 4;
  buf[i] = r;
  buf[i + 1] = g;
  buf[i + 2] = b;
  buf[i + 3] = a;
}

// Mistura de cor (alpha simples sobre o pixel atual).
function blend(x, y, r, g, b, a) {
  const i = (y * S + x) * 4;
  const ia = a / 255;
  buf[i] = Math.round(buf[i] * (1 - ia) + r * ia);
  buf[i + 1] = Math.round(buf[i + 1] * (1 - ia) + g * ia);
  buf[i + 2] = Math.round(buf[i + 2] * (1 - ia) + b * ia);
  buf[i + 3] = 255;
}

const R = 180; // raio do canto arredondado
function inRounded(x, y) {
  const minX = 0, minY = 0, maxX = S - 1, maxY = S - 1;
  const cx = Math.min(Math.max(x, minX + R), maxX - R);
  const cy = Math.min(Math.max(y, minY + R), maxY - R);
  return (x - cx) ** 2 + (y - cy) ** 2 <= R * R || (x >= R && x <= S - 1 - R) || (y >= R && y <= S - 1 - R);
}

// Fundo: gradiente azul (sky) dentro do quadrado arredondado.
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    if (!inRounded(x, y)) {
      set(x, y, 0, 0, 0, 0); // transparente fora
      continue;
    }
    const t = y / S;
    const r = Math.round(14 + t * 6);
    const g = Math.round(120 + t * 40);
    const b = Math.round(200 + t * 40);
    set(x, y, r, g, b, 255);
  }
}

// Alvo: anéis concêntricos branco/azul-escuro + centro vermelho.
const cx = S / 2;
const cy = S / 2;
// Do menor (centro) para o maior, para escolher o anel correto em cada pixel.
const rings = [
  { r: 64, c: [239, 68, 68] },
  { r: 120, c: [255, 255, 255] },
  { r: 180, c: [12, 74, 110] },
  { r: 240, c: [255, 255, 255] },
  { r: 300, c: [12, 74, 110] },
  { r: 360, c: [255, 255, 255] },
];
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    for (const ring of rings) {
      if (d <= ring.r) {
        // antialias leve na borda
        const edge = ring.r - d;
        const a = edge < 2 ? 160 : 255;
        blend(x, y, ring.c[0], ring.c[1], ring.c[2], a);
        break;
      }
    }
  }
}

// ---- Encode PNG (RGBA, 8 bits) ----
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeData) >>> 0, 0);
  return Buffer.concat([len, typeData, crc]);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0; // filtro none
  buf.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
}
const idat = deflateSync(raw, { level: 9 });
const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);

const out = join(dirname(fileURLToPath(import.meta.url)), "icon.png");
writeFileSync(out, png);
console.log("Ícone gerado:", out, `(${(png.length / 1024).toFixed(0)} KB)`);
