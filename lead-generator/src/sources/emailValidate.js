"use strict";

/**
 * Validação de e-mail em camadas (grátis):
 *  1. sintaxe;
 *  2. MX — o domínio realmente recebe e-mail? (DNS, confiável e rápido);
 *  3. SMTP (opcional, "verificação profunda") — pergunta ao servidor se a
 *     CAIXA existe. Best-effort: a porta 25 costuma ser bloqueada em redes
 *     residenciais, então quando não dá, cai de volta para o resultado do MX.
 *
 * Status possíveis:
 *   valido          – SMTP confirmou a caixa
 *   inexistente     – SMTP recusou a caixa (550)
 *   dominio-ok      – domínio recebe e-mail (MX), caixa não verificada
 *   sem-mx          – domínio não tem servidor de e-mail (provável lixo/erro)
 *   invalido        – sintaxe inválida
 *   incerto         – servidor respondeu de forma ambígua
 */

const dns = require("node:dns").promises;
const net = require("node:net");

const SYNTAX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const mxCache = new Map();
async function mxRecords(domain) {
  if (mxCache.has(domain)) return mxCache.get(domain);
  let recs = [];
  try {
    recs = await dns.resolveMx(domain);
    recs.sort((a, b) => a.priority - b.priority);
  } catch {
    recs = [];
  }
  mxCache.set(domain, recs);
  return recs;
}

/** Conversa mínima de SMTP para saber se a caixa é aceita. Best-effort. */
function smtpProbe(email, mxHost, timeoutMs = 6000) {
  return new Promise((resolve) => {
    let stage = 0;
    let buf = "";
    let done = false;
    const finish = (r) => {
      if (done) return;
      done = true;
      try {
        socket.destroy();
      } catch {
        /* ok */
      }
      resolve(r);
    };

    const socket = net.createConnection({ host: mxHost, port: 25 });
    socket.setTimeout(timeoutMs);
    const send = (line) => socket.write(line + "\r\n");

    socket.on("data", (d) => {
      buf += d.toString();
      if (!/\r?\n$/.test(buf)) return; // espera a linha completa
      const last = buf.trim().split(/\r?\n/).pop() || "";
      const code = parseInt(last.slice(0, 3), 10);
      buf = "";
      if (stage === 0) {
        if (code !== 220) return finish({ status: "incerto", reason: "sem saudação" });
        send("EHLO validator.local");
        stage = 1;
      } else if (stage === 1) {
        send("MAIL FROM:<check@validator.local>");
        stage = 2;
      } else if (stage === 2) {
        send("RCPT TO:<" + email + ">");
        stage = 3;
      } else if (stage === 3) {
        if (code === 250 || code === 251) return finish({ status: "valido", reason: "caixa aceita" });
        if (code === 550 || code === 551 || code === 553 || code === 501)
          return finish({ status: "inexistente", reason: "caixa recusada" });
        return finish({ status: "incerto", reason: "código " + code });
      }
    });

    socket.on("timeout", () => finish({ status: "smtp-bloqueado", reason: "timeout (porta 25?)" }));
    socket.on("error", (e) => finish({ status: "smtp-bloqueado", reason: e.code || "erro de conexão" }));
    socket.on("end", () => finish({ status: "incerto", reason: "conexão encerrada" }));
  });
}

/**
 * Valida um e-mail. Com { smtp:true } tenta a verificação profunda.
 * Retorna { email, status, reason, domain }.
 */
async function validateEmail(rawEmail, { smtp = false } = {}) {
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!SYNTAX.test(email)) return { email, status: "invalido", reason: "sintaxe" };

  const domain = email.split("@")[1];
  const recs = await mxRecords(domain);
  if (!recs.length) return { email, status: "sem-mx", reason: "domínio não recebe e-mail", domain };

  if (!smtp) return { email, status: "dominio-ok", reason: "domínio recebe e-mail (MX)", domain };

  const probe = await smtpProbe(email, recs[0].exchange);
  if (probe.status === "smtp-bloqueado") {
    // Não deu para checar a caixa; ficamos com a certeza do MX.
    return { email, status: "dominio-ok", reason: "SMTP indisponível; validado por MX", domain };
  }
  return { email, status: probe.status, reason: probe.reason, domain };
}

/** Rótulo curto para a interface. */
const STATUS_LABEL = {
  valido: "✓ válido",
  "dominio-ok": "✓ domínio ok",
  inexistente: "✗ não existe",
  "sem-mx": "✗ domínio sem e-mail",
  invalido: "✗ formato",
  incerto: "? incerto",
};

module.exports = { validateEmail, mxRecords, smtpProbe, STATUS_LABEL };
