"use strict";

/** Geração de CSV sem dependências. UTF-8 + BOM (abre certo no Excel/Numbers/Sheets). */

const COLUMNS = [
  ["empresa", (l) => l.company],
  ["contato", (l) => l.name],
  ["cargo_decisor", (l) => l.decisorTitle],
  ["linkedin_perfil", (l) => l.linkedinUrl],
  ["categoria", (l) => l.category],
  ["telefone", (l) => l.phone],
  ["whatsapp", (l) => l.whatsapp],
  ["email", (l) => l.email],
  ["site", (l) => l.website],
  ["instagram", (l) => l.instagram],
  ["endereco", (l) => l.address],
  ["cidade", (l) => l.city],
  ["avaliacao", (l) => l.rating],
  ["num_avaliacoes", (l) => l.reviews],
  ["cnpj", (l) => l.cnpj],
  ["fonte", (l) => l.source],
  ["maps_url", (l) => l.mapsUrl],
  ["linkedin_busca", (l) => l.linkedinSearch],
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
