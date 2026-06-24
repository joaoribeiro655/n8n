import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAutomationConfigured } from "@/lib/claudeDesign";
import { isDriveConfigured } from "@/lib/drive";
import CalendarBoard from "@/components/CalendarBoard";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Alerta: faltando 5 dias ou menos para o mês virar E o próximo mês ainda sem
// posts cadastrados → avisa para gerar o calendário do próximo mês.
async function nextMonthAlert(tenantId: string) {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = lastDay - now.getDate();
  if (daysLeft > 5) return null;

  const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  const count = await prisma.post.count({
    where: { tenantId, date: { gte: start, lt: end } },
  });
  if (count > 0) return null;

  return { monthLabel: `${MONTHS[start.getMonth()]} ${start.getFullYear()}`, daysLeft };
}

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) return null;

  const autoEnabled = isAutomationConfigured();
  const driveEnabled = isDriveConfigured();
  const alert = await nextMonthAlert(session.tenantId);

  return (
    <div>
      <h1 className="text-2xl font-bold">Calendário</h1>
      <p className="mt-1 text-gray-400">
        Planeje as postagens do mês: escreva a copy e o briefing. Um dia antes, o
        robô gera a arte no Claude Design e sobe no Drive — aí é só aprovar.
      </p>

      {alert && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <span className="text-lg leading-none">⏰</span>
          <div>
            <p className="font-medium">
              Faltam {alert.daysLeft} dia{alert.daysLeft === 1 ? "" : "s"} para virar o mês.
            </p>
            <p className="text-amber-200/90">
              O calendário de <strong>{alert.monthLabel}</strong> ainda está vazio. Avance para o
              próximo mês (›) e cadastre os posts para o robô gerar as artes na data certa.
            </p>
          </div>
        </div>
      )}

      <div className="mt-8">
        <CalendarBoard autoEnabled={autoEnabled} driveEnabled={driveEnabled} />
      </div>
    </div>
  );
}
