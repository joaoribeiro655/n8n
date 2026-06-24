import "server-only";
import { prisma } from "./prisma";
import { addVersion } from "./posts";
import { renderPostArt } from "./render";
import { saveBuffer } from "./upload";

export type GenerateOutcome =
  | { ok: true; versionId: string; imageUrl: string }
  | { ok: false; error: string };

/**
 * Gera a arte de um post renderizando o layout com o brand guide do cliente —
 * tudo na própria plataforma — e a salva na galeria como a próxima versão.
 *
 * Usado tanto pelo botão "Gerar arte" quanto pelo robô diário.
 */
export async function generatePostArt(postId: string): Promise<GenerateOutcome> {
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { tenant: true } });
  if (!post) return { ok: false, error: "Postagem não encontrada" };

  try {
    const png = await renderPostArt(
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
      { title: post.title, copy: post.copy, photoUrl: post.photoUrl },
    );

    const imageUrl = await saveBuffer(post.tenantId, png, "image/png", "art");

    const version = await addVersion({
      postId: post.id,
      imageUrl,
      source: "AUTO",
      note: post.feedback ?? "Renderizada na plataforma",
    });

    return { ok: true, versionId: version.id, imageUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao gerar a arte" };
  }
}
