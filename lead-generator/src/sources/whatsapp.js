"use strict";

/**
 * WhatsApp via API NÃO OFICIAL (Baileys) — conecta pelo QR, como o WhatsApp Web.
 *
 * ⚠️ AVISO: automação não oficial viola os Termos do WhatsApp e disparo frio em
 * massa tem ALTO risco de banir o número. Por isso este módulo embute proteções:
 *  - confere se o destino tem WhatsApp antes de enviar (onWhatsApp);
 *  - intervalos ALEATÓRIOS entre mensagens (humaniza o ritmo);
 *  - limite diário;
 *  - não reenvia para quem já recebeu (registro em sent.json);
 *  - mensagem personalizada por lead.
 *
 * Mantém a sessão salva (multi-file auth) para não pedir QR toda vez.
 */

const fs = require("node:fs");
const path = require("node:path");

const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode");
const pino = require("pino");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const logger = pino({ level: "silent" });

let sock = null;
let status = "disconnected"; // disconnected | qr | connecting | connected
let authDir = null;

function getStatus() {
  return status;
}

function sentFile() {
  return path.join(authDir, "sent.json");
}
function loadSent() {
  try {
    return new Set(JSON.parse(fs.readFileSync(sentFile(), "utf8")));
  } catch {
    return new Set();
  }
}
function saveSent(set) {
  try {
    fs.writeFileSync(sentFile(), JSON.stringify([...set]));
  } catch {
    /* ok */
  }
}

/** Normaliza telefone/wa.me para os dígitos no padrão BR (55 + DDD + número). */
function toDigits(input) {
  let d = String(input || "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (d.length < 12 || d.length > 13) return "";
  return d;
}

function personalize(template, lead) {
  return String(template || "")
    .replace(/\{empresa\}/gi, lead.company || "")
    .replace(/\{nome\}/gi, (lead.name || "").split(/\s+/)[0] || "")
    .replace(/\{cidade\}/gi, lead.city || "")
    .replace(/\{cargo\}/gi, lead.decisorTitle || "");
}

/**
 * Conecta (ou reconecta) ao WhatsApp. Chama onUpdate com:
 *  { status, qr? } a cada mudança. qr é um data URL (imagem) para exibir.
 */
async function connect(opts) {
  authDir = opts.authDir;
  const onUpdate = opts.onUpdate || (() => {});
  fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch {
    version = undefined;
  }

  status = "connecting";
  onUpdate({ status });

  sock = makeWASocket({
    auth: state,
    version,
    logger,
    printQRInTerminal: false,
    browser: ["Gerador de Leads", "Chrome", "1.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) {
      status = "qr";
      const dataUrl = await qrcode.toDataURL(qr).catch(() => null);
      onUpdate({ status, qr: dataUrl });
    }
    if (connection === "open") {
      status = "connected";
      onUpdate({ status });
    }
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        status = "disconnected";
        onUpdate({ status, loggedOut: true });
      } else {
        status = "connecting";
        onUpdate({ status });
        // reconecta automaticamente (queda de rede etc.)
        try {
          await connect({ authDir, onUpdate });
        } catch {
          status = "disconnected";
          onUpdate({ status });
        }
      }
    }
  });

  return status;
}

async function logout() {
  try {
    if (sock) await sock.logout();
  } catch {
    /* ok */
  }
  try {
    fs.rmSync(authDir, { recursive: true, force: true });
  } catch {
    /* ok */
  }
  sock = null;
  status = "disconnected";
}

/**
 * Envia em lote, com proteções.
 * @param {{leads:Array, template:string, minDelay:number, maxDelay:number,
 *          dailyLimit:number, onProgress?:Function, isStopped?:Function}} o
 */
async function sendBulk(o) {
  if (!sock || status !== "connected") throw new Error("WhatsApp não está conectado.");
  const {
    leads = [],
    template = "",
    minDelay = 30,
    maxDelay = 90,
    dailyLimit = 50,
    onProgress = () => {},
    isStopped = () => false,
  } = o;

  if (!template.trim()) throw new Error("Escreva a mensagem antes de enviar.");

  const sent = loadSent();
  let enviados = 0;
  let pulados = 0;
  let falhas = 0;

  for (const lead of leads) {
    if (isStopped()) {
      onProgress({ enviados, pulados, falhas, parado: true });
      break;
    }
    if (enviados >= dailyLimit) {
      onProgress({ enviados, pulados, falhas, msg: `Limite diário (${dailyLimit}) atingido.` });
      break;
    }

    const digits = toDigits(lead.whatsapp || lead.phone);
    if (!digits) {
      pulados++;
      onProgress({ enviados, pulados, falhas, current: lead.company, info: "sem número válido" });
      continue;
    }

    let jid = digits + "@s.whatsapp.net";
    if (sent.has(jid)) {
      pulados++;
      onProgress({ enviados, pulados, falhas, current: lead.company, info: "já enviado antes" });
      continue;
    }

    try {
      const res = await sock.onWhatsApp(jid).catch(() => []);
      const info = Array.isArray(res) ? res[0] : null;
      if (!info || !info.exists) {
        pulados++;
        onProgress({ enviados, pulados, falhas, current: lead.company, info: "não tem WhatsApp" });
        continue;
      }
      jid = info.jid || jid;
      await sock.sendMessage(jid, { text: personalize(template, lead) });
      sent.add(jid);
      saveSent(sent);
      enviados++;
      onProgress({ enviados, pulados, falhas, current: lead.company, info: "enviado ✓" });
    } catch (e) {
      falhas++;
      onProgress({ enviados, pulados, falhas, current: lead.company, info: "falhou" });
    }

    const wait = (minDelay + Math.random() * Math.max(0, maxDelay - minDelay)) * 1000;
    await sleep(wait);
  }

  return { enviados, pulados, falhas };
}

module.exports = { connect, logout, sendBulk, getStatus, toDigits, personalize };
