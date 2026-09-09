# Scanner DANFE — diagnóstico e validação (09/09/2026)

## Evidências

- Vídeo recebido: 116,85 segundos, gravação de tela de 384×832 pixels. O DANFE é
  enquadrado várias vezes sem resultado visível. A prévia está **sem a mira**
  presente no HEAD 4aacc82. Isso sugere uma tela/versão anterior; o vídeo não
  comprova que o WASM chegou a executar no aparelho.
- Em produção, acesso **sem sessão** a
  /wasm/zxing_reader.wasm devolveu HTTP 307 para /login?next=… em 09/09.
  /sw.js também respondeu com redirect. Ambos passavam pelo proxy de sessão.
  Isso confirma um defeito na entrega de assets, mas não prova que a sessão
  autenticada do vídeo sofreu esse mesmo redirecionamento.
- O binário local tem SHA-256
  2ebda08a93eea3efcd8399cda6b276e6a0b1de4fec60b4d8988a047de4c6d1ba,
  idêntico ao publicado pelo pacote zxing-wasm instalado.
- O efeito da câmera dependia de onError, fornecido como função inline pelos
  dois consumidores. Qualquer render do pai reiniciava stream, foco e decoder.
- A prévia anterior usava object-cover com aspecto fixo 4:3, mas o recorte era
  calculado sobre o vídeo original. A mira e os pixels decodificados podiam
  divergir. O recorte também eliminava as extremidades horizontais.
- Um texto parcial repetido duas vezes era consultado como número de NF.
  O parser também extraía nNF de uma chave com DV inválido e tentava reconstruir
  texto Set B. O teste anterior aceitava que textos aleatórios virassem chaves:
  DV sozinho não é prova de que uma reconstrução esteja correta.

## Alterações locais

1. /wasm/ e /sw.js fora do proxy; SW v6 descarta caches anteriores e não guarda
   respostas de erro/redirect/HTML como WASM.
2. Inicialização explícita e compartilhada do WASM, com timeout de download,
   verificação de resposta e URL versionada pelo hash do pacote. Erros de carga
   e de execução aparecem na tela; há nova tentativa.
3. Uma implementação de decoder (ZXing WASM) nos navegadores, para que leitura
   ao vivo e foto passem pelo mesmo caminho validado.
4. Prévia na proporção real, sem object-cover. Faixa de 50% preservando toda a
   largura; uma tentativa a cada três examina o quadro completo em resolução
   original. Nenhuma redução da imagem antes de procurar as barras.
5. Callbacks atuais via useEffectEvent, sem reabrir câmera após render do pai.
   Encerramento do stream em erro/desmontagem e descarte de resultados tardios.
6. A câmera entrega somente chave completa, com DV, UF, mês, modelo 55 e nNF
   coerentes. Eliminadas reconstrução Set B, janelas arbitrárias e tentativa
   pelo nNF quando o DV falha. Digitação de número continua separada.
7. Assumir NF fecha a câmera antes da consulta e libera a trava inclusive quando
   a requisição lança erro. Gerência também exige chave válida na bipagem.
8. Foto do código sem compressão de canhoto, troca de câmera, luz e zoom quando
   expostos pelo aparelho. Diagnóstico recolhido mostra versão do leitor,
   resolução real, tempo de decode e número de quadros processados.

Sem alteração de schema, RPC ou dados de produção. HANDOFF-scanner.md recebido
foi preservado; suas hipóteses não foram tratadas como conclusões comprovadas.

## Validação executada

- npm run test:scanner: 13 verificações, incluindo binário/hash e decodificação
  real de PNGs Code128 (horizontal, vertical e 180 graus). Rejeita seis dígitos,
  chave com DV inválido e texto Set B sem reinterpretar.
- npm run test:scanner:browser:
  - Chromium: vídeo gerado por canvas.captureStream, com barras **fora** da faixa
    central, passou pelo componente e WASM reais. Leitura em aproximadamente
    0,4 segundo neste computador após trocar o padrão parcial pelo válido.
  - Repetir código de seis dígitos não emitiu resultado; render do pai não abriu
    outra câmera; desmontagem encerrou o stream.
  - Resposta HTML no lugar de WASM mostrou erro, encerrou câmera e permitiu retry.
  - Foto leu a chave completa, inclusive com permissão de vídeo negada.
  - Stream cuja permissão resolve depois da desmontagem também foi encerrado.
  - WebKit para Windows: WASM e leitura por foto passaram, parcial foi rejeitado.
    Esse runtime não expõe API de câmera: **não é teste da câmera no Safari/iOS**.
- npm run typecheck, npm run lint e npm run build passaram.
- HTTP no build local: WASM 200 application/wasm; sw.js 200 JavaScript;
  /motorista/assumir continua 307 para login quando não autenticado.
- Smoke de banco não foi repetido: não houve alteração de backend/schema.
- CI inclui o teste real do decoder. Teste de navegador local exige:
  npx playwright install chromium webkit
  npm run test:scanner:browser

## Aceite que depende do aparelho

Depois da publicação, fechar a aba/PWA antigo e abrir novamente. Confirmar
"Ajustar câmera / diagnóstico" → "Leitor 2 · ZXing WASM pronto" e registrar
resolução real. Testar DANFEs impressos, incluindo NF 24685, pelo menos dez
leituras por aparelho em boa luz, e medir tempo até a chave correta, falhas e
qualquer nota incorreta. Repetir em iluminação operacional e com reflexos.

A meta é leitura imediata e correta. O resultado de 0,4 s é de imagem sintética
no computador; não é promessa de desempenho de banco nem medição do iPhone.
Modelo do iPhone, foco físico, DANFE original e teste após deploy seguem pendentes.

## Referências técnicas

- [ZXing WASM — inicialização explícita e compatibilidade entre JS/binário](https://github.com/Sec-ant/zxing-wasm)
- [MOC 7, Anexo II — DANFE e Code128C](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-ii-manual-especificacoes-tecnicas-danfe-codigo-barras.pdf)
- Guias Next.js 16 instalados: lazy-loading.md, public-folder.md e proxy.md,
  em node_modules/next/dist/docs/01-app/.
