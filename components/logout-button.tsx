"use client";

// Botão de sair que LIMPA o estado local do dispositivo antes de encerrar a
// sessão: fila/cache no IndexedDB e os caches do Service Worker. Evita que dados
// de um motorista vazem para o próximo login no mesmo aparelho.
import { Button } from "@/components/ui";
import { logout } from "@/lib/auth/actions";
import { limparDadosLocais } from "@/lib/offline/queue";

export function LogoutButton({ className = "" }: { className?: string }) {
  async function sair() {
    try {
      await limparDadosLocais();
    } catch {
      /* melhor esforço — não bloqueia o logout */
    }
    try {
      if ("caches" in window) {
        const chaves = await caches.keys();
        await Promise.all(chaves.map((k) => caches.delete(k)));
      }
    } catch {
      /* idem */
    }
    await logout();
  }

  return (
    <Button variant="ghost" onClick={sair} className={`px-3 ${className}`}>
      Sair
    </Button>
  );
}
