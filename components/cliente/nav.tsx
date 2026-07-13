"use client";

// Sub-navegação do portal do cliente (marca o item ativo pela rota).
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/cliente/notas", label: "Minhas entregas" },
  { href: "/cliente/importar", label: "Enviar NFs" },
];

export function ClienteNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {LINKS.map((l) => {
        const active = pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-brand text-brand"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
