import { getSession } from "@/lib/auth";
import LeadGenerator from "@/components/LeadGenerator";

export default async function LeadsPage() {
  const session = await getSession();
  if (!session) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold">Gerar leads</h1>
      <p className="mt-1 text-gray-400">
        Monte listas de prospecção (disparos frios) filtrando por cargo, setor, tamanho e
        localização. Veja o tamanho do mercado de graça e baixe um CSV pronto para abordar.
      </p>
      <div className="mt-8">
        <LeadGenerator />
      </div>
    </div>
  );
}
