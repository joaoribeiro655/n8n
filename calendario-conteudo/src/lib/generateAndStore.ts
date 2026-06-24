import "server-only";
import { prisma } from "./prisma";
import { generateDesign } from "./claude";

export type GenerateOutcome =
  | { ok: true; designHtml: string }
  | { ok: false; error: string };

/**
 * Gera o design de um post com o Claude Design (HTML on-brand) e o guarda no
 * post. A conversão para PNG acontece no navegador (exportador), na hora de
 * aprovar/baixar. Usado pelo botão "Gerar arte" e pelo robô diário.
 */
export async function generatePostDesign(postId: string): Promise<GenerateOutcome> {
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { tenant: true } });
  if (!post) return { ok: false, error: "Postagem não encontrada" };

  try {
    const designHtml = await generateDesign(
      {
        name: post.tenant.name,
        primaryColor: post.tenant.primaryColor,
        secondaryColor: post.tenant.secondaryColor,
        accentColor: post.tenant.accentColor,
        textColor: post.tenant.textColor,
        fontFamily: post.tenant.fontFamily,
        logoUrl: post.tenant.logoUrl,
        tagline: post.tenant.tagline,
      },
      {
        title: post.title,
        copy: post.copy,
        briefing: post.briefing,
        photoUrl: post.photoUrl,
        feedback: post.feedback,
      },
    );

    await prisma.post.update({
      where: { id: post.id },
      data: { designHtml, status: "GENERATED" },
    });

    return { ok: true, designHtml };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao gerar o design" };
  }
}
