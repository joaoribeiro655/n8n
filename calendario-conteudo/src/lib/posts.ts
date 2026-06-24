import "server-only";
import { prisma } from "./prisma";

/**
 * Registra uma arte como a próxima versão (v1, v2, v3...) do post e o coloca
 * em GENERATED, pronto para revisão. Mantém o histórico completo das versões.
 */
export async function addVersion(opts: {
  postId: string;
  imageUrl: string;
  source: "UPLOAD" | "AUTO";
  note?: string | null;
  driveFileId?: string | null;
  driveUrl?: string | null;
}) {
  const last = await prisma.postVersion.findFirst({
    where: { postId: opts.postId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (last?.version ?? 0) + 1;

  const [version] = await prisma.$transaction([
    prisma.postVersion.create({
      data: {
        postId: opts.postId,
        version: nextVersion,
        imageUrl: opts.imageUrl,
        source: opts.source,
        note: opts.note ?? null,
        driveFileId: opts.driveFileId ?? null,
        driveUrl: opts.driveUrl ?? null,
      },
    }),
    prisma.post.update({ where: { id: opts.postId }, data: { status: "GENERATED" } }),
  ]);

  return version;
}
