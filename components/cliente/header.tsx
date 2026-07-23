// Header do portal do cliente (Spoke Connect): logo + chip da empresa. Claro.
import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/logout-button";

export function ClienteHeader({ empresa }: { empresa: string | null }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Logo variant="dark" size={24} />
          <span className="hidden text-[11px] text-muted sm:inline">
            Portal do cliente
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4CAF50]" />
            {empresa ?? "Minha empresa"}
          </span>
          <LogoutButton className="!min-h-0 px-2 py-1 text-xs" />
        </div>
      </div>
    </header>
  );
}
