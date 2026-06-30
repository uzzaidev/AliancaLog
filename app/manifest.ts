import type { MetadataRoute } from "next";

// Manifest PWA (instalável na tela inicial). O service worker / offline entra
// no Sprint 2 (Serwist). Ícones definitivos serão adicionados junto.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aliança Log",
    short_name: "Aliança Log",
    description: "Controle de canhotos de entrega em tempo real.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1f5f9",
    theme_color: "#1d4ed8",
    lang: "pt-BR",
  };
}
