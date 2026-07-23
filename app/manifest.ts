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
    background_color: "#1e1e1e",
    theme_color: "#f37312",
    lang: "pt-BR",
  };
}
