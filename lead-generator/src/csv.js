"use strict";

/**
 * Geração de CSV no formato do modelo do usuário (importável como planilha):
 *   nome_completo, telefone, email, observacoes
 * UTF-8 + BOM (abre certo no Excel/Numbers/Sheets).
 */

/** Telefone só com dígitos, no padrão nacional (remove o DDI 55 se houver). */
function telDigits(l) {
  let d = String(l.whatsapp || l.phone || "").replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  return d;
}

function nomeCompleto(l) {
  return l.name || l.company || "";
}

function email(l) {
  return l.email || l.emailGuess || "";
}

function observacoes(l) {
  const parts = [];
  if (l.company && l.company !== nomeCompleto(l)) parts.push(l.company);
  if (l.city) parts.push(l.city);
  if (l.decisorTitle) parts.push(l.decisorTitle);
  else if (l.category) parts.push(l.category);
  if (l.website) parts.push(l.website);
  if (!l.email && l.emailGuess) parts.push("e-mail provável");
  return parts.join(" · ");
}

const COLUMNS = [
  ["nome_completo", nomeCompleto],
  ["telefone", telDigits],
  ["email", email],
  ["observacoes", observacoes],
];

function escape(value) {
  if (value == null) return "";
  const str = String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function buildCsv(leads) {
  const header = COLUMNS.map(([h]) => h).join(",");
  const rows = leads.map((l) => COLUMNS.map(([, get]) => escape(get(l))).join(","));
  return "﻿" + [header, ...rows].join("\r\n") + "\r\n";
}

module.exports = { buildCsv, COLUMNS };
