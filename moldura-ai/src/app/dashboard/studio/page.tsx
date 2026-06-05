import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import StudioEditor from "@/components/StudioEditor";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ frame?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { frame } = await searchParams;

  const frames = await prisma.frame.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Estúdio</h1>
      <p className="mt-1 text-gray-400">
        Escolha a moldura, envie a foto do carro, posicione e baixe a arte.
      </p>
      <div className="mt-8">
        <StudioEditor
          initialFrameId={frame}
          frames={frames.map((f) => ({
            id: f.id,
            name: f.name,
            imageUrl: f.imageUrl,
            width: f.width,
            height: f.height,
            slotX: f.slotX,
            slotY: f.slotY,
            slotW: f.slotW,
            slotH: f.slotH,
            source: f.source,
          }))}
        />
      </div>
    </div>
  );
}
