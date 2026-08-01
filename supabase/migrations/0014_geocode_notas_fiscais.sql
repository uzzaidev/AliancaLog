-- 0014 — Coordenadas do destino da NF, para o mapa de planejamento da gerência.
--
-- Diferente de canhotos.lat/lng (GPS do celular no momento do registro, já
-- existente desde 0005), isto é a geocodificação do ENDEREÇO DE ENTREGA
-- (destinatario_endereco + cidade), calculada de forma assíncrona depois da
-- importação — não bloqueia o fluxo de importar Excel/XML/PDF.
alter table public.notas_fiscais
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists geocode_status text
    check (geocode_status is null or geocode_status in ('ok', 'falhou')),
  add column if not exists geocoded_em timestamptz;
