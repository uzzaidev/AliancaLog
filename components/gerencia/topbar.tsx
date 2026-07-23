// Topbar escura da gerência (padrão Track-POD): logo + nav horizontal +
// indicador Realtime "Ao vivo" + avatar + sair. Server component compondo os
// filhos client (nav, realtime, logout).
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
    <header className="sticky top-0 z-20 border-b-[3px] border-[#f37312] bg-[#1e1e1e]">
      <div className="flex h-[52px] items-center gap-2 px-4">
        <div className="mr-1 flex h-full items-center gap-3 border-r border-[#3d3d3d] pr-4">
          <Logo variant="light" size={24} />
          <span className="hidden rounded-full bg-[#f37312] px-2 py-0.5 text-[10px] font-semibold text-white sm:inline">
            Gerência
          </span>
        </div>
        <GerenciaNav />
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden sm:block">
            <RealtimeRefresher dark />
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f37312] text-xs font-bold text-white">
            {iniciais(email)}
          </span>
          <LogoutButton className="text-gray-300 hover:bg-[#2d2d2d] hover:text-white" />
        </div>
      </div>
    </header>
  );
}
