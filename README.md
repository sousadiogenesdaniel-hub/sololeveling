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
- **Loja:** só abre na sexta e no sábado. Uma semana perfeita (6 treinos = 600 de Ouro) paga exatamente uma pizza.
- **Missões bônus (só Ouro, nunca XP):** atividade de 5 km+ rastreada por GPS (bike 15 km) num dia de missão
  cumprida: +75 (1 por dia; registro manual não vale). Semana inteira dentro da meta de calorias: +150. Só em
  semana sem falta e fora da Zona de Penalidade, até 300 por semana. A semana do jogo começa no dia seguinte ao
  descanso (descanso na sexta → sábado a sexta).
- **Nível e rank:** cada nível pede 34 XP a mais que o anterior. Cada rank exige o nível mínimo **e** o Teste
  de Rank da sua fase (em qualquer trilha); vale o que vier por último. D: nível 18 + teste Despertar (~2 meses),
  C: 28 + Fundação (~4 meses), B: 40 + Ascensão (~7 meses), A: 52 + Elite (~1 ano), S: 68 + Monarca (~20 meses).
  O nível chega poucas semanas antes do teste; o nível não tem teto.
- **Meta de calorias automática** (opcional, no Perfil): toda semana recalcula gasto − déficit pelo peso de tendência;
  depois de ~5 semanas, também pelo que você comeu e emagreceu de fato. Muda no máximo 100 kcal por semana,
  respeita um piso e, perto da meta, reduz o déficit até virar manutenção.
- **Comemorações:** subir de nível tem uma animação curta e subir de rank, uma mais longa, com som (desligável no Perfil).
- **Trocar de trilha** não mexe em XP, nível, rank, Ouro nem sequência; os testes já passados continuam valendo.
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
  Não aparecem na Zona de Penalidade: a redenção é com o treino que ficou pendente.
- **Teste antecipado:** a partir da metade das etapas da fase dá para tentar o Teste de Rank (1 tentativa a cada
  7 dias; falhar não pune). Passou: pula para a próxima fase e ganha +500 XP e +300 Ouro, sem pular níveis.
- **Dieta (conferida no dia seguinte, sem Zona de Penalidade):** até 100 kcal acima da meta, nada; acima disso,
  −10 XP e −10 Ouro a cada 100 kcal (máx. −150 XP e −100 Ouro por dia). Compra na Loja libera 2 kcal por Ouro gasto.

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
É o mesmo app, com o **bloqueio de WhatsApp e Gmail na Zona de Penalidade** (mesmo sem abrir o app),
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
