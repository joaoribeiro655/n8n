"use strict";

const $ = (id) => document.getElementById(id);
let currentLeads = [];

api.onProgress((msg) => {
  $("status").textContent = msg;
});

function readParams() {
  const cities = $("cities")
    .value.split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    cities,
    businessType: $("businessType").value.trim() || "concessionária",
    uf: $("uf").value.trim(),
    limit: Math.max(1, Math.min(120, Number($("limit").value) || 30)),
    sources: {
      maps: $("src-maps").checked,
      site: $("src-site").checked,
      cnpj: $("src-cnpj").checked,
      linkedin: $("src-linkedin").checked,
    },
  };
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function renderRows(leads) {
  const tbody = $("rows");
  if (!leads.length) {
    tbody.innerHTML = '<tr class="empty"><td colspan="7">Nenhum lead encontrado.</td></tr>';
    return;
  }
  tbody.innerHTML = leads
    .map((l) => {
      const site = l.website
        ? `<a href="#" data-ext="${escapeHtml(l.website)}">${escapeHtml(l.website.replace(/^https?:\/\//, "").slice(0, 30))}</a>`
        : "—";
      let decisor = "—";
      if (l.linkedinUrl) {
        const rotulo = l.name ? `${l.name}${l.decisorTitle ? " · " + l.decisorTitle : ""}` : "ver perfil";
        decisor = `<a href="#" data-ext="${escapeHtml(l.linkedinUrl)}">${escapeHtml(rotulo)}</a>`;
      } else if (l.linkedinSearch) {
        decisor = `<a href="#" data-ext="${escapeHtml(l.linkedinSearch)}">buscar no LinkedIn</a>`;
      }
      const empresa = l.mapsUrl
        ? `<a href="#" data-ext="${escapeHtml(l.mapsUrl)}">${escapeHtml(l.company)}</a>`
        : escapeHtml(l.company || "—");
      return `<tr>
        <td>${empresa}</td>
        <td>${escapeHtml(l.phone || "—")}</td>
        <td>${escapeHtml(l.email || (l.whatsapp ? "wpp: " + l.whatsapp : "—"))}</td>
        <td>${site}</td>
        <td>${escapeHtml(l.city || "—")}</td>
        <td>${escapeHtml(l.rating || "—")}</td>
        <td>${decisor}</td>
      </tr>`;
    })
    .join("");

  // Links abrem no navegador externo.
  tbody.querySelectorAll("a[data-ext]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      api.openExternal(a.getAttribute("data-ext"));
    });
  });
}

$("run").addEventListener("click", async () => {
  const params = readParams();
  if (!params.sources.maps && !params.sources.cnpj) {
    $("status").textContent = "Marque ao menos uma fonte de coleta (Google Maps ou CNPJ).";
    return;
  }
  $("run").disabled = true;
  $("export").disabled = true;
  $("status").textContent = "Iniciando…";
  currentLeads = [];
  renderRows([]);

  const res = await api.run(params);
  $("run").disabled = false;

  if (!res.ok) {
    $("status").textContent = "❌ " + (res.error || "Falha ao gerar a lista.");
    return;
  }
  currentLeads = res.leads || [];
  const withEmail = currentLeads.filter((l) => l.email).length;
  $("count").textContent = `${currentLeads.length} leads · ${withEmail} com e-mail`;
  $("export").disabled = currentLeads.length === 0;
  renderRows(currentLeads);
});

$("export").addEventListener("click", async () => {
  if (!currentLeads.length) return;
  const res = await api.exportCsv(currentLeads);
  if (res.ok) $("status").textContent = "💾 Salvo em: " + res.filePath;
});
