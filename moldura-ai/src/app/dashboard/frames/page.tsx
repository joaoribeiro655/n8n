import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FramesManager from "@/components/FramesManager";

export default async function FramesPage() {
  const session = await getSession();
  if (!session) return null;

  const [tenant, frames] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: session.tenantId } }),
    prisma.frame.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!tenant) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold">Molduras</h1>
      <p className="mt-1 text-gray-400">
        Gere molduras automáticas com a sua marca ou importe as suas.
      </p>
      <div className="mt-8">
        <FramesManager
          brand={{
            name: tenant.name,
            primaryColor: tenant.primaryColor,
            secondaryColor: tenant.secondaryColor,
            accentColor: tenant.accentColor,
            textColor: tenant.textColor,
            fontFamily: tenant.fontFamily,
            logoUrl: tenant.logoUrl,
            phone: tenant.phone,
            website: tenant.website,
            address: tenant.address,
            tagline: tenant.tagline,
          }}
          initialFrames={frames.map((f) => ({
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
