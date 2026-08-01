"use client";

// Nav da gerência. Dois formatos, mesmo array de links:
// - Desktop (>= sm): horizontal, dentro da topbar escura, ícone + rótulo.
// - Mobile (< sm): barra de abas fixa embaixo (padrão de app nativo) — a
//   topbar mobile fica só com logo + avatar + sair, sem disputar espaço com a nav.
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard,
  IconFileInvoice,
  IconUpload,
  IconUsers,
} from "@tabler/icons-react";

const LINKS = [
  { href: "/gerencia/dashboard", label: "Painel", icon: IconLayoutDashboard },
  { href: "/gerencia/romaneios", label: "Romaneios", icon: IconFileInvoice },
  { href: "/gerencia/importar", label: "Importar NFs", icon: IconUpload },
  { href: "/gerencia/cadastros", label: "Cadastros", icon: IconUsers },
];

export function GerenciaNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden h-13 items-stretch sm:flex">
      {LINKS.map((l) => {
        const active = pathname.startsWith(l.href);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 text-[13px] font-medium transition-colors ${
              active
                ? "border-brand text-brand"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Icon size={16} stroke={2} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function GerenciaBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-dark-3 bg-dark pb-[env(safe-area-inset-bottom)] sm:hidden">
      {LINKS.map((l) => {
        const active = pathname.startsWith(l.href);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-1 touch-target flex-col items-center justify-center gap-0.5 pt-1.5 text-[10px] font-medium ${
              active ? "text-brand" : "text-gray-400"
            }`}
          >
            <Icon size={20} stroke={2} />
            {l.label === "Importar NFs" ? "Importar" : l.label}
          </Link>
        );
      })}
    </nav>
  );
}
