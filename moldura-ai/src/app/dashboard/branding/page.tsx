import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BrandingForm from "@/components/BrandingForm";

export default async function BrandingPage() {
  const session = await getSession();
  if (!session) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
  });
  if (!tenant) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold">Identidade visual</h1>
      <p className="mt-1 text-gray-400">
        Defina a marca da concessionária. A IA usa esses dados para gerar as molduras automaticamente.
      </p>
      <div className="mt-8">
        <BrandingForm
          initial={{
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
        />
      </div>
    </div>
  );
}
