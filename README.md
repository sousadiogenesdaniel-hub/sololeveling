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
| **Mais** | Atividades extras, Condição (sono, foco, energia e celular na cama, com padrões; sem penalidade), Medidas (diárias: peso e abdômen; semanais), Fotos (galeria e antes × depois), Loja, Penalidades, Registro do Sistema e Perfil. |

## Regras do jogo

- **Treino concluído:** +100 XP e +100 Ouro. Todas as séries marcadas: +20 XP.
- **Medidas do dia** (peso e abdômen): +5 XP. **Condição** de um dia registrada inteira (sono, celular na cama,
  energia e foco), até o dia seguinte: +5 XP, seja qual for a resposta. **Medidas semanais:** +30 XP. **Dia dentro
  da meta de calorias:** +20 XP.
- **Gasto do dia** (Início, Comida e Evolução): repouso × 1,2 + a soma de tudo o que foi feito: missão, atividades extras,
  Dungeon de Campo, as outras dungeons (a parte de força, pelo tempo lá dentro, MET 8, até 2 h; as corridas pelo GPS já
  entram como atividade) e os impulsos vencidos. O Início mostra de onde veio cada parte.
- **Atividades extras do dia** (somadas; o percurso da Dungeon de Campo não entra): a partir de 250 kcal, +10 XP e +1 HP; acima
  de 700 kcal, mais +20 XP e +2 HP (o HP só com o Manto do Necromante). Editar ou excluir recalcula. A tela mostra a
  barra do dia até as duas faixas e um diário (como o da Comida): totais da semana e do mês e cada dia com as suas
  atividades, kcal e XP.
- **Passos** (app Android 2.2): na caminhada, trilha e corrida rastreadas pelo GPS, o app conta os passos com o contador
  do próprio celular (permissão "Atividade física"). Aparecem ao vivo, ficam na atividade salva e somam no diário. Só
  informativo: não muda kcal, XP nem a Dungeon de Campo.
- **Séries da missão:** cada quadradinho tem som e faísca (no alvo: verde e brilhante; abaixo do alvo: âmbar e grave;
  desmarcar: clique). Fechar todas as séries de um exercício toca um acorde; fechar o treino inteiro, uma fanfarra.
- **Missão concluída:** ao bater o ponto de saída, antes das comemorações de nível e rank, um selo animado:
  "Missão perfeita" (verde, com faíscas) com todas as séries no alvo, ou "Missão concluída" (âmbar) com séries
  abaixo do alvo ou sem marcar.
- **A cada 7 treinos seguidos:** +50 Ouro.
- **Faltou ao treino:** −150 XP, −50 Ouro e **Zona de Penalidade** (o app fica vermelho e a Loja tranca).
- **Sair da Zona de Penalidade:** pagar a multa por PIX a cada pessoa do grupo (cadastradas em Penalidades),
  enviar o print de cada comprovante para o app ler (valor, data, hora e recebedor; o mesmo comprovante não vale
  duas vezes) e concluir um treino. Cada dia com multa pendente custa 30 XP. As imagens não são guardadas.
- **Loja:** só abre de sexta a domingo. Uma semana perfeita (6 treinos = 600 de Ouro) paga exatamente uma pizza.
- **Dungeon de Campo (no lugar da antiga missão bônus de GPS):** opcional: o jogador escolhe entrar (animação com som)
  e escolhe o percurso. Lá dentro é **um percurso só**, rastreado pelo GPS do começo ao fim (pode pausar; não dá para
  editar): 5 km correndo, 10 km de caminhada, 10 km de trilha ou 35 km de bike. **Uma tentativa por tipo no dia**: só a
  primeira de cada tipo conta (desistir antes de 100 m não gasta). O percurso da dungeon **não é atividade extra**
  (não soma para as faixas de 250/700 kcal nem para a corrida das outras dungeons), mas as calorias entram no gasto do
  dia. Vence num dia de missão cumprida (1 por dia; o prêmio entra ao concluir a missão): **+125 Ouro** em semana sem
  falta; em semana com falta, **+75** se as
  últimas 3 missões foram cumpridas (o descanso não quebra a sequência). Às vezes vem uma surpresa (sem itens do
  Arsenal nem corpos). Cada vitória entra no Registro de Dungeons (card verde). **Bônus da dieta:** semana inteira
  dentro da meta de calorias, +150 (só em semana sem falta). Nada na Zona de Penalidade; até 300 de Ouro de bônus por
  semana. A semana do jogo começa no dia seguinte ao descanso (descanso na sexta → sábado a sexta). O rastreamento
  tem pausa (o tempo parado não conta).
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
  (60–100 Ouro ou "XP em dobro na próxima missão"), Épico 7% (150–250 Ouro), Lendário 1% (350–500 Ouro). Treino com
  todas as séries no alvo dá +5% de sorte. Itens do Arsenal não caem do baú.
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
  própria (Aprendiz das Sombras → … → Monarca das Sombras).
- **Registro das Sombras:** 100 sombras com nome e número (#001–#100): 65 Soldados, 20 Elites, 10 Cavaleiros, 4
  Comandantes (O Carmesim, O Devorador, O Asa Negra, O General das Mil Lâminas) e O Marechal das Trevas. Por rank:
  D 20, C 25, B 25, A 20, S 10; uma sombra só se levanta com o jogador no rank dela ou acima, então o Registro só fecha
  no S (título Mítico "Rei dos Mil Soldados"). As que faltam aparecem como silhueta "???" com o grau.
  Cada feito deixa um corpo: recorde (Soldado, no máximo 1 por prova a cada 7 dias), marco (Soldado ou Elite), Dungeon
  comum (Elite, às vezes Cavaleiro), Vermelho (Cavaleiro + esquadrão de 3 Soldados), de Emergência (esquadrão de 2),
  Inferno e Trono (esquadrão de 5) e chefe do Teste de Rank (Comandante). Só Soldados vêm em esquadrão. "Levante-se!"
  extrai: Soldado 80%, Elite 50%, Cavaleiro 35% por tentativa (+ pontos do livro), 3 tentativas (falhou 3 vezes, o
  corpo vira cinzas; a sombra com nome continua disponível); Comandante nunca falha. Sem sombra livre daquele grau no
  seu rank, o corpo é absorvido: +20 XP para cada sombra. O **Marechal** só se levanta com os 6 livros e o Manto no
  Arsenal: 40% (+ pontos do livro), +20% a cada falha, nova tentativa 14 dias depois, nunca vira cinzas.
  **Nível e evolução:** +10 XP por missão, 1 nível a cada 10 missões (até o 30). Soldado vira Elite no nível 10 com o
  jogador no rank C+; Elite vira Cavaleiro no 20 com o jogador no B+. O nome fica (Cavaleiro ganha "Cavaleiro" antes).
  A evolução tem animação própria (a silhueta pisca entre as duas formas e revela a nova); as subidas de nível vêm
  numa janela só, depois da missão. Por missão: +1 Ouro por Soldado e +3 por Cavaleiro (até +40), +1% de sorte no baú
  por Elite (até +10%). **Invocação** de um Comandante 1 vez por semana (ex.: O Carmesim = baú da missão de hoje no
  mínimo Raro). Com o Anel do Domínio equipado, a invocação da semana pode chamar todos os seus Comandantes de uma vez.
  Nada disso alivia penalidade.
- **Visual por classe e rank:** o losango do rank tem a cor do rank (E cinza, D verde, C azul, B roxo, A vermelho,
  S dourado). Humano usa o azul de sempre; o Necromante tem fundo preto-arroxeado com fumaça e destaque em roxos do D
  (claro) ao A (roxo imperial com brilho); no S, preto e dourado. A Zona de Penalidade (vermelha) vence tudo. A
  extração de cada grau tem a sua animação, mais longa e exclusiva quanto mais alto o grau (Soldado ~3 s, Marechal
  ~9 s com mensagem do Sistema, asas, coroa e clarão dourado).
- **Arsenal** (por classe; hoje, o do Necromante): 21 itens com desenho, história e animação e som próprios ao
  tocar: 9 armas, 6 livros de invocação, 5 anéis e o Manto. Por rank: D 5, C 8, B 4, A 3, S 1. Raridades: 10 Comuns,
  5 Raros, 4 Épicos e 2 Lendários. Os não obtidos aparecem como silhueta "???" com a raridade; os Lendários têm aura
  dourada. A ficha mostra poder, onde cai, quando, nível e rank em que caiu e a história. Um de cada espaço equipado:
  **arma** = +5/10/15/25% de Ouro (missões, Dungeons e baús); **anel** = mesma % de XP (missões e Dungeons); **livro** =
  +3/5/8/12 pontos na chance de extração; **Manto** = HP. O Manto vem com a classe (rank D); os outros caem só dos
  Dungeons, nunca repetidos, em qualquer rank igual ou maior que o do item: Dungeon comum dá Comum (30%), de Emergência
  Comum ou Raro (40%), Vermelho Raro ou Épico (50%). Com item, metade das vezes vem só ele, sem baú. Os itens
  provisórios de antes viraram Ouro.
- **HP e dia de folga:** o Manto guarda HP: +1 por missão, por Dungeon vencido e por dia de atividades com 250 kcal
  (+2 acima de 700); uma falta tira 25. Guarda até 100. Com 100 HP, troque por um dia de folga: sem missão e sem
  penalidade, só no próprio dia e antes de cumprir a missão (nunca apaga uma falta).
- **Dungeons nomeadas:** o **Dungeon do Inferno** (abre no rank A, dá o Grimório da Noite Eterna, o 6º livro) e o
  **Dungeon do Trono** (abre no S, dá o Anel do Domínio). Avisam ao abrir e dão 7 dias para escolher o dia. Desafio:
  todas as provas da fase a 110–120% do último máximo, em até 2 séries somadas (sem chegar à meta do próximo teste),
  100 burpees, 200 afundos, 21 km de corrida e 40 km de bike pelo GPS do app; umas 4 h ou mais. No dia, quem entra
  não deve a missão diária. Vencer: o item Lendário, +1000 XP e +500 Ouro. 3 chances por rank (a próxima abre 2 a 6
  semanas depois); gastou as 3, volta no rank seguinte; no S, 3 meses depois. Nunca some.
- **Dungeons:** um por semana, num dia sorteado e sem aviso, com desafio calculado pelos máximos (contra o relógio,
  circuito ou resistência) e 48 h para entrar. Normal (73%, opcional: +100 XP, baú Épico+, corpo e chance de item),
  Red (15%, mais difícil; depois de entrar, sair ou estourar o tempo custa 50 XP) e de Emergência (12%,
  obrigatório: ignorar ou falhar custa 150 XP e 50 Ouro, sem Zona de Penalidade). Nunca na Zona de Penalidade nem
  colado num Teste de Rank. Não substitui a missão do dia.
- **Teste de Rank como chefe:** o card mostra o chefe com barra de vida; cada prova é uma parte da vida dele.
- **Impulso:** bateu a vontade de um vício, o Sistema dá na hora um desafio de 1 a 10 min; os 3 primeiros do dia dão
  +15 XP e todos contam para títulos.
- **Toque de recolher** (app Android 1.8): todo dia das 20h às 8h, os apps da Zona de Penalidade (Chrome incluído) custam
  Ouro e XP para usar: 15 min por vez, 20 + 20 na primeira liberação da noite e dobrando a cada vez (até 640). Sem
  saldo, não libera. A tela do bloqueio oferece "Vencer o impulso" no lugar de pagar. Depois das 5h, abrir O Sistema
  pergunta se quer liberar a manhã. As cobranças entram no Registro na próxima abertura do app. Na Zona de
  Penalidade vale o bloqueio total. Desligar leva 24 h.
- **Conteúdo das dungeons:** cada dungeon sorteia calistenia, corrida ou as duas, pela trilha principal (Calistenia:
  55% só calistenia, 30% as duas, 15% só corrida; Corrida: o inverso; outra trilha: 45/30/25). A corrida é feita
  rastreando pelo GPS em Atividades depois de entrar, dentro do tempo da dungeon. A distância vem da corrida mais
  longa dos últimos 60 dias pelo GPS (ou da prova "Correr sem parar", ou 2 km para começar), vezes o fator do tipo
  (Red ×1,3, Emergência ×0,85); o tempo é a distância no seu ritmo × 1,25.
- **Contadores** (no fim de Evolução): quanto você já fez de cada exercício nas missões. Primeiro os exercícios das
  provas do Teste de Rank, agrupados pela família dos marcos, com a barra até o próximo marco da família; depois os
  outros. Conta as séries marcadas × o alvo; "cada perna/lado" conta os dois lados.
- **Registro de Dungeons:** cada dungeon vencida vira um card numerado por tipo (Dungeon #001, Red Dungeon #001,
  Dungeon de Emergência #001; as nomeadas só com o nome), com a cor do tipo (azul, vermelho, laranja), o desafio, os
  exercícios, o tempo e o que foi recebido. Só aparecem as vencidas. Filtro por tipo e por rank (Mais → Registro de
  Dungeons).
- **Abertura da Missão:** ao entrar na aba Missão, o personagem da classe aparece com "MISSÃO DIÁRIA" e o treino do
  dia; completa na primeira vez do dia, curta nas outras. A imagem vem de icons/classes/<classe>.png (Humano por
  enquanto); sem ela, uma silhueta.
- **Ritual do dia (Meu porquê):** na primeira abertura de cada dia, antes de qualquer aviso, uma tela com três fotos
  de frente (Antes, que você escolhe; Agora, a foto de frente mais recente de Fotos; Meta, que você escolhe), a linha
  do que falta e da missão de hoje, e uma mensagem sua escolhida pelo contexto (Geral, Depois de uma falta, Zona de
  Penalidade, Semana perfeita, Dia de Teste ou Dungeon, Noite), sem repetir as últimas 3. O botão "Eu lembro" só ativa
  depois de 5 s e precisa ser segurado. Configura em Mais → Meu porquê; vazio, o ritual não aparece. As mensagens de
  Noite e da Zona de Penalidade com até 90 caracteres também aparecem numa linha nas telas de bloqueio (app Android 2.0).
  Tudo fica só no aparelho.
- **Trilha escolhida:** cada trilha tem a sua animação com som ao ser iniciada (Calistenia: a silhueta sobe na barra;
  Corrida: contagem, pegadas e largada). O jogador começa sem trilha; o Início avisa que o jogo começa quando escolher.
- **Card de conquista** para compartilhar no WhatsApp (rank, recorde, título, sombra, item do Arsenal, Dungeon, relatório). No app
  Android precisa da versão 1.7.

## Como o treino é verificado

1. Cadastre sua casa no Perfil (uma vez, estando em casa).
2. No local de treino, toque em **Bater ponto: entrada**. Só vale a mais de 1 km de casa, com GPS preciso
   (a distância é contada descontando a margem de erro do GPS; localização aproximada é recusada).
   Com **locais de treino** cadastrados (até 3, na tela Missão), entrada e saída só valem num raio de 100 m
   de um deles (+ até 50 m de margem do GPS). O primeiro local vale na hora; os seguintes, só 3 dias depois.
3. Depois de pelo menos 30 min, toque em **Bater ponto: saída**, ainda no local.

**Chuva forte:** o botão "Verificar clima" consulta a previsão (Open-Meteo, com coordenadas arredondadas): o agora,
a última hora e a próxima (de 15 em 15 min) e a previsão do dia. Se confirmar chuva forte, libera o treino em casa:
25 min no cronômetro, todas as séries e uma selfie no final. Se a previsão não vir a chuva que está caindo, dá para
provar com uma foto da chuva, até 2 vezes por mês (a foto fica guardada como prova). Garoa não vale.

**Modo viagem:** em Missão (Locais de treino), "Estou viajando" só ativa a 50 km ou mais de casa (GPS preciso). Na
viagem, o ponto vale em qualquer lugar a 50 km+ de casa, com a saída no mesmo lugar da entrada e o tempo mínimo de
sempre; a chuva é conferida onde você está. Não precisa informar datas: o modo acaba sozinho no primeiro ponto batido
perto de casa. Chegou a 30 dias, o app pergunta quantos dias a mais você fica (até responder, o ponto de viagem não
vale). O dia de estrada é um dia normal: sem treino, é falta (a folga de 100 HP fica a critério do jogador).

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
