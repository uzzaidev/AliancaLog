"use client";

// Nav horizontal da gerência (dentro da topbar escura). Item ativo em laranja
// com filete embaixo. Ícones Tabler.
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
    <nav className="flex h-[52px] items-stretch overflow-x-auto">
      {LINKS.map((l) => {
        const active = pathname.startsWith(l.href);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 text-[13px] font-medium transition-colors ${
              active
                ? "border-[#f37312] text-[#f37312]"
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
