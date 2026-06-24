import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Claude Design: o próprio Claude cria o design de cada post (HTML/CSS on-brand).
// O design é renderizado/exportado para PNG no navegador (html-to-image).

export type Brand = {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
  logoUrl?: string | null;
  tagline?: string | null;
};

export type PostBrief = {
  title?: string | null;
  copy: string;
  briefing: string;
  photoUrl?: string | null;
  feedback?: string | null;
};

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM = `Você é um designer de social media sênior. Sua tarefa é criar a ARTE
de um post para Instagram (formato quadrado 1080x1080) como um documento HTML
completo e AUTOSSUFICIENTE.

Regras OBRIGATÓRIAS:
- Devolva APENAS um documento HTML, dentro de um bloco \`\`\`html ... \`\`\`. Nada de explicações.
- O <body> deve ter exatamente 1080px de largura por 1080px de altura, sem margens, sem rolagem.
- Todo o CSS deve estar embutido (em <style> ou inline). NÃO use JavaScript, NÃO use <script>.
- Pode usar Google Fonts via <link> ou @import. Pode usar gradientes, formas, ícones em SVG inline.
- Respeite RIGOROSAMENTE o brand guide informado (cores, fonte, logo, tagline).
- O texto principal (título/copy) deve estar legível e bem hierarquizado.
- Se uma foto for fornecida, use-a como elemento da arte (fundo ou destaque), com bom contraste.
- Design profissional, limpo e pronto para publicar. Nada de "lorem ipsum".`;

function buildPrompt(brand: Brand, post: PostBrief): string {
  const lines = [
    "Crie a arte deste post seguindo o brand guide.",
    "",
    "## Brand guide",
    `- Marca: ${brand.name}`,
    `- Cor primária: ${brand.primaryColor}`,
    `- Cor de fundo/secundária: ${brand.secondaryColor}`,
    `- Cor de destaque: ${brand.accentColor}`,
    `- Cor do texto: ${brand.textColor}`,
    `- Fonte: ${brand.fontFamily}`,
    brand.tagline ? `- Tagline: ${brand.tagline}` : "",
    brand.logoUrl ? `- Logo (use no design): ${brand.logoUrl}` : "- Sem logo: use o nome da marca como assinatura.",
    "",
    "## Conteúdo do post",
    post.title ? `- Título/destaque: ${post.title}` : "",
    post.copy ? `- Copy/legenda: ${post.copy}` : "",
    post.briefing ? `- Briefing da arte: ${post.briefing}` : "",
    post.photoUrl ? `- Foto para usar na arte (URL): ${post.photoUrl}` : "- Sem foto: use uma composição gráfica.",
    post.feedback ? `\n## Ajustes pedidos (gere uma nova versão corrigindo isto)\n${post.feedback}` : "",
  ];
  return lines.filter((l) => l !== "").join("\n");
}

function extractHtml(text: string): string {
  const fenced = text.match(/```html\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.search(/<!doctype html|<html/i);
  return start >= 0 ? raw.slice(start) : raw;
}

export async function generateDesign(brand: Brand, post: PostBrief): Promise<string> {
  if (!isClaudeConfigured()) {
    throw new Error("ANTHROPIC_API_KEY não configurada — não é possível gerar com o Claude Design.");
  }
  const client = new Anthropic(); // lê ANTHROPIC_API_KEY do ambiente

  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [{ role: "user", content: buildPrompt(brand, post) }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const html = extractHtml(text);
  if (!html || !/<(html|body|div|svg)/i.test(html)) {
    throw new Error("O Claude não retornou um design HTML válido.");
  }
  return html;
}
