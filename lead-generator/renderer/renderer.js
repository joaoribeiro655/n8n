"use strict";

const $ = (id) => document.getElementById(id);
let currentLeads = [];

/* ===== Abas ===== */
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const which = tab.getAttribute("data-tab");
    $("pane-coletar").classList.toggle("hidden", which !== "coletar");
    $("pane-whats").classList.toggle("hidden", which !== "whats");
    if (which === "whats") refreshWaCount();
  });
});

/* ===== Atualizações ===== */
$("check-updates").addEventListener("click", async () => {
  $("check-updates").disabled = true;
  $("check-updates").textContent = "↻ Verificando…";
  try {
    await api.checkUpdates();
  } finally {
    $("check-updates").disabled = false;
    $("check-updates").textContent = "↻ Atualizações";
  }
});

/* ===== Coleta ===== */
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
    onlyWithEmail: $("only-email").checked,
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
      const tel = l.whatsapp
        ? `${escapeHtml(l.phone || "")} <a href="#" data-ext="${escapeHtml(l.whatsapp)}">zap</a>`
        : escapeHtml(l.phone || "—");
      const emailCell = l.email
        ? escapeHtml(l.email)
        : l.emailGuess
          ? `~ ${escapeHtml(l.emailGuess)}`
          : "—";
      return `<tr>
        <td>${empresa}</td>
        <td>${tel}</td>
        <td>${emailCell}</td>
        <td>${site}</td>
        <td>${escapeHtml(l.city || "—")}</td>
        <td>${escapeHtml(l.rating || "—")}</td>
        <td>${decisor}</td>
      </tr>`;
    })
    .join("");

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
  refreshWaCount();
});

$("export").addEventListener("click", async () => {
  if (!currentLeads.length) return;
  const res = await api.exportCsv(currentLeads);
  if (res.ok) $("status").textContent = "💾 Salvo em: " + res.filePath;
});

/* ===== WhatsApp ===== */
let waConnected = false;

function leadsComNumero() {
  return currentLeads.filter((l) => l.whatsapp || l.phone);
}
function refreshWaCount() {
  const n = leadsComNumero().length;
  $("wa-count").textContent = `${n} leads com número`;
  $("wa-send").disabled = !(waConnected && n > 0);
}
function waLog(line) {
  const el = $("wa-log");
  el.textContent += (el.textContent ? "\n" : "") + line;
  el.scrollTop = el.scrollHeight;
}

api.wa.onUpdate((u) => {
  const map = { disconnected: "desconectado", connecting: "conectando…", qr: "aguardando leitura do QR", connected: "conectado ✓" };
  $("wa-status").textContent = "Status: " + (map[u.status] || u.status);
  waConnected = u.status === "connected";
  $("wa-qr-box").classList.toggle("hidden", u.status !== "qr" || !u.qr);
  if (u.qr) $("wa-qr").src = u.qr;
  if (u.status === "connected") $("wa-qr-box").classList.add("hidden");
  if (u.loggedOut) waLog("Sessão encerrada no celular.");
  refreshWaCount();
});

api.wa.onProgress((p) => {
  $("wa-progress").textContent = `Enviados: ${p.enviados} · pulados: ${p.pulados} · falhas: ${p.falhas}`;
  if (p.current) waLog(`${p.info || ""} — ${p.current}`);
  if (p.msg) waLog(p.msg);
  if (p.parado) waLog("⏹ Parado.");
});

$("wa-connect").addEventListener("click", async () => {
  $("wa-status").textContent = "Status: conectando…";
  const res = await api.wa.connect();
  if (!res.ok) $("wa-status").textContent = "❌ " + (res.error || "Falha ao conectar.");
});

$("wa-logout").addEventListener("click", async () => {
  await api.wa.logout();
  waConnected = false;
  $("wa-status").textContent = "Status: desconectado";
  $("wa-qr-box").classList.add("hidden");
  refreshWaCount();
});

$("wa-send").addEventListener("click", async () => {
  const leads = leadsComNumero();
  if (!leads.length) return;
  const template = $("wa-template").value.trim();
  if (!template) {
    $("wa-progress").textContent = "Escreva a mensagem primeiro.";
    return;
  }
  const minDelay = Math.max(5, Number($("wa-min").value) || 30);
  const maxDelay = Math.max(minDelay, Number($("wa-max").value) || 90);
  const dailyLimit = Math.max(1, Number($("wa-daily").value) || 40);

  const ok = window.confirm(
    `Enviar para ${Math.min(leads.length, dailyLimit)} contatos (de ${leads.length}), 1 a cada ${minDelay}-${maxDelay}s?\n\n` +
      "Lembre: disparo frio em massa pode bloquear o número. Use com moderação.",
  );
  if (!ok) return;

  $("wa-send").disabled = true;
  $("wa-stop").disabled = false;
  $("wa-log").textContent = "";
  const res = await api.wa.send({ leads, template, minDelay, maxDelay, dailyLimit });
  $("wa-send").disabled = false;
  $("wa-stop").disabled = true;
  if (!res.ok) {
    $("wa-progress").textContent = "❌ " + (res.error || "Falha no envio.");
  } else {
    waLog(`✅ Fim: ${res.enviados} enviados, ${res.pulados} pulados, ${res.falhas} falhas.`);
  }
});

$("wa-stop").addEventListener("click", async () => {
  await api.wa.stop();
  $("wa-stop").disabled = true;
});
