# Handoff — bipagem de DANFE não funciona no app do motorista

## Contexto do projeto

- **Aliança Log** — PWA de controle de canhotos de entrega (transportadora).
- Next.js 16 (App Router) + React 19 + TS + Tailwind v4 + Supabase (Postgres/RLS/Auth/Storage).
- Produção: `https://alianca-log.vercel.app` · repo `uzzaidev/AliancaLog`, branch `main`.
- **Tudo commitado e empurrado.** HEAD = `4aacc82 "correção bugs bip"`, igual a `origin/main`.
- Entrega ao cliente é esta semana. Isso é bloqueador.

## O problema

Na tela `/motorista/assumir`, o motorista bipa o código de barras do DANFE para
assumir a NF. **A câmera lê algo, mas nunca resulta na nota certa** — sempre cai em
"Nota não encontrada". Digitar o número da NF à mão **funciona**.

Segundo o PO: além de errar, é **lento** — precisa aproximar e afastar o celular
várias vezes. O requisito é: apontou, bipou, entrou.

Aparelho de teste: **iPhone, Safari, PWA instalado na tela de início**.

## Arquivos envolvidos

| Arquivo | Papel |
|---|---|
| `components/barcode-scanner.tsx` | Captura de câmera + decodificação |
| `components/motorista/assumir-nf.tsx` | Tela; recebe o texto lido e chama a server action |
| `lib/nfe.ts` | Interpreta o texto lido → `{ numero, chave }`; valida DV |
| `app/motorista/actions.ts` | `assumirNf()` → RPC `assumir_nf_motorista` |
| `supabase/migrations/0026`, `0027` | A RPC e a correção de ambiguidade dela |
| `scripts/test-nfe-scanner.mjs` | `npm run test:scanner` — 9 casos, todos passando |

## O que JÁ foi descartado (com evidência, não suposição)

**1. Backend está correto.** A RPC `assumir_nf_motorista` foi testada em transação
revertida com chave real e com número real: os dois caminhos retornam `assumida`.
Não é RLS, não é a função, não é o banco.

**2. A NF existe.** Testes feitos com a NF **24685**, chave
`43260921302723000115550010000246851647841366` (XML autorizado pela SEFAZ,
`cStat` 100). Confirmado no banco com essa chave exata.

**3. O parsing está correto.** `validarChave` aceita a chave (DV módulo 11 ok) e
`extrairNumeroNf` devolve `24685`. `npm run test:scanner` cobre 9 casos e passa.

**4. Câmera frontal.** Estava usando `decodeFromVideoDevice(null, …)`, que no iPhone
pega a câmera **padrão** (frontal). Corrigido para `facingMode: environment`.
Isso mudou o comportamento (ver abaixo), mas não resolveu.

## As leituras reais capturadas (a evidência mais importante)

A tela mostra o texto cru que o leitor devolveu. Três tentativas, três resultados
diferentes para o **mesmo** DANFE:

| # | "Código lido" | Interpretação |
|---|---|---|
| 1 | `K8#/>;8 !/Q "Nu/1t−b` | CODE-128 **Set C** decodificado como **Set B** |
| 2 | `505584` | Quadro parcial — 6 dígitos de uma chave de 44 |
| 3 | `K8 > 7 !/? "Nu0Ot-?` | Set B de novo |

**Sobre o Set B:** os dados do DANFE são 22 pares de dígitos em Code-128 Set C.
Decodificados como Set B, cada par vira `char = par + 32`. A prova: partindo da
chave real, a string prevista é `K:)5>;7 !/W * "Nu0Ot-b` — e o trecho `"Nu0Ot-`
bate **caractere por caractere** com a leitura #3. A transformação inversa
(`par = charCode - 32`) reconstrói a chave exata.

Ou seja: **o leitor enxerga o código certo e decodifica no subconjunto errado.**

## O que foi implementado (TUDO JÁ ESTÁ NO AR e NÃO RESOLVEU)

1. **Troca do decodificador.** Removido `@zxing/library` (port JS puro, em modo de
   manutenção, é onde nasce o bug de subconjunto). Instalado **`zxing-wasm` 3.1.3**
   (ZXing-C++ em WebAssembly). WASM servido localmente em
   `public/wasm/zxing_reader.wasm` (não do CDN) e adicionado ao Service Worker
   (cache subiu para `alianca-log-v5`).
2. **`BarcodeDetector` nativo** quando existe (Chromium/Android). No iOS nunca
   existe — nenhum navegador de iPhone implementa, todos usam WebKit.
3. **Câmera:** traseira, `1920×1080` ideal, `focusMode: continuous`, zoom 1.6×
   onde o hardware expõe.
4. **ROI:** recorta a faixa central (92% × 34%) e decodifica só ela.
5. **Formato único:** só `Code128`.
6. **Mira na tela** + botão de lanterna + loop a ~12 fps.
7. **Rede de segurança em `lib/nfe.ts`:** `recuperarDeCode128SetB()` reconstrói a
   chave a partir da leitura Set B, com o **DV como trava** (só aceita se a chave
   for válida). Também procura uma chave de 44 dígitos dentro de ruído.
8. **Confirmação por repetição** em `assumir-nf.tsx`: leitura sem chave válida
   precisa aparecer duas vezes seguidas antes de consultar o servidor.

## Estado atual

```
typecheck · lint · build · test:scanner · test:security (23+T11) · test:offline
→ todos verdes
```

**Mas o PO testou depois do deploy e continua não funcionando.** Não há captura
nova do "Código lido" após a versão WASM — esse é o dado que falta.

## O que NÃO foi verificado

- **Nada disso foi testado com câmera real por quem programou.** Não há acesso a
  celular nem a DANFE físico no ambiente de desenvolvimento. Toda a validação é
  de unidade + build.
- Não se sabe se o `zxing-wasm` chega a carregar no iPhone (o `.wasm` tem ~1 MB;
  se o `locateFile` falhar, o `catch` do loop engole e o scanner fica mudo).
- Não se sabe se o ROI está enquadrando o código (o DANFE tem o código de barras
  no topo, largo; a faixa é central).

## Hipóteses para investigar, em ordem

1. **O WASM não está carregando no iOS.** O `try/catch` dentro do `tick()` engole
   qualquer erro por quadro. Instrumentar: logar se `readBarcodes` foi importado,
   se o `.wasm` respondeu 200, e o tempo do primeiro decode. Suspeito nº 1 —
   explicaria "continua igual" após a troca.
2. **ROI cortando o código.** O código do DANFE é largo e fica no alto da folha.
   Faixa central de 34% pode não pegá-lo. Testar full-frame antes de recortar.
3. **Resolução não aplicada.** `1920×1080` é `ideal`, não `exact` — o iOS pode
   entregar 640×480. Ler `track.getSettings()` e mostrar na tela durante o teste.
4. **Código de barras do DANFE em ITF-25 e não Code-128.** Restringir a `Code128`
   impediria a leitura. Confirmar o formato impresso e, se preciso, aceitar
   `["Code128", "ITF"]`.
5. **Plano B pragmático:** o `<input capture>` do iOS entrega foto em alta
   resolução com foco travado. Decodificar uma FOTO com `zxing-wasm` é bem mais
   fácil que decodificar vídeo. Um botão "tirar foto do código" pode ser mais
   confiável do que o vídeo ao vivo, e resolve a entrega desta semana.

## Como reproduzir e o que coletar

1. Abrir `https://alianca-log.vercel.app` no iPhone, logar como motorista.
2. `/motorista/assumir` → "Abrir câmera" → bipar o DANFE.
3. **Anotar o "Código lido"** que aparece na tela de erro (o app mostra o texto
   cru, o número de caracteres e se são só dígitos).
4. Se possível, conectar o Safari ao Web Inspector do Mac e capturar o console —
   é onde os erros do WASM apareceriam.

Chave de referência para comparar qualquer leitura:
`43260921302723000115550010000246851647841366` (NF 24685).
