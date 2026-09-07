import type { Metadata } from "next";
import { OfflineView } from "@/components/motorista/offline-view";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Aliança Log — Modo Offline",
  description: "Acesso offline às entregas do dia e registro de canhotos.",
};

export default function OfflinePage() {
  return <OfflineView />;
}

