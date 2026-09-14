# Inventário de dados pessoais — base para a política de privacidade

> Escrito em 14/09/2026 a partir do **código e do schema real**, não de suposição.
>
> ⚠️ **Isto NÃO é a política de privacidade.** É o levantamento técnico que o jurídico
> precisa ter em mãos para redigi-la. Ver "O que falta" no fim.

## Por que este documento existe

O produto coleta **foto de assinatura, GPS e horário de pessoas físicas**. Isso é dado
pessoal sob a LGPD. Quem redige a política precisa saber exatamente o que é coletado,
onde fica e quem alcança — e isso só sai do código.

## 1. O que é coletado, por titular

### Motorista (empregado ou terceirizado da transportadora)

| Dado | Onde fica | Por que existe |
|---|---|---|
| Nome, e-mail | `usuarios` | login e identificação de quem registrou a entrega |
| Telefone, CNH | `motoristas` | cadastro operacional |
| **Localização GPS ao vivo** | `motorista_posicao` | acompanhar a rota em andamento |
| **GPS + precisão no momento do canhoto** | `canhotos.lat/lng/gps_precisao` | provar onde a entrega foi registrada |
| Horário de cada registro | `canhotos.registrado_em` | prova de entrega |

⚠️ **O GPS ao vivo é o dado mais sensível do sistema.** É monitoramento de trabalhador.
Guarda só a última posição (sem trilha histórica) e só enquanto há romaneio ativo e
confirmado — decisão registrada na migration `0017`. Mesmo assim, **exige aviso prévio e
transparência com o motorista**; não basta estar no contrato dele.

### Destinatário da entrega (pessoa que recebe e assina)

| Dado | Onde fica | Por que existe |
|---|---|---|
| Nome e endereço | `notas_fiscais` | executar a entrega |
| **Foto da assinatura no canhoto** | Storage, bucket `canhotos` | prova de entrega |
| **Foto da chegada no local** | Storage, bucket `canhotos` | provar que o motorista esteve lá |
| Coordenadas do endereço | `notas_fiscais.lat/lng` | mapa e roteirização |

⚠️ **A foto do canhoto pode conter assinatura, nome legível e às vezes documento.** É o
dado de maior risco do sistema — e o titular (quem assina) **não é cliente nosso nem da
transportadora**, o que torna a base legal mais delicada.

### Contato da empresa cliente

Nome e e-mail em `empresas_clientes` — dado de contato profissional, risco baixo.

## 2. Onde os dados ficam

| | |
|---|---|
| **Banco** | Supabase (PostgreSQL), região `sa-east-1` — **São Paulo, Brasil** |
| **Fotos** | Supabase Storage, bucket `canhotos`, **privado** (`public = false`) |
| **No aparelho** | IndexedDB — fila de canhotos pendentes (com as fotos) e cache do romaneio |
| **Backup** | artifact do GitHub Actions, retenção de 30 dias |
| **Erros** | Sentry (quando a DSN for configurada) |

✅ Dados ficam **no Brasil**. Não há transferência internacional no caminho principal —
mas o **Sentry e o GitHub processam fora do país**, e isso precisa constar na política.

## 3. Quem alcança o quê (verificado por teste, não por leitura)

Auditoria executada em **14/09/2026** contra a produção:

| Quem | Alcança |
|---|---|
| **Visitante sem login** | **Nada.** Testadas as 9 tabelas e o Storage com a chave anônima: 0 linhas em todas |
| **Motorista** | Só as NFs atribuídas a ele + aquelas em que ele mesmo registrou canhoto. Não vê posição de outro motorista |
| **Cliente final** | Só as NFs da própria empresa. Confirmado que não enxerga outra empresa |
| **Gerência** | Tudo (é o operador do sistema) |

**Como isso é garantido:** Row Level Security no PostgreSQL — a regra vive no banco, não
na aplicação. Mesmo que a tela tenha bug, o banco recusa.

## 4. Proteções já ativas

| Proteção | Estado |
|---|---|
| HTTPS em todo o tráfego | ✅ |
| Criptografia em repouso (disco do Supabase) | ✅ nativa |
| Bucket de fotos privado | ✅ `public = false` |
| Fotos só por URL assinada, expira em 1h | ✅ `createSignedUrl`, TTL 3600s |
| Nenhum dado sensível em `localStorage` | ✅ zero ocorrências no código |
| Nenhum segredo no bundle do navegador | ✅ auditado: sem service key, sem `DATABASE_URL` |
| Logout limpa cache e fila do aparelho | ✅ `logout-button.tsx` |
| Isolamento entre perfis | ✅ RLS + 23 testes automatizados (`npm run test:security`) |

## 5. Lacunas — o que ainda não existe

| # | Lacuna | Risco |
|---|---|---|
| 1 | **Sem prazo de retenção.** Fotos e GPS ficam para sempre | 🔴 LGPD exige prazo definido e eliminação ao fim |
| 2 | **Sem política publicada.** Não há rota de privacidade no app | 🔴 |
| 3 | **Sem aviso ao motorista** sobre o rastreamento GPS | 🔴 monitoramento de trabalhador sem transparência |
| 4 | **Sem processo de atendimento ao titular** (acesso, correção, exclusão) | 🟡 LGPD dá o direito, alguém tem que atender |
| 5 | **Sem log de auditoria** — não se sabe quem da gerência viu qual canhoto | 🟡 |
| 6 | **Sem MFA na conta de gerência** — ela alcança tudo | 🟡 |
| 7 | **Sem encarregado (DPO) definido** | 🟡 |

## 6. O que falta — e quem faz

### Precisa de jurídico (não faço)

1. **Definir a base legal** de cada tratamento. Provavelmente: execução de contrato para
   os dados da entrega; legítimo interesse para o GPS do motorista — mas **quem decide
   isso é advogado**, e a escolha muda o que a política precisa dizer.
2. **Redigir a política de privacidade e os termos de uso.**
3. **Definir os prazos de retenção.** Precisa cruzar a exigência fiscal (canhoto é prova
   de entrega, prazo fiscal costuma ser 5 anos) com o princípio da necessidade da LGPD.
4. **Definir o encarregado (DPO)** e o canal de atendimento ao titular.
5. **NDA** antes de receber dados reais, e as cláusulas de LGPD no contrato.

### Posso fazer assim que o texto existir

1. Publicar a política como rota pública e linkar no rodapé do login.
2. **Aviso de GPS** na primeira vez que o motorista confirma um romaneio, com aceite
   registrado.
3. **Rotina de retenção** — job que apaga fotos e posições além do prazo definido.
4. **Log de auditoria** de quem visualizou comprovante.
5. **MFA** na conta de gerência (o Supabase Auth já suporta).

---

> **Resumo honesto:** a parte técnica está bem — nada vaza para quem não está logado, e o
> isolamento entre perfis é testado automaticamente. O que falta é **documento e
> processo**, e isso é do jurídico. As lacunas 1, 2 e 3 deveriam ser resolvidas **antes
> do primeiro canhoto real**.
