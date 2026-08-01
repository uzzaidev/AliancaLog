// URL de navegação externa (Google Maps) para o botão "Abrir no Maps" do
// motorista. Usa lat/lng geocodificado quando disponível (mais preciso);
// senão cai para busca por texto do endereço — funciona nos dois casos, sem
// depender da gerência já ter rodado a geocodificação.
export function enderecoMapsUrl(item: {
  destinatario_endereco: string;
  cidade?: string | null;
  lat?: number | null;
  lng?: number | null;
}): string {
  const destino =
    item.lat != null && item.lng != null
      ? `${item.lat},${item.lng}`
      : `${item.destinatario_endereco}${item.cidade ? ", " + item.cidade : ""}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`;
}
