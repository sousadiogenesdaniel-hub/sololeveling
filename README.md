# O Sistema

App pessoal de evolução fitness em formato de RPG, inspirado na estética de "janela do Sistema":
missões diárias, XP, níveis, ranks (E a S), Ouro e Zona de Penalidade.

É um PWA: um site que se instala na tela inicial do celular e funciona offline.
Não tem servidor nem conta. Todos os dados ficam no próprio aparelho (IndexedDB).

## O que tem

| Tela | Conteúdo |
|---|---|
| **Início** | Resumo do dia: missão diária, quantas calorias ainda pode consumir, macros, lembretes (com atalho para registrar), sequência, contagem para a Loja, peso e dívida do mês. |
| **Missão** | Treino do dia da trilha escolhida, ponto por GPS (entrada e saída), séries para marcar, treino indoor em dia de chuva forte e Teste de Rank. |
| **Comida** | **Dieta padrão** que entra sozinha em todos os dias, e **Dia**, onde você altera só aquele dia sem mexer na dieta. Busca na tabela TACO e alimentos próprios pelo rótulo. |
| **Evolução** | Gráficos de peso, abdômen, calorias consumidas × gastas, medidas semanais e treinos por semana. |
| **Mais** | Atividades extras, Condição (sono, foco, energia e celular na cama, com padrões; sem XP nem penalidade), Medidas (diárias: peso e abdômen; semanais), Fotos (galeria e antes × depois), Loja, Penalidades, Registro do Sistema e Perfil. |

## Regras do jogo

- **Treino concluído:** +100 XP e +100 Ouro. Todas as séries marcadas: +20 XP.
- **Medidas do dia:** +10 XP. **Medidas semanais:** +30 XP. **Dia dentro da meta de calorias:** +20 XP.
- **A cada 7 treinos seguidos:** +50 Ouro.
- **Faltou ao treino:** −150 XP, −50 Ouro e **Zona de Penalidade** (o app fica vermelho e a Loja tranca).
- **Sair da Zona de Penalidade:** pagar a multa por PIX a cada pessoa do grupo (cadastradas em Penalidades),
  enviar o print de cada comprovante para o app ler (valor, data, hora e recebedor; o mesmo comprovante não vale
  duas vezes) e concluir um treino. Cada dia com multa pendente custa 30 XP. As imagens não são guardadas.
- **Loja:** só abre de sexta a domingo. Uma semana perfeita (6 treinos = 600 de Ouro) paga exatamente uma pizza.
- **Missões bônus (só Ouro, nunca XP):** atividade de 5 km+ rastreada por GPS (bike 15 km) num dia de missão
  cumprida (1 por dia; registro manual não vale): **+125** em semana sem falta; em semana com falta, **+75** se as
  últimas 3 missões foram cumpridas (o descanso não quebra a sequência). Semana inteira dentro da meta de calorias:
  +150 (só em semana sem falta). Nada na Zona de Penalidade; até 300 por semana. A semana do jogo começa no dia
  seguinte ao descanso (descanso na sexta → sábado a sexta). O rastreamento tem pausa (o tempo parado não conta).
- **Nível e rank são separados.** O **nível** mede a constância: vem do XP, começa rápido (~1 nível por missão
  na 1ª semana) e desacelera (cada nível pede 16 XP a mais que o anterior); jogando perfeito, nível ~29 em 2 meses,
  ~77 em 1 ano e 100 em ~20 meses, sem teto. O **rank** mede o que o corpo faz: vem só do Teste de Rank. Passou,
  sobe na hora, em qualquer nível, e a trilha já passa para a fase seguinte. Com várias trilhas, cada uma tem o seu
  rank e o do jogador é o melhor deles.
- **Meta de calorias automática** (opcional, no Perfil): toda semana recalcula gasto − déficit pelo peso de tendência;
  depois de ~5 semanas, também pelo que você comeu e emagreceu de fato. Muda no máximo 100 kcal por semana,
  respeita um piso e, perto da meta, reduz o déficit até virar manutenção.
- **Comemorações:** subir de nível tem uma animação curta e subir de rank, uma mais longa, com som (desligável no Perfil).
- **Trocar de trilha** não mexe em XP, nível, rank, Ouro nem sequência; os testes já passados continuam valendo.
- **Várias trilhas (opcional):** no Perfil, "Iniciar outra trilha" mantém a atual. Com 2+ trilhas, a missão do dia
  continua uma só e qualquer trilha ativa vale; a Missão sugere a que está há mais tempo sem treino (e evita emendar
  dois treinos pesados de pernas). XP, nível, Ouro, sequência e penalidade são do jogador; fase, etapa, fila,
  máximos, Avaliação e rank são de cada trilha. Uma trilha nova abre o **Nivelamento**: o teste do rank já vale desde
  a etapa 1 (média de 2 tentativas) até o primeiro treino normal dela. Com uma trilha só, nada disso aparece.
- **Trilhas:** Calistenia e Corrida, cada uma com 5 fases (uma por rank). O S da calistenia exige 100 flexões,
  50 mergulhos, 30 barras, 300 agachamentos e 300 abdominais seguidos; o da corrida, uma maratona. Barra fixa só
  entra a partir do rank D. O volume sobe a cada 6 treinos com todas as séries no alvo (série tocada 2× = abaixo
  do alvo, não sobe a carga), com semana leve a cada 4 etapas. Só a meta atual fica visível.
- **Fila de treinos:** os 6 treinos da semana seguem em fila, não pelo dia da semana. O próximo é sempre o que
  vem depois do último concluído; faltou, o mesmo treino fica para o dia seguinte e é ele que tira da penalidade.
- **Teste de Avaliação e treino calibrado:** o jogador registra o seu máximo em cada prova do Teste de Rank
  (1 vez por semana; tentativas de Teste de Rank também atualizam). Os números aparecem como Status na trilha
  (máximo / meta) e ajustam os treinos: séries de ~70% a ~85% do máximo e série longa de ~90% a ~115%,
  nunca abaixo da tabela. Testes: D 25 flexões, 12 mergulhos, 18 remadas, 75 agachamentos, 60 abdominais,
  15 elevações de joelhos, 90 s de prancha; C 40/18/5 barras/120/100/20/2 min; B 55/25/12/160/160.
  O modelo anterior está salvo no branch `modelo-anterior-ranks`.
- **Dia de Avaliação / Dia de Teste de Rank:** na Missão, escolher um deles faz as provas valerem como a missão do
  dia (com ponto e mínimo de 30 min). O treino da fila fica para amanhã e o dia não conta para subir a carga.
  Na Zona de Penalidade, o Dia de Avaliação vale como redenção (o treino pendente continua na fila e passa para
  o dia seguinte); o Dia de Teste de Rank não aparece na penalidade.
- **Teste antecipado:** a partir da metade das etapas da fase. Vale pela **média de 2 tentativas em dias
  diferentes** (a 2ª de 2 a 7 dias depois da 1ª), para um dia inspirado não enganar o Sistema; o app mostra quanto a
  2ª precisa em cada prova. No fim da fase, uma tentativa basta. Reprovou: nova tentativa em 7 dias, sem punição.
  Passou: rank na hora, próxima fase, +500 XP e +300 Ouro.
- **Dieta (conferida no dia seguinte, sem Zona de Penalidade):** até 100 kcal acima da meta, nada; acima disso,
  −10 XP e −10 Ouro a cada 100 kcal (máx. −150 XP e −100 Ouro por dia). Compra na Loja libera 2 kcal por Ouro gasto.

## Recompensas

- **Baú do Sistema:** toda missão concluída abre um baú com animação. Chances base: Comum 70% (10–40 Ouro), Raro 22%
  (60–100 Ouro ou "XP em dobro na próxima missão"), Épico 7% (150–250 Ouro, 30% de equipamento), Lendário 1%
  (350–500 Ouro e equipamento). Treino com todas as séries no alvo dá +5% de sorte.
- **Recordes e marcos:** superar o melhor histórico numa prova (Avaliação ou Teste de Rank) mostra "Novo recorde!".
  Contadores da vida inteira (flexões, agachamentos, abdominais, barras, mergulhos, remadas, prancha, km) têm marcos
  (100, 500, 1.000…). **Relatório semanal** ao abrir o app no começo da semana do jogo, comparando com a anterior.
- **Janela de Status:** atributos de 10 a 100 tirados dos dados reais: Força (máximos × metas do rank S), Agilidade
  (maior distância corrida sem parar × maratona), Vitalidade (caminho até o peso-meta), Percepção (dias com peso
  registrado), Inteligência (dias na meta de calorias) e Disciplina (missões nos dias cobrados).
- **Títulos** com raridade (Comum, Raro, Épico, Lendário, Mítico), alguns secretos, na Sala dos Títulos. O título
  escolhido aparece embaixo do nome; um título novo mais raro entra sozinho.
- **Classe e Exército das Sombras:** todo mundo começa como Humano; vencer o chefe do rank D libera a mudança de
  classe (Necromante; Mago, Guerreiro, Assassino e Tanque "em construção"). O Necromante tem uma escada de títulos
  própria (Aprendiz das Sombras → … → Monarca das Sombras). Cada feito deixa um corpo: recorde (Soldado, no máximo 1 por prova a cada 7 dias),
  marco (Soldado ou Elite), Portão (Elite/Cavaleiro) e chefe do Teste de Rank (Comandante, com nome próprio: o do D é o
  Cavaleiro Carmesim). "Levante-se!" extrai a sombra: Soldado 80%, Elite 50%, Cavaleiro 35% por tentativa, 3 tentativas
  (falhou 3 vezes, vira cinzas); Comandante nunca falha. As sombras ganham XP a cada missão (Soldado → Elite no nível 10,
  Elite → Cavaleiro no 20). Por missão: +1 Ouro por Soldado e +3 por Cavaleiro (até +40), +1% de sorte no baú por Elite
  (até +10%). **Invocação** de um Comandante 1 vez por semana (ex.: Cavaleiro Carmesim = baú da missão de hoje no mínimo
  Raro). Nada disso alivia penalidade.
- **Equipamentos** (arma, manto, acessório) caem de baús Épicos/Lendários, Portões e chefes; repetido vira Ouro.
- **Portões:** um por semana, num dia sorteado e sem aviso, com desafio calculado pelos máximos (contra o relógio,
  circuito ou resistência) e 48 h para entrar. Normal (73%, opcional: +100 XP, baú Épico+, corpo e 25% de item),
  Vermelho (15%, mais difícil; depois de entrar, sair ou estourar o tempo custa 50 XP) e de Emergência (12%,
  obrigatório: ignorar ou falhar custa 150 XP e 50 Ouro, sem Zona de Penalidade). Nunca na Zona de Penalidade nem
  colado num Teste de Rank. Não substitui a missão do dia.
- **Teste de Rank como chefe:** o card mostra o chefe com barra de vida; cada prova é uma parte da vida dele.
- **Impulso:** bateu a vontade de um vício, o Sistema dá na hora um desafio de 1 a 10 min; os 3 primeiros do dia dão
  +15 XP e todos contam para títulos.
- **Card de conquista** para compartilhar no WhatsApp (rank, recorde, título, sombra, Portão, relatório). No app
  Android precisa da versão 1.7.

## Como o treino é verificado

1. Cadastre sua casa no Perfil (uma vez, estando em casa).
2. No local de treino, toque em **Bater ponto: entrada**. Só vale a mais de 1 km de casa, com GPS preciso
   (a distância é contada descontando a margem de erro do GPS; localização aproximada é recusada).
   Com **locais de treino** cadastrados (até 3, na tela Missão), entrada e saída só valem num raio de 100 m
   de um deles (+ até 50 m de margem do GPS). O primeiro local vale na hora; os seguintes, só 3 dias depois.
3. Depois de pelo menos 30 min, toque em **Bater ponto: saída**, ainda no local.

**Chuva forte:** o botão "Verificar clima" consulta a previsão (Open-Meteo, com coordenadas arredondadas).
Se confirmar chuva forte, libera o treino em casa: 25 min no cronômetro, todas as séries e uma selfie no final.

## Como publicar e instalar no celular

O app é só arquivos estáticos, sem etapa de build. O GPS exige HTTPS, então ele precisa estar hospedado.

**GitHub Pages:** no repositório, vá em *Settings → Pages*, escolha *Deploy from a branch*, selecione a branch
`main` e a pasta `/ (root)`. Em um ou dois minutos o endereço aparece nessa mesma página.
(No plano gratuito do GitHub, o Pages exige repositório público. O código fica visível, mas seus dados não:
eles nunca saem do aparelho.)

**No Android:** abra o endereço no Chrome → menu ⋮ → **Adicionar à tela inicial / Instalar app**.
Permita a localização quando o app pedir.

**Para testar no computador:**

```bash
python3 -m http.server 8000
```

Depois abra `http://localhost:8000`.

## App Android (opcional)

Em **Mais → App Android** há o instalador (`download/o-sistema.apk`, menos de 1 MB, fora da Play Store).
É o mesmo app, com o **bloqueio de WhatsApp, Gmail, redes sociais e streaming na Zona de Penalidade** (mesmo sem abrir o app),
lembrete da missão e dados a salvo de "limpar dados do navegador". Detalhes, permissões e build em
[`android/README.md`](android/README.md).

## Backup

Os dados ficam só no aparelho. Em **Perfil → Baixar backup** sai um arquivo `.json` com tudo, menos as fotos.
Se você limpar os dados do navegador ou desinstalar o app sem backup, perde o histórico.

## Estrutura

```
index.html, manifest.webmanifest, sw.js   casca do PWA
css/styles.css                            tema (azul; vermelho na Zona de Penalidade)
js/app.js, core.js                        inicialização, rotas e eventos
js/store.js                               estado e fotos no IndexedDB
js/game.js                                XP, nível, rank, Ouro, fechamento dos dias, penalidades
js/tracks.js                              trilhas, fases, exercícios e progressão de carga
js/ocr.js                                 leitura dos comprovantes de PIX (Tesseract.js, no aparelho)
js/views/                                 telas
data/taco.json                            Tabela TACO (NEPA/UNICAMP)
vendor/                                   Chart.js e Tesseract.js (embutidos para funcionar offline)
```

Para simular outra data em testes: `?hoje=AAAA-MM-DD` na URL.
