import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GalleryGrid from "@/components/GalleryGrid";

export default async function GalleryPage() {
  const session = await getSession();
  if (!session) return null;

  const artworks = await prisma.artwork.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Galeria</h1>
      <p className="mt-1 text-gray-400">Todas as artes geradas pela sua equipe.</p>
      <div className="mt-8">
        <GalleryGrid
          initial={artworks.map((a) => ({
            id: a.id,
            imageUrl: a.imageUrl,
            createdAt: a.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
