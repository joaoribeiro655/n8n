import { getSession } from "@/lib/auth";
import { isAutomationConfigured } from "@/lib/claudeDesign";
import CalendarBoard from "@/components/CalendarBoard";

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) return null;

  const autoEnabled = isAutomationConfigured();

  return (
    <div>
      <h1 className="text-2xl font-bold">Calendário</h1>
      <p className="mt-1 text-gray-400">
        Planeje as postagens do mês: escreva a copy e o briefing, gere a arte
        automaticamente (ou envie a arte pronta) e aprove cada versão.
      </p>
      <div className="mt-8">
        <CalendarBoard autoEnabled={autoEnabled} />
      </div>
    </div>
  );
}
