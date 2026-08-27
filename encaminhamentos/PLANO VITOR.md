# PLANO VITOR

> Plano operacional do Vitor para validar o MVP A da Alianca Log antes do piloto.
> Atualizado em 2026-08-24.

## Objetivo

O foco do Vitor agora nao e terminar codigo. O codigo central do MVP A ja esta escrito,
o deploy HTTPS esta ativo e o cache offline foi implementado. A responsabilidade principal
agora e provar, com uso real, que o sistema aguenta a operacao antes do piloto.

Ambiente de teste principal:

`https://alianca-log.vercel.app`

---

## 1. Validacao ao vivo em producao

### O que fazer

Testar o app em producao, principalmente no celular, usando fluxo real de motorista,
gerencia e cliente.

### Melhor caminho

Comecar pelos fluxos que podem falhar sem dar erro claro na tela:

1. Testar segunda tentativa de entrega `A-007`.
2. Testar fila offline.
3. Testar cold-open offline com `STORE_CACHE`.
4. Testar mapa do motorista em tempo real `A-006`.

### Como executar

Para `A-007`:

1. Motorista registra uma NF como ocorrencia, com fotos.
2. Confirmar que a NF sai do romaneio dele.
3. Confirmar que a NF reaparece no painel da gerencia como pendente/nao atribuida.
4. Atribuir a mesma NF novamente.
5. Motorista registra a segunda tentativa como aceita, com foto nova.
6. Confirmar que o comprovante mostra as duas tentativas na linha do tempo.

Para offline:

1. Abrir o app com internet.
2. Colocar o celular em modo aviao.
3. Registrar 2 ou 3 canhotos.
4. Confirmar que aparece o aviso de sem conexao.
5. Voltar a internet.
6. Confirmar que todos os registros sobem, a fila zera e a gerencia enxerga os canhotos.

Para cold-open offline:

1. Abrir romaneio com internet.
2. Fechar o app.
3. Tirar a internet.
4. Abrir o app do zero.
5. Confirmar que romaneio e NFs aparecem pelo cache local.
6. Registrar canhoto offline e confirmar que a lista local muda antes mesmo do sync.

Para mapa:

1. Colocar um motorista real em rota.
2. Abrir o dashboard da gerencia.
3. Confirmar que o marcador do motorista atualiza sem recarregar a pagina.
4. Deixar o celular sem sinal por alguns minutos.
5. Confirmar que o marcador fica antigo/cinza e nao passa impressao de posicao atual.

### Resultado esperado

Saber se o app esta confiavel para operacao real, nao apenas compilando.

---

## 2. Testar o perfil `cliente_final`

### O que fazer

Entrar como cliente final e validar login, redirecionamento e isolamento de dados.

### Melhor caminho

Usar um login de cliente vinculado a uma empresa especifica e testar o que ele consegue
ver e acessar.

### Como executar

1. Entrar como `cliente_final`.
2. Confirmar que o redirecionamento cai no portal correto.
3. Confirmar que o cliente so enxerga NFs da propria empresa.
4. Tentar acessar rotas de gerencia e motorista.
5. Confirmar que o acesso e bloqueado.
6. Importar ou consultar notas e verificar se nenhuma NF de outra empresa aparece.

### Resultado esperado

Eliminar o risco R-008: cliente ver dado de outro cliente. Esse e um dos riscos mais
graves do produto.

---

## 3. Testar com dados reais da Rotta

### O que fazer

Pegar arquivos reais com o Matheus e testar importacao/importacao duplicada antes do
piloto.

### Melhor caminho

Pedir arquivos reais da operacao, nao arquivos montados para teste.

Solicitar:

- 1 `.zip` real de XMLs de carga fechada.
- 2 ou 3 planilhas/arquivos reais usados na operacao.
- Um caso com NF duplicada ou uma NF ja cadastrada para testar duplicidade.
- Lista real de motoristas.
- Lista real de empresas/clientes.

### Como executar

1. Subir o `.zip` real no perfil gerencia.
2. Conferir se todas as NFs aparecem na grade.
3. Repetir o teste no portal do cliente.
4. Verificar se o `.zip` real possui pasta interna, PDF junto, nomes estranhos ou XML
   fora do padrao.
5. Registrar qualquer erro com print, nome do arquivo e horario.

### Resultado esperado

Descobrir problemas de parser/importacao antes do cliente descobrir durante a operacao.

---

## 4. Validar duplicatas na importacao

### O que fazer

Confirmar se a correcao de duplicatas funciona na pratica.

### Melhor caminho

Testar duplicidade nos dois perfis: gerencia e cliente.

### Como executar

1. Subir um lote com NF repetida.
2. Confirmar que a linha duplicada aparece marcada em vermelho.
3. Com duas ou mais duplicadas marcadas, remover apenas uma.
4. Confirmar que as outras continuam marcadas.
5. Usar o botao "Remover N duplicadas".
6. Confirmar que todas as duplicadas sao removidas.
7. Repetir no portal do cliente.

No portal do cliente, testar tambem o caso em que a NF ja foi cadastrada por outra
empresa. Nesse caso, a NF pode ser invisivel ao cliente por RLS, mas a mensagem precisa
explicar que ela pode ter sido enviada antes pela transportadora.

### Resultado esperado

O usuario precisa entender exatamente qual NF deu problema e conseguir corrigir o lote
sem tentativa e erro.

---

## 5. Validar foto e usabilidade em campo

### O que fazer

Testar o app no ambiente real do motorista.

### Melhor caminho

Usar celular real, de preferencia no contexto mais parecido possivel com entrega.

Testar com:

- Sol na tela.
- Pressa.
- Canhoto amassado.
- Caneta fraca.
- Foto dentro da cabine.
- Sinal ruim.
- Toque com dedo grande ou luva, se isso fizer parte da realidade deles.

### Como executar

1. Abrir o app do motorista em celular real.
2. Fazer uma entrega completa.
3. Confirmar que a foto de chegada e obrigatoria.
4. Fotografar canhoto em condicoes ruins.
5. Abrir o comprovante depois.
6. Dar zoom e confirmar se assinatura, carimbo e informacoes principais ficam legiveis.
7. Observar se os botoes sao faceis de tocar em campo.

### Resultado esperado

Garantir que o comprovante tem valor operacional e probatorio. Se a assinatura ou o
carimbo nao ficam legiveis, a compressao precisa ser ajustada antes do piloto.

---

## 6. Escrever criterios de sucesso do piloto

### O que fazer

Transformar "vamos testar" em uma validacao objetiva.

### Melhor caminho

Alinhar com Matheus um criterio simples, por escrito, antes do piloto comecar.

Sugestao de criterio:

- Piloto com 2 ou 3 motoristas.
- Duracao de 5 dias uteis.
- Pelo menos 95% das entregas registradas pelo app.
- Zero perda de canhoto no sync.
- Dashboard usado pelo Matheus sem depender de pedido manual.
- Toda falha registrada com print, horario, usuario e contexto.

### Resultado esperado

No fim do piloto, o time consegue dizer "passou" ou "nao passou" com base em fatos,
sem depender de opiniao.

---

## 7. Trazer listas para o Luis criar acessos reais

### O que fazer

Entregar dados organizados de usuarios e clientes para criacao dos acessos reais.

### Melhor caminho

Montar uma planilha simples com os dados minimos necessarios.

Para motoristas:

- Nome.
- Telefone ou e-mail.
- Veiculo, se aplicavel.
- Observacao operacional, se houver.

Para empresas/clientes:

- Razao social.
- Nome curto.
- CNPJ, se tiver.
- Contato responsavel.
- Se tera acesso ao portal do cliente.

Para gerencia:

- Quem sera coordenador.
- Quem tera acesso administrativo.

### Resultado esperado

Luis consegue criar logins reais sem ficar pedindo informacao picada.

---

## 8. Conduzir piloto e treinamento

### O que fazer

Preparar a primeira operacao assistida com motoristas reais.

### Melhor caminho

Comecar pequeno, com motoristas mais colaborativos e acompanhamento proximo.

### Como executar

1. Escolher 2 ou 3 motoristas.
2. Fazer treinamento curto direto no celular.
3. Criar um guia de 1 pagina com o fluxo principal.
4. Treinar o coordenador para acompanhar o dashboard.
5. Rodar o piloto por 5 dias uteis.
6. Registrar falhas com print, horario, usuario e contexto.
7. Revisar os problemas antes de expandir para todos.

Fluxo minimo do guia:

1. Abrir romaneio.
2. Registrar chegada.
3. Fotografar canhoto.
4. Escolher aceita, recusada ou ocorrencia.
5. Confirmar envio.
6. Verificar se sincronizou.

### Resultado esperado

O cliente aprende usando, e o time captura ajustes reais antes de expandir para toda a
operacao.

---

## 9. Decisoes para Fase B

### O que fazer

Nao iniciar Fase B no escuro. Primeiro validar MVP A, depois decidir o proximo bloco.

### Melhor caminho

Depois da validacao do MVP A, alinhar com Matheus e Luis:

- Roteirizacao: Google Routes ou OSRM/VROOM.
- Financeiro: tarifa por empresa.
- Financeiro: custo por km.
- Financeiro: custo por hora.
- Prioridade do proximo bloco: exportacao, KPIs, financeiro ou notificacoes.
- Web Push antes de pensar em loja de app.

### Resultado esperado

Fase B comeca com decisao de negocio, nao apenas por vontade tecnica.

---

## Ordem recomendada

1. Validacao ao vivo em producao.
2. Teste do perfil `cliente_final`.
3. Dados reais e importacao.
4. Fluxo de duplicatas.
5. Foto e usabilidade em campo.
6. Criterios de sucesso do piloto.
7. Listas para o Luis criar acessos reais.
8. Piloto assistido e treinamento.
9. Decisoes da Fase B.

## Registro das falhas

Toda falha encontrada deve ser registrada com:

- Print ou video curto.
- Usuario usado no teste.
- Perfil: gerencia, motorista ou cliente.
- Horario aproximado.
- O que estava sendo feito.
- Resultado esperado.
- Resultado que aconteceu.
- Se havia internet ou modo aviao.
- Arquivo usado, quando for teste de importacao.

