import "server-only";
import { prisma } from "./prisma";
import { addVersion } from "./posts";
import { generateArt } from "./claudeDesign";
import { isDriveConfigured, uploadArtToDrive } from "./drive";

export type GenerateOutcome =
  | { ok: true; versionId: string; imageUrl: string; driveUrl: string | null }
  | { ok: false; error: string; reason?: "NOT_CONFIGURED" };

/**
 * Gera a arte de um post pelo Claude Design e, se o Drive estiver configurado,
 * sobe o resultado em /<Cliente>/<Mês>/. Registra tudo como a próxima versão.
 *
 * Usado tanto pelo botão "Gerar arte automática" quanto pelo robô diário.
 */
export async function generatePostArt(postId: string): Promise<GenerateOutcome> {
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { tenant: true } });
  if (!post) return { ok: false, error: "Postagem não encontrada" };

  const gen = await generateArt({
    clientName: post.tenant.name,
    clientSlug: post.tenant.slug,
    title: post.title,
    copy: post.copy,
    briefing: post.briefing,
    date: post.date.toISOString(),
    feedback: post.feedback,
    brand: {
      primaryColor: post.tenant.primaryColor,
      logoUrl: post.tenant.logoUrl,
      tagline: post.tenant.tagline,
    },
  });

  if (!gen.ok) return { ok: false, error: gen.error, reason: gen.reason };

  // Sobe no Google Drive, se configurado. Falha no Drive não perde a arte:
  // a versão é registrada com a imageUrl mesmo assim.
  let driveFileId: string | null = null;
  let driveUrl: string | null = null;
  if (isDriveConfigured()) {
    try {
      const filename = `${post.date.toISOString().slice(0, 10)}-${post.id}.png`;
      const up = await uploadArtToDrive({
        clientName: post.tenant.name,
        clientFolderId: post.tenant.driveFolderId,
        date: post.date,
        filename,
        imageUrl: gen.imageUrl,
      });
      driveFileId = up.fileId;
      driveUrl = up.url;
      // Lembra a pasta do cliente para não recriar depois.
      if (!post.tenant.driveFolderId && up.clientFolderId) {
        await prisma.tenant.update({
          where: { id: post.tenantId },
          data: { driveFolderId: up.clientFolderId },
        });
      }
    } catch (e) {
      console.error("Falha ao subir no Drive:", e instanceof Error ? e.message : e);
    }
  }

  const version = await addVersion({
    postId: post.id,
    imageUrl: gen.imageUrl,
    source: "AUTO",
    note: gen.note ?? post.feedback ?? null,
    driveFileId,
    driveUrl,
  });

  return { ok: true, versionId: version.id, imageUrl: gen.imageUrl, driveUrl };
}
