// Backup lógico focado nas linhas que a migration 0023 pode alterar.
// Existe como fallback seguro quando pg_dump não está instalado no ambiente.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "./lib/pg.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "backups");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "backfill_0023_antes.json");

const client = createClient();
await client.connect();
try {
  const { rows } = await client.query(`
    with ultimo_canhoto as (
      select distinct on (c.nota_fiscal_id)
        c.nota_fiscal_id,
        c.id as canhoto_id,
        c.status as canhoto_status,
        c.registrado_em
      from public.canhotos c
      order by c.nota_fiscal_id, c.registrado_em desc, c.id desc
    )
    select
      to_jsonb(nf) as nota_fiscal,
      to_jsonb(uc) as ultimo_canhoto
    from public.notas_fiscais nf
    join ultimo_canhoto uc on uc.nota_fiscal_id = nf.id
    where nf.status = 'pendente'
      and nf.romaneio_id is null
      and nf.motorista_id is null
      and uc.canhoto_status in ('recusada', 'ocorrencia')
    order by nf.numero_nf
  `);
  fs.writeFileSync(
    outFile,
    JSON.stringify({ criado_em: new Date().toISOString(), total: rows.length, linhas: rows }, null, 2),
    "utf8",
  );
  console.log(`✓ backup lógico concluído: ${path.relative(root, outFile)} (${rows.length} linha(s))`);
} finally {
  await client.end();
}
