import "server-only";

// Ponto de integração da geração automática de arte (Claude Design / n8n / Canva).
//
// Como funciona "tudo automático":
//   1. O usuário cria o post no calendário com a copy + briefing.
//   2. Clica em "Gerar arte automática" (ou um fluxo agendado chama a API).
//   3. Mandamos o briefing para o webhook configurado em CLAUDE_DESIGN_WEBHOOK_URL.
//   4. O webhook (ex.: um fluxo do n8n que aciona o Claude Design) produz a arte
//      e devolve { "imageUrl": "https://..." }.
//   5. A imagem entra como a próxima versão do post, pronta para aprovação.
//
// Enquanto o webhook não estiver configurado, a arte é enviada manualmente
// (upload/URL) e nada quebra.

export type GenerateInput = {
  clientName: string;
  clientSlug: string;
  title?: string | null;
  copy: string;
  briefing: string;
  date: string; // ISO
  feedback?: string | null; // preenchido em regeração após reprovação
  brand: {
    primaryColor: string;
    logoUrl?: string | null;
    tagline?: string | null;
  };
};

export type GenerateResult =
  | { ok: true; imageUrl: string; note?: string }
  | { ok: false; error: string; reason?: "NOT_CONFIGURED" };

export function isAutomationConfigured(): boolean {
  return Boolean(process.env.CLAUDE_DESIGN_WEBHOOK_URL);
}

export async function generateArt(input: GenerateInput): Promise<GenerateResult> {
  const url = process.env.CLAUDE_DESIGN_WEBHOOK_URL;
  if (!url) {
    return {
      ok: false,
      reason: "NOT_CONFIGURED",
      error:
        "Automação do Claude Design ainda não configurada. " +
        "Defina CLAUDE_DESIGN_WEBHOOK_URL ou envie a arte manualmente.",
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CLAUDE_DESIGN_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.CLAUDE_DESIGN_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      return { ok: false, error: `A automação respondeu com erro ${res.status}.` };
    }

    const data = (await res.json().catch(() => null)) as
      | { imageUrl?: string; url?: string; note?: string }
      | null;
    const imageUrl = data?.imageUrl || data?.url;
    if (!imageUrl) {
      return { ok: false, error: "A automação não retornou uma imageUrl." };
    }

    return { ok: true, imageUrl, note: data?.note ?? "Gerado automaticamente pelo Claude Design" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao chamar a automação." };
  }
}
