// Topbar escura da gerência (padrão Track-POD). No desktop (>= sm): logo +
// nav horizontal + indicador Realtime "Ao vivo" + avatar + sair. No mobile:
// só logo + avatar + sair — a navegação vira barra de abas fixa embaixo
// (GerenciaBottomNav, ver app/gerencia/layout.tsx), como um app nativo.
import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/logout-button";
import { GerenciaNav } from "@/components/gerencia/nav";
import { RealtimeRefresher } from "@/components/gerencia/realtime-refresher";

function iniciais(email: string | null) {
  if (!email) return "?";
  const nome = email.split("@")[0];
  const p = nome.split(/[.\-_]+/).filter(Boolean);
  const s = p.length >= 2 ? p[0][0] + p[1][0] : nome.slice(0, 2);
  return s.toUpperCase();
}

export function GerenciaTopbar({ email }: { email: string | null }) {
  return (
    <header className="sticky top-0 z-20 border-b-[3px] border-brand bg-dark">
      <div className="flex h-13 items-center gap-2 px-3 sm:px-4">
        <div className="flex h-full shrink-0 items-center gap-2 sm:mr-1 sm:gap-3 sm:border-r sm:border-dark-3 sm:pr-4">
          <Logo variant="light" size={22} />
          <span className="hidden rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white sm:inline">
            Gerência
          </span>
        </div>
        <GerenciaNav />
        <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4">
          <div className="hidden sm:block">
            <RealtimeRefresher dark />
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
            {iniciais(email)}
          </span>
          <LogoutButton className="shrink-0 text-gray-300 hover:bg-dark-2 hover:text-white" />
        </div>
      </div>
    </header>
  );
}
