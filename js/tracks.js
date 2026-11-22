// Trilhas de treino. Cada trilha tem 5 fases, uma por rank (D, C, B, A, S).
// Cada fase tem N etapas; uma etapa avança a cada 6 treinos com todas as séries no alvo.
// Progressão: o VOLUME (séries × reps) cresce de forma contínua do início ao fim da fase; quando entra
// uma série nova, as reps se redistribuem (sem salto de volume). A cada 4 etapas há uma semana leve (−30%).
// No fim da fase, o Teste de Rank libera o rank seguinte e revela a próxima meta.
import { S } from "./store.js";
import { today, addDays, daysBetween } from "./util.js";
import { registrarRecorde } from "./feitos.js";

export const SESSIONS_PER_STAGE = 6;
export const DELOAD_EVERY = 4, DELOAD_FACTOR = 0.7;

// exercício: [nome, sériesIni, repsIni, sériesFim, repsFim, unidade, dica]
// Fase 1 sem barra fixa (só paralelas e banco). Barra fixa entra a partir do rank D.
const cal = {
  id: "calistenia", nome: "Calistenia", icone: "💪", met: 6,
  resumo: "6 treinos por semana com o peso do corpo: paralelas, banco e, a partir do rank D, barra fixa. Do zero a 100 flexões seguidas.",
  phases: [
    {
      nome: "Despertar", rank: "D", prazo: "2 meses", stages: 8,
      meta: "Criar o hábito e a base: flexões, mergulhos e remadas com boa forma. Ainda sem barra fixa.",
      tests: [
        ["Flexões seguidas", 25, "reps"], ["Mergulhos nas paralelas seguidos", 12, "reps"],
        ["Remadas australianas seguidas", 18, "reps"], ["Agachamentos seguidos", 75, "reps"],
        ["Abdominais supra seguidos", 60, "reps"], ["Elevações de joelhos nas paralelas", 15, "reps"], ["Prancha", 90, "s"],
      ],
      days: [
        ["Empurrar A — Peito e tríceps", [
          ["Flexão de braço", 3, 10, 4, 18, "reps", "Corpo reto, peito quase no chão."],
          ["Flexão com as mãos no banco", 3, 10, 3, 16, "reps", "Mais leve: soma volume sem perder a forma."],
          ["Série longa de mergulhos", 1, 6, 1, 13, "reps", "Sem parar, nas paralelas: treina para o teste."],
          ["Flexão pike", 2, 5, 3, 8, "reps", "Quadril alto, cabeça desce entre as mãos (ombros)."],
          ["Prancha", 3, 30, 3, 60, "s", "Abdômen e glúteos contraídos."],
        ]],
        ["Puxar A — Costas e bíceps", [
          ["Remada australiana nas paralelas", 3, 8, 4, 14, "reps", "Deite sob a barra, puxe o peito até ela."],
          ["Remada australiana pegada supinada", 3, 5, 3, 9, "reps", "Palmas viradas para você: mais bíceps."],
          ["Série longa de remadas australianas", 1, 10, 1, 20, "reps", "Sem parar: treina para o teste."],
          ["Superman", 3, 10, 3, 18, "reps", "Deitado de bruços, eleve braços e pernas."],
          ["Abdominal supra", 3, 20, 3, 35, "reps", "Tire só os ombros do chão, sem puxar o pescoço."],
        ]],
        ["Pernas e core A", [
          ["Agachamento", 3, 20, 4, 35, "reps", "Desça até a coxa ficar paralela ao chão."],
          ["Afundo (cada perna)", 3, 8, 3, 14, "reps", "Passo largo, joelho de trás quase no chão."],
          ["Subida no banco (cada perna)", 3, 10, 3, 15, "reps", "Suba sem impulso da perna de baixo."],
          ["Elevação de panturrilha", 3, 15, 3, 25, "reps", "Na borda do banco, amplitude total."],
          ["Elevação de joelhos nas paralelas", 3, 6, 3, 13, "reps", "Apoiado nas barras, joelhos até o peito."],
          ["Abdominal bicicleta", 3, 16, 3, 30, "reps", "Cotovelo no joelho oposto, sem pressa."],
        ]],
        ["Empurrar B — Paralelas", [
          ["Mergulho nas paralelas", 3, 4, 4, 9, "reps", "Desça até o ombro ficar na altura do cotovelo."],
          ["Flexão diamante", 3, 4, 3, 8, "reps", "Mãos juntas sob o peito (tríceps)."],
          ["Flexão aberta", 3, 6, 3, 12, "reps", "Mãos mais largas que os ombros (peito)."],
          ["Série longa de flexões", 1, 15, 1, 28, "reps", "Uma série sem parar, ritmo constante: treina para o teste."],
          ["Prancha lateral (cada lado)", 2, 20, 3, 35, "s", "Quadril alto, corpo em linha."],
        ]],
        ["Puxar B — Largura das costas", [
          ["Remada australiana nas paralelas", 4, 8, 4, 13, "reps", "Cotovelos junto ao corpo, aperte as costas."],
          ["Remada com pausa de 2 s no topo", 3, 4, 3, 8, "reps", "Segure com o peito perto da barra."],
          ["Superman em Y", 3, 10, 3, 15, "reps", "Braços em Y, polegares para cima."],
          ["Série longa de abdominais supra", 1, 25, 1, 65, "reps", "Sem parar: resistência para o teste."],
          ["Hollow hold (canoa)", 3, 15, 3, 30, "s", "Lombar colada no chão."],
        ]],
        ["Pernas e core B", [
          ["Série longa de agachamentos", 1, 35, 1, 80, "reps", "Sem parar, ritmo constante."],
          ["Agachamento búlgaro no banco (cada perna)", 3, 6, 3, 10, "reps", "Pé de trás apoiado no banco."],
          ["Ponte de glúteo unilateral (cada perna)", 3, 10, 3, 15, "reps", "Costas no chão, suba o quadril."],
          ["Panturrilha unilateral (cada perna)", 3, 10, 3, 15, "reps", "Segure no banco para equilibrar."],
          ["Elevação de joelhos nas paralelas", 3, 8, 3, 15, "reps", "Sem balançar o corpo."],
          ["Prancha", 2, 45, 2, 95, "s", "Respire, não prenda o ar."],
        ]],
      ],
    },
    {
      nome: "Fundação", rank: "C", prazo: "4 meses", stages: 8,
      meta: "Primeiras barras fixas e as primeiras séries longas de verdade.",
      tests: [
        ["Flexões seguidas", 40, "reps"], ["Mergulhos nas paralelas seguidos", 18, "reps"], ["Barras fixas seguidas", 5, "reps"],
        ["Agachamentos seguidos", 120, "reps"], ["Abdominais supra seguidos", 100, "reps"],
        ["Elevações de joelhos nas paralelas", 20, "reps"], ["Prancha", 120, "s"],
      ],
      days: [
        ["Empurrar A — Peito e tríceps", [
          ["Flexão de braço", 4, 16, 4, 24, "reps", "Ritmo controlado, amplitude total."],
          ["Flexão com os pés no banco", 3, 6, 3, 12, "reps", "Parte de cima do peito."],
          ["Mergulho nas paralelas", 3, 8, 4, 12, "reps", "Desça até o ombro ficar na altura do cotovelo."],
          ["Flexão pike", 3, 6, 3, 10, "reps", "Ombros."],
          ["Série longa de flexões", 1, 28, 1, 43, "reps", "Sem parar."],
        ]],
        ["Puxar A — Barra fixa", [
          ["Barra fixa", 2, 1, 4, 4, "reps", "Pegada um pouco mais larga que os ombros. Se não sair nenhuma, faça negativas."],
          ["Barra negativa (desça em 5 s)", 3, 3, 3, 5, "reps", "Suba com um pulo e desça bem devagar."],
          ["Remada australiana", 4, 10, 4, 15, "reps", "Na barra baixa ou nas paralelas."],
          ["Suspensão na barra", 3, 20, 3, 40, "s", "Ombros ativos, longe das orelhas."],
          ["Série longa de abdominais supra", 1, 65, 1, 105, "reps", "Sem parar."],
        ]],
        ["Pernas e core A", [
          ["Série longa de agachamentos", 1, 80, 1, 125, "reps", "Sem parar."],
          ["Afundo (cada perna)", 3, 12, 4, 16, "reps", "Tronco reto."],
          ["Agachamento búlgaro (cada perna)", 3, 8, 3, 12, "reps", "Desça em 2 s."],
          ["Panturrilha unilateral (cada perna)", 3, 12, 3, 20, "reps", "Pausa no alto."],
          ["Elevação de joelhos nas paralelas", 3, 13, 4, 20, "reps", "Joelhos acima do quadril."],
          ["Abdominal bicicleta", 3, 30, 3, 40, "reps", "Oblíquos."],
        ]],
        ["Empurrar B — Paralelas", [
          ["Série longa de mergulhos", 1, 12, 1, 19, "reps", "Sem parar: treina para o teste."],
          ["Flexão diamante", 3, 8, 4, 12, "reps", "Tríceps."],
          ["Flexão aberta", 3, 12, 3, 18, "reps", "Peito."],
          ["Flexão pike com os pés no banco", 3, 4, 3, 8, "reps", "Ombros."],
          ["Prancha", 2, 95, 2, 125, "s", "Resistência para o teste."],
        ]],
        ["Puxar B — Barra fixa", [
          ["Barra supinada (chin-up)", 2, 1, 4, 4, "reps", "Palmas para você: costuma sair antes da barra pronada."],
          ["Remada australiana com pausa de 2 s", 4, 8, 4, 12, "reps", "Aperte as escápulas no topo."],
          ["Barra negativa (desça em 5 s)", 3, 3, 3, 5, "reps", "Controle total."],
          ["Encolhimento escapular na barra", 3, 8, 3, 12, "reps", "Braços retos, suba e desça só os ombros."],
          ["Hollow hold (canoa)", 3, 30, 3, 45, "s", "Core."],
        ]],
        ["Pernas e core B", [
          ["Agachamento", 4, 30, 4, 45, "reps", "Ritmo constante."],
          ["Agachamento com salto", 3, 10, 3, 15, "reps", "Aterrisse macio."],
          ["Ponte de glúteo unilateral (cada perna)", 3, 15, 3, 20, "reps", "Glúteo e posterior."],
          ["Elevação de pernas deitado", 3, 10, 3, 15, "reps", "Pernas retas, desça devagar."],
          ["Abdominal supra", 3, 35, 3, 55, "reps", "Volume."],
          ["Prancha lateral (cada lado)", 3, 35, 3, 50, "s", "Oblíquos."],
        ]],
      ],
    },
    {
      nome: "Ascensão", rank: "B", prazo: "7 meses", stages: 12,
      meta: "Volume alto e as primeiras habilidades: o V shape começa a aparecer.",
      tests: [
        ["Flexões seguidas", 55, "reps"], ["Mergulhos nas paralelas seguidos", 25, "reps"], ["Barras fixas seguidas", 12, "reps"],
        ["Agachamentos seguidos", 160, "reps"], ["Abdominais supra seguidos", 160, "reps"],
        ["Elevações de pernas retas nas paralelas", 12, "reps"], ["Prancha", 180, "s"], ["L-sit nas paralelas", 15, "s"],
      ],
      days: [
        ["Empurrar A — Peito e tríceps", [
          ["Série longa de flexões", 1, 43, 1, 58, "reps", "Sem parar."],
          ["Flexão de braço", 4, 20, 5, 25, "reps", "Volume."],
          ["Flexão com os pés no banco", 3, 12, 4, 16, "reps", "Parte de cima do peito."],
          ["Mergulho nas paralelas", 4, 12, 4, 18, "reps", "Incline o tronco para pegar mais peito."],
          ["Flexão pike com os pés no banco", 3, 8, 4, 10, "reps", "Ombros."],
        ]],
        ["Puxar A — Barra fixa", [
          ["Barra fixa", 4, 4, 5, 8, "reps", "Queixo acima da barra, descida controlada."],
          ["Barra supinada (chin-up)", 3, 4, 4, 8, "reps", "Bíceps."],
          ["Remada australiana com os pés no banco", 3, 10, 4, 15, "reps", "Corpo na horizontal."],
          ["Elevação de joelhos na barra", 3, 8, 3, 12, "reps", "Sem balançar."],
          ["Superman em Y", 3, 15, 3, 20, "reps", "Lombar e escápulas."],
        ]],
        ["Pernas e core A", [
          ["Série longa de agachamentos", 1, 125, 1, 165, "reps", "Sem parar."],
          ["Afundo andando (cada perna)", 4, 16, 4, 20, "reps", "Passos longos."],
          ["Agachamento búlgaro (cada perna)", 3, 12, 4, 15, "reps", "Desça em 3 s."],
          ["Panturrilha unilateral (cada perna)", 4, 20, 4, 25, "reps", "Amplitude total."],
          ["Elevação de pernas retas nas paralelas", 3, 5, 4, 12, "reps", "Pernas até a altura do quadril."],
          ["L-sit nas paralelas (comece com joelhos dobrados)", 3, 8, 4, 18, "s", "Ombros para baixo, braços travados."],
        ]],
        ["Empurrar B — Paralelas", [
          ["Série longa de mergulhos", 1, 19, 1, 27, "reps", "Sem parar."],
          ["Flexão diamante", 4, 12, 4, 18, "reps", "Tríceps."],
          ["Flexão arqueiro (cada lado)", 3, 3, 3, 6, "reps", "Um braço trabalha, o outro só apoia esticado."],
          ["Flexão explosiva", 3, 5, 3, 8, "reps", "Empurre forte, as mãos saem do chão."],
          ["Prancha", 1, 125, 1, 185, "s", "Mental."],
        ]],
        ["Puxar B — Barra fixa", [
          ["Série longa de barras", 1, 5, 1, 13, "reps", "Sem parar, sem balanço."],
          ["Barra com pausa de 2 s no topo", 3, 3, 3, 6, "reps", "Queixo acima da barra."],
          ["Remada australiana pegada aberta, pés no banco", 4, 10, 4, 14, "reps", "Largura das costas."],
          ["Suspensão na barra", 2, 40, 2, 60, "s", "Pegada e ombros."],
          ["Hollow hold (canoa)", 3, 45, 3, 60, "s", "Core."],
        ]],
        ["Pernas e core B", [
          ["Agachamento pistola assistido (cada perna)", 3, 4, 3, 8, "reps", "Segure numa barra para equilibrar."],
          ["Agachamento com salto", 4, 12, 4, 15, "reps", "Explosivo."],
          ["Ponte de glúteo unilateral, pé no banco", 3, 15, 3, 20, "reps", "Posterior e glúteo."],
          ["Série longa de abdominais supra", 1, 105, 1, 165, "reps", "Sem parar."],
          ["Elevação de pernas retas nas paralelas", 3, 6, 3, 12, "reps", "Controle na descida."],
          ["Prancha lateral com elevação de quadril (cada lado)", 3, 12, 3, 20, "reps", "Oblíquos."],
        ]],
      ],
    },
    {
      nome: "Elite", rank: "A", prazo: "1 ano", stages: 20,
      meta: "Força de elite: barras e mergulhos em volume alto, pistola e front lever.",
      tests: [
        ["Flexões seguidas", 75, "reps"], ["Mergulhos nas paralelas seguidos", 35, "reps"], ["Barras fixas seguidas", 20, "reps"],
        ["Agachamentos seguidos", 200, "reps"], ["Abdominais supra seguidos", 200, "reps"],
        ["Elevações de pernas retas nas paralelas", 20, "reps"], ["Prancha", 240, "s"], ["L-sit nas paralelas", 30, "s"],
        ["Agachamentos pistola (cada perna)", 5, "reps"],
      ],
      days: [
        ["Empurrar A — Peito e tríceps", [
          ["Série longa de flexões", 1, 55, 1, 80, "reps", "Sem parar."],
          ["Flexão de braço", 5, 25, 5, 35, "reps", "Volume."],
          ["Flexão arqueiro (cada lado)", 3, 6, 4, 10, "reps", "Caminho para a flexão com um braço."],
          ["Mergulho nas paralelas", 4, 16, 5, 22, "reps", "Amplitude completa."],
          ["Flexão pike com os pés no banco", 4, 10, 4, 14, "reps", "Ombros."],
        ]],
        ["Puxar A — Barra fixa", [
          ["Barra fixa", 5, 8, 5, 14, "reps", "Sem balanço."],
          ["Barra supinada (chin-up)", 4, 8, 4, 12, "reps", "Bíceps."],
          ["Barra arqueiro (cada lado)", 3, 2, 3, 5, "reps", "Puxe para um lado, o outro braço fica quase reto."],
          ["Tuck front lever na barra", 3, 8, 4, 20, "s", "Joelhos no peito, costas paralelas ao chão."],
          ["Superman em Y", 3, 20, 3, 25, "reps", "Lombar."],
        ]],
        ["Pernas e core A", [
          ["Série longa de agachamentos", 1, 160, 1, 210, "reps", "Sem parar."],
          ["Agachamento pistola (cada perna)", 3, 2, 4, 6, "reps", "Sem apoio quando der."],
          ["Afundo com salto (cada perna)", 3, 8, 4, 12, "reps", "Troque as pernas no ar."],
          ["Panturrilha unilateral (cada perna)", 4, 25, 4, 30, "reps", "Pausa de 2 s no alto."],
          ["Elevação de pernas retas nas paralelas", 4, 12, 4, 18, "reps", "Pés acima do quadril."],
          ["L-sit nas paralelas", 4, 18, 4, 32, "s", "Pernas retas e altas."],
        ]],
        ["Empurrar B — Paralelas", [
          ["Série longa de mergulhos", 1, 22, 1, 38, "reps", "Sem parar."],
          ["Flexão diamante com os pés no banco", 4, 12, 4, 18, "reps", "Tríceps."],
          ["Flexão explosiva com palma", 3, 5, 4, 10, "reps", "Potência."],
          ["Flexão com um braço, só a descida (cada lado)", 3, 2, 3, 5, "reps", "Desça em 3 s com um braço, pés afastados."],
          ["Prancha", 1, 185, 1, 245, "s", "Mental."],
        ]],
        ["Puxar B — Barra fixa", [
          ["Série longa de barras", 1, 13, 1, 22, "reps", "Sem parar."],
          ["Barra com pausa de 2 s no topo", 3, 6, 4, 8, "reps", "Força no topo."],
          ["Remada australiana arqueiro (cada lado)", 3, 6, 3, 10, "reps", "Costas unilaterais."],
          ["Elevação de pernas retas na barra", 3, 5, 3, 10, "reps", "Sem balanço."],
          ["Hollow hold (canoa)", 3, 60, 3, 90, "s", "Core de aço."],
        ]],
        ["Pernas e core B", [
          ["Agachamento", 4, 40, 4, 50, "reps", "Ritmo."],
          ["Agachamento búlgaro lento (cada perna)", 4, 12, 4, 16, "reps", "5 s na descida."],
          ["Deslizamento de posterior (cada perna)", 3, 8, 3, 12, "reps", "Ponte com um pé, estenda e recolha a perna."],
          ["Série longa de abdominais supra", 1, 160, 1, 210, "reps", "Sem parar."],
          ["Elevação de pernas retas nas paralelas", 3, 12, 3, 20, "reps", "Controle."],
          ["Prancha lateral com elevação de quadril (cada lado)", 3, 20, 3, 25, "reps", "Oblíquos."],
        ]],
      ],
    },
    {
      nome: "Monarca", rank: "S", prazo: "~20 meses", stages: 40,
      meta: "O topo: 100 flexões, 30 barras e 300 agachamentos seguidos, flexão com um braço.",
      tests: [
        ["Flexões seguidas", 100, "reps"], ["Mergulhos nas paralelas seguidos", 50, "reps"], ["Barras fixas seguidas", 30, "reps"],
        ["Agachamentos seguidos", 300, "reps"], ["Abdominais supra seguidos", 300, "reps"],
        ["Elevações de pernas retas nas paralelas", 25, "reps"], ["Prancha", 300, "s"], ["L-sit nas paralelas", 60, "s"],
        ["Agachamentos pistola (cada perna)", 15, "reps"], ["Flexões com um braço (cada lado)", 5, "reps"],
      ],
      days: [
        ["Empurrar A — Peito e tríceps", [
          ["Série longa de flexões", 1, 80, 1, 105, "reps", "Sem parar: o teste final é 100."],
          ["Flexão de braço", 5, 35, 6, 40, "reps", "Volume."],
          ["Flexão arqueiro (cada lado)", 4, 10, 4, 14, "reps", "Força unilateral."],
          ["Mergulho nas paralelas", 5, 22, 5, 30, "reps", "Amplitude completa."],
          ["Flexão pseudo-planche", 3, 6, 4, 12, "reps", "Mãos na linha da cintura, ombros à frente."],
        ]],
        ["Puxar A — Barra fixa", [
          ["Barra fixa", 5, 14, 6, 18, "reps", "Sem balanço."],
          ["Barra supinada (chin-up)", 4, 12, 4, 15, "reps", "Bíceps."],
          ["Barra arqueiro (cada lado)", 3, 5, 4, 8, "reps", "Força unilateral."],
          ["Front lever avançado (tuck aberto)", 3, 10, 4, 20, "s", "Costas retas, joelhos longe do peito."],
          ["Superman em Y", 3, 25, 3, 25, "reps", "Lombar."],
        ]],
        ["Pernas e core A", [
          ["Série longa de agachamentos", 1, 210, 1, 310, "reps", "Sem parar: o teste final é 300."],
          ["Agachamento pistola (cada perna)", 4, 6, 4, 15, "reps", "Sem apoio."],
          ["Afundo com salto (cada perna)", 4, 12, 4, 18, "reps", "Explosão."],
          ["Panturrilha unilateral (cada perna)", 4, 30, 4, 40, "reps", "Pausa no alto."],
          ["Elevação de pernas retas nas paralelas", 4, 18, 4, 25, "reps", "Controle."],
          ["L-sit nas paralelas", 4, 32, 4, 60, "s", "Pernas retas e altas."],
        ]],
        ["Empurrar B — Paralelas", [
          ["Série longa de mergulhos", 1, 38, 1, 52, "reps", "Sem parar."],
          ["Flexão com um braço (cada lado)", 3, 1, 4, 6, "reps", "Pés afastados, quadril alinhado."],
          ["Flexão explosiva com palma", 4, 10, 4, 15, "reps", "Potência."],
          ["Flexão diamante com os pés no banco", 4, 18, 4, 25, "reps", "Tríceps."],
          ["Prancha", 1, 245, 1, 305, "s", "O teste final é 5 min."],
        ]],
        ["Puxar B — Barra fixa", [
          ["Série longa de barras", 1, 22, 1, 31, "reps", "Sem parar: o teste final é 30."],
          ["Barra com pausa de 2 s no topo", 4, 8, 4, 12, "reps", "Força no topo."],
          ["Skin the cat na barra", 3, 3, 3, 6, "reps", "Giro completo e controlado."],
          ["Remada australiana arqueiro (cada lado)", 3, 10, 4, 15, "reps", "Costas unilaterais."],
          ["Hollow hold (canoa)", 3, 90, 3, 120, "s", "Core."],
        ]],
        ["Pernas e core B", [
          ["Agachamento", 4, 50, 4, 75, "reps", "Resistência."],
          ["Agachamento búlgaro com salto (cada perna)", 3, 8, 4, 12, "reps", "Potência."],
          ["Deslizamento de posterior (cada perna)", 3, 12, 4, 15, "reps", "Posterior."],
          ["Série longa de abdominais supra", 1, 210, 1, 310, "reps", "Sem parar: o teste final é 300."],
          ["Elevação de pernas retas nas paralelas", 3, 20, 3, 25, "reps", "Controle."],
          ["Prancha lateral com elevação de quadril (cada lado)", 3, 25, 3, 30, "reps", "Oblíquos."],
        ]],
      ],
    },
  ],
};

const aquece = ["Aquecimento: caminhada rápida", 1, 5, 1, 5, "min", "Solte tornozelos e quadril."];
const desaquece = ["Desaquecimento: caminhada + alongamento", 1, 5, 1, 8, "min", "Panturrilha, posterior e quadril."];
const coreRun = (p0, p1, f0, f1) => [
  ["Prancha", 3, p0, 3, p1, "s", "Core firme ajuda na postura da corrida."],
  ["Afundo (cada perna)", 3, f0, 3, f1, "reps", "Pernas fortes protegem os joelhos."],
  ["Elevação de panturrilha unilateral (cada perna)", 3, 12, 3, 25, "reps", "Tendão de Aquiles forte."],
];

const run = {
  id: "corrida", nome: "Corrida", icone: "🏃", met: 9,
  resumo: "6 sessões por semana: leves, tiros, ritmo e um longão. Do zero à maratona.",
  phases: [
    {
      nome: "Despertar", rank: "D", prazo: "2 meses", stages: 8, meta: "Sair do zero e correr sem parar.",
      tests: [["Correr sem parar", 3, "km"]],
      days: [
        ["Corrida leve", [aquece, ["Trote leve (caminhe 1 min quando precisar)", 1, 12, 1, 20, "min", "Ritmo em que dá para conversar."], desaquece]],
        ["Tiros", [aquece, ["Tiro de 1 min + 2 min caminhando", 4, 1, 6, 1, "min", "Forte, mas sem ser sprint máximo."], desaquece]],
        ["Regenerativo + core", [["Caminhada rápida", 1, 25, 1, 35, "min", "Recuperação ativa."], ...coreRun(30, 50, 8, 12)]],
        ["Ritmo", [aquece, ["Corrida em ritmo moderado", 1, 6, 1, 12, "min", "Desconfortável, mas sustentável."], desaquece]],
        ["Corrida leve", [aquece, ["Trote leve (caminhe 1 min quando precisar)", 1, 10, 1, 18, "min", "Bem solto."], desaquece]],
        ["Longão", [aquece, ["Corrida longa e lenta", 1, 1.5, 1, 3.5, "km", "Pode intercalar caminhada no começo."], desaquece]],
      ],
    },
    {
      nome: "Fundação", rank: "C", prazo: "4 meses", stages: 8, meta: "5 km sem parar.",
      tests: [["Correr sem parar", 5, "km"]],
      days: [
        ["Corrida leve", [aquece, ["Corrida leve contínua", 1, 20, 1, 30, "min", "Ritmo de conversa."], desaquece]],
        ["Tiros", [aquece, ["Tiro de 2 min + 2 min trotando", 4, 2, 6, 2, "min", "Mesmo ritmo do primeiro ao último."], desaquece]],
        ["Regenerativo + core", [["Trote muito leve ou caminhada", 1, 30, 1, 40, "min", "Recuperação."], ...coreRun(50, 70, 12, 16)]],
        ["Ritmo", [aquece, ["Corrida em ritmo moderado-forte", 1, 12, 1, 20, "min", "Ritmo de prova de 5 km."], desaquece]],
        ["Corrida leve", [aquece, ["Corrida leve contínua", 1, 18, 1, 25, "min", "Solto."], desaquece]],
        ["Longão", [aquece, ["Corrida longa e lenta", 1, 3.5, 1, 6, "km", "Sem parar."], desaquece]],
      ],
    },
    {
      nome: "Ascensão", rank: "B", prazo: "7 meses", stages: 12, meta: "10 km sem parar.",
      tests: [["Correr sem parar", 10, "km"]],
      days: [
        ["Corrida leve", [aquece, ["Corrida leve contínua", 1, 30, 1, 45, "min", "Ritmo de conversa."], desaquece]],
        ["Tiros de 400 m", [aquece, ["400 m forte + 200 m trotando", 6, 400, 10, 400, "m", "Mesmo ritmo do primeiro ao último."], desaquece]],
        ["Regenerativo + core", [["Trote muito leve", 1, 30, 1, 40, "min", "Recuperação."], ...coreRun(70, 90, 16, 20)]],
        ["Ritmo", [aquece, ["Corrida em ritmo de prova", 1, 20, 1, 30, "min", "Ritmo de prova de 10 km."], desaquece]],
        ["Corrida leve", [aquece, ["Corrida leve contínua", 1, 25, 1, 40, "min", "Solto."], desaquece]],
        ["Longão", [aquece, ["Corrida longa e lenta", 1, 6, 1, 11, "km", "Hidrate-se."], desaquece]],
      ],
    },
    {
      nome: "Elite", rank: "A", prazo: "1 ano", stages: 20, meta: "Meia maratona: 21 km.",
      tests: [["Correr sem parar", 21, "km"]],
      days: [
        ["Corrida leve", [aquece, ["Corrida leve contínua", 1, 40, 1, 60, "min", "Ritmo de conversa."], desaquece]],
        ["Tiros de 800 m", [aquece, ["800 m forte + 400 m trotando", 5, 800, 8, 800, "m", "Controle o ritmo."], desaquece]],
        ["Regenerativo + core", [["Trote muito leve", 1, 30, 1, 45, "min", "Recuperação."], ...coreRun(90, 120, 16, 24)]],
        ["Ritmo", [aquece, ["Corrida em ritmo de prova", 1, 30, 1, 50, "min", "Ritmo de meia maratona."], desaquece]],
        ["Corrida leve", [aquece, ["Corrida leve contínua", 1, 35, 1, 50, "min", "Solto."], desaquece]],
        ["Longão", [aquece, ["Corrida longa e lenta", 1, 11, 1, 22, "km", "Leve água e algo para comer acima de 15 km."], desaquece]],
      ],
    },
    {
      nome: "Monarca", rank: "S", prazo: "~20 meses", stages: 40, meta: "A maratona: 42 km.",
      tests: [["Correr sem parar", 42, "km"]],
      days: [
        ["Corrida leve", [aquece, ["Corrida leve contínua", 1, 50, 1, 70, "min", "Ritmo de conversa."], desaquece]],
        ["Tiros de 1 km", [aquece, ["1 km forte + 2 min trotando", 5, 1000, 8, 1000, "m", "Ritmo um pouco mais rápido que o de prova."], desaquece]],
        ["Regenerativo + core", [["Trote muito leve", 1, 35, 1, 45, "min", "Recuperação."], ...coreRun(120, 150, 20, 24)]],
        ["Ritmo", [aquece, ["Corrida em ritmo de maratona", 1, 45, 1, 75, "min", "Constante, sem acelerar no fim."], desaquece]],
        ["Corrida leve", [aquece, ["Corrida leve contínua", 1, 45, 1, 60, "min", "Solto."], desaquece]],
        ["Longão", [aquece, ["Corrida longa e lenta", 1, 20, 1, 35, "km", "O longão máximo antes da maratona fica em 32 a 35 km."], desaquece]],
      ],
    },
  ],
};

// Circuito para dias de chuva forte na trilha de corrida
const runIndoor = ["Circuito indoor (chuva)", [
  ["Corrida estacionária", 4, 3, 6, 4, "min", "Joelhos altos, ritmo constante."],
  ["Polichinelos", 4, 30, 5, 60, "reps", "Sem parar."],
  ["Escalador (mountain climber)", 3, 20, 4, 40, "reps", "Quadril baixo."],
  ["Agachamento com salto", 3, 10, 4, 18, "reps", "Aterrisse macio."],
  ["Prancha", 3, 30, 3, 90, "s", "Core."],
]];

export const TRACKS = [
  cal, run,
  { id: "academia", nome: "Academia", icone: "🏋️", building: true, resumo: "Musculação com progressão de carga." },
  { id: "ciclismo", nome: "Ciclismo", icone: "🚴", building: true, resumo: "Pedal com metas de distância e elevação." },
  { id: "natacao", nome: "Natação", icone: "🏊", building: true, resumo: "Técnica e resistência na piscina." },
  { id: "hibrido", nome: "Híbrido", icone: "⚔️", building: true, resumo: "Calistenia + corrida na mesma semana." },
];
export const trackById = id => TRACKS.find(t => t.id === id);

export function progress(trackId = S.track?.id) {
  if (!trackId) return null;
  if (!S.progress[trackId]) S.progress[trackId] = { phase: 0, week: 1, sessions: 0 };
  return S.progress[trackId];
}

export function currentTrack() { return S.track ? trackById(S.track.id) : null; }
export function currentPhase() {
  const t = currentTrack(); if (!t) return null;
  return t.phases[Math.min(progress().phase, t.phases.length - 1)];
}
export const trackFinished = () => { const t = currentTrack(); return !!t && progress().phase >= t.phases.length; };
const concluida = id => (S.progress?.[id]?.phase || 0) >= trackById(id).phases.length;

// ---- várias trilhas ----------------------------------------------------------------------
// S.ativas = trilhas iniciadas. Com uma só, tudo funciona como antes. Com duas ou mais, a missão do dia é uma
// só (qualquer trilha ativa vale) e cada trilha tem fase, etapa, fila, máximos e rank próprios.
// S.track é a trilha "em foco" (a do treino de hoje).
export const ativas = () => {
  if (!S.ativas) S.ativas = S.track ? [S.track.id] : [];
  return S.ativas;
};
export const multi = () => ativas().length > 1;
// Ainda há cobrança de missão: alguma trilha ativa não foi concluída
export const todasConcluidas = () => !ativas().length ? !!S.track && trackFinished() : ativas().every(concluida);

export function setFoco(id) {
  S.track = { id, startDate: progress(id).inicio || S.track?.startDate || today() };
}
// Treino de pernas pesado (para não emendar dois no mesmo par de pernas)
export const pesaPernas = (trackId, titulo = "") => trackId === "calistenia" ? /^Pernas/.test(titulo) : /Tiros|Ritmo|Longão/.test(titulo);
function proximoTitulo(id) {
  const t = trackById(id), p = progress(id);
  return t.phases[Math.min(p.phase, t.phases.length - 1)].days[p.nextIdx ?? 0]?.[0] || "";
}
// Trilha sugerida para o dia: a que está há mais tempo sem treino; se ontem foi pernas pesado e a sugerida
// também seria, e outra trilha não, sugere a outra
export function trilhaSugerida(date = today()) {
  const ids = ativas().filter(id => !concluida(id));
  if (!ids.length) return S.track?.id || null;
  const ultimo = id => Object.keys(S.days).filter(d => d < date && S.days[d].workout?.done && S.days[d].workout.trackId === id).sort().pop() || "";
  const ordem = [...ids].sort((a, b) => ultimo(a).localeCompare(ultimo(b)) || (a === S.track?.id ? -1 : b === S.track?.id ? 1 : 0));
  const ontem = S.days[addDays(date, -1)]?.workout;
  if (ontem?.done && pesaPernas(ontem.trackId, ontem.plano?.titulo) && pesaPernas(ordem[0], proximoTitulo(ordem[0]))) {
    const leve = ordem.find(id => !pesaPernas(id, proximoTitulo(id)));
    if (leve) return leve;
  }
  return ordem[0];
}
// Escolhe a trilha em foco do dia (só com 2+ trilhas): a do treino já começado, a escolhida hoje ou a sugerida.
// Devolve true se mudou.
export function aplicarFoco(date = today()) {
  if (!multi()) return false;
  const antes = S.track?.id, w = S.days[date]?.workout;
  let id;
  if (w?.trackId && (w.in || w.done)) id = w.trackId;
  else if (S.focoDia?.d === date && ativas().includes(S.focoDia.id)) id = S.focoDia.id;
  else id = trilhaSugerida(date);
  if (id && id !== antes) setFoco(id);
  return !!id && id !== antes;
}

// ---- Teste de Rank -------------------------------------------------------------------------
// A etapa final da fase foi concluída: libera o Teste de Rank (uma tentativa basta).
// Teste antecipado: liberado a partir da metade das etapas da fase (ex.: etapa 5 de 8) e vale pela MÉDIA de 2
// tentativas em dias diferentes (a 2ª de 2 a 7 dias depois da 1ª): separa um dia inspirado do seu nível real.
// Nivelamento: numa trilha nova (iniciada além da primeira), o teste antecipado já vale desde a etapa 1, até o
// primeiro treino normal dela. Passou, pula de fase e pode nivelar de novo.
// Reprovou: nova tentativa em 7 dias (o teste é autodeclarado; evita "chutar até passar").
export const TEST_COOLDOWN = 7;
export const JANELA_2A = { de: 2, ate: 7 };
export const earlyFrom = ph => Math.ceil(ph.stages / 2) + 1;
export function testStatus() {
  const ph = currentPhase(), p = progress();
  if (!ph || trackFinished()) return null;
  const full = p.week > ph.stages, nivel = !full && !!p.nivelamento, early = !full && (nivel || p.week >= earlyFrom(ph));
  if (!full && !early) return null;
  const t1 = early && p.antecipada?.fase === p.phase && daysBetween(p.antecipada.d, today()) <= JANELA_2A.ate ? p.antecipada : null;
  if (t1) {
    const de = addDays(t1.d, JANELA_2A.de);
    return { early, nivel, tentativa: 2, t1, de, ate: addDays(t1.d, JANELA_2A.ate), nextTry: de > today() ? de : null };
  }
  const next = p.lastTestTry ? addDays(p.lastTestTry, TEST_COOLDOWN) : null;
  const expirou = early && p.antecipada?.fase === p.phase ? p.antecipada.d : null; // 1ª tentativa vencida
  return { early, nivel, tentativa: early ? 1 : null, expirou, nextTry: next && next > today() ? next : null };
}
export const testUnlocked = () => !!testStatus();

const lerp = (a, b, k) => a + (b - a) * k;

// Fila de treinos: o próximo é sempre o seguinte ao último CONCLUÍDO nesta trilha, independente do dia
// da semana. Faltou, o mesmo treino fica para o dia seguinte (e é ele que paga a penalidade).
export const DAYS_PER_CYCLE = 6;
export function workoutIndex() {
  const p = progress();
  if (p.nextIdx == null) { // migração: antes o treino era escolhido pelo dia da semana
    const last = Object.keys(S.days).sort().reverse().map(d => S.days[d].workout)
      .find(w => w?.done && w.trackId === S.track?.id && w.plano?.idx != null && !w.indoor);
    p.nextIdx = last ? (last.plano.idx + 1) % DAYS_PER_CYCLE : 0;
  }
  return p.nextIdx;
}
// Chamado ao concluir um treino: avança a fila da trilha do treino
export function advanceQueue(w) {
  if (!w.trackId || !S.progress?.[w.trackId] || w.plano?.idx == null) return;
  progress(w.trackId).nextIdx = (w.plano.idx + 1) % DAYS_PER_CYCLE;
}

// Semana leve: a cada 4 etapas, menos na última etapa da fase (véspera do teste)
export const isDeload = (stage, stages) => stage % DELOAD_EVERY === 0 && stage < stages;

// Carga de um exercício na etapa: o volume total cresce de forma contínua; as séries sobem
// no meio do caminho e as reps se redistribuem, sem salto de volume.
export function prescribe([s0, r0, s1, r1], k, leve) {
  const series = Math.round(lerp(s0, s1, k));
  const volume = lerp(s0 * r0, s1 * r1, k) * (leve ? DELOAD_FACTOR : 1);
  const v = volume / series;
  return { series, alvo: Math.max(1, Math.round(v)) };
}

// ---- máximos do jogador (Teste de Avaliação) e treino calibrado --------------------------
// Cada prova dos Testes de Rank tem uma chave; o jogador registra o seu máximo em cada uma.
export const TEST_KEY = {
  "Flexões seguidas": "flexoes", "Mergulhos nas paralelas seguidos": "mergulhos", "Remadas australianas seguidas": "remadas",
  "Barras fixas seguidas": "barra", "Agachamentos seguidos": "agachamentos", "Abdominais supra seguidos": "abdominais",
  "Elevações de joelhos nas paralelas": "joelhos", "Elevações de pernas retas nas paralelas": "pernasRetas", "Prancha": "prancha",
  "L-sit nas paralelas": "lsit", "Agachamentos pistola (cada perna)": "pistola", "Flexões com um braço (cada lado)": "umBraco",
  "Correr sem parar": "corrida",
};
// Exercício do treino → prova que mede o mesmo movimento (só estes são calibrados)
const EX_KEY = {
  "Flexão de braço": "flexoes", "Série longa de flexões": "flexoes",
  "Mergulho nas paralelas": "mergulhos", "Série longa de mergulhos": "mergulhos",
  "Remada australiana nas paralelas": "remadas", "Remada australiana": "remadas", "Série longa de remadas australianas": "remadas",
  "Barra fixa": "barra", "Série longa de barras": "barra",
  "Agachamento": "agachamentos", "Série longa de agachamentos": "agachamentos",
  "Abdominal supra": "abdominais", "Série longa de abdominais supra": "abdominais",
  "Elevação de joelhos nas paralelas": "joelhos", "Elevação de pernas retas nas paralelas": "pernasRetas",
  "Prancha": "prancha", "L-sit nas paralelas": "lsit", "Agachamento pistola (cada perna)": "pistola",
  "Flexão com um braço (cada lado)": "umBraco",
};
export const testKey = nome => TEST_KEY[nome] || null;
export const pr = key => S.pr?.[key]?.v ?? null;
// Grava o máximo de uma prova. Se superar o melhor histórico (e já havia um), é RECORDE: devolve o recorde.
export function setPR(key, v, date = today()) {
  if (!key || !(v > 0)) return null;
  S.pr ||= {};
  const old = S.pr[key];
  S.pr[key] = { v, d: date, best: Math.max(v, old?.best ?? 0) };
  if (old?.best != null && v > old.best) {
    const nome = Object.keys(TEST_KEY).find(n => TEST_KEY[n] === key) || key;
    return registrarRecorde(key, nome.replace(/ seguid[oa]s$/, ""), old.best, v);
  }
  return null;
}

// Séries normais: de ~70% a ~85% do seu máximo ao longo da fase. Série longa (sem parar): de ~90% a ~115%.
// O valor da tabela continua sendo o mínimo: a calibragem só aumenta.
export const CALIB = { serie: [0.7, 0.85], longa: [0.9, 1.15] };
function calibrate(it, k, leve) {
  const key = EX_KEY[it.nome], v = key && pr(key);
  if (!v) return it;
  const [a, b] = it.series === 1 ? CALIB.longa : CALIB.serie;
  const pct = lerp(a, b, k);
  const alvo = Math.max(1, Math.round(v * pct * (leve ? DELOAD_FACTOR : 1)));
  return alvo > it.alvo ? { ...it, alvo, calib: { v, pct: Math.round(pct * 100) } } : it;
}

// Treino prescrito para a data, na etapa atual. { titulo, itens: [{nome, series, alvo, un, dica}] }
export function workoutFor(date, indoor = false) {
  const t = currentTrack(), ph = currentPhase(); if (!t || !ph) return null;
  const p = progress();
  const stage = Math.min(p.week, ph.stages);
  const k = ph.stages > 1 ? (stage - 1) / (ph.stages - 1) : 1;
  const leve = isDeload(stage, ph.stages);
  const idx = workoutIndex();
  const [titulo, exs] = indoor && t.id === "corrida" ? runIndoor : ph.days[idx];
  return {
    idx, titulo, stage, stages: ph.stages, leve,
    itens: exs.map(([nome, s0, r0, s1, r1, un, dica]) => ({
      nome, ...(un === "km" || un === "m" && s0 === 1 ? { series: 1, alvo: Math.round(lerp(r0, r1, k) * (leve ? DELOAD_FACTOR : 1) * 10) / 10 }
        : un === "m" ? { series: Math.round(lerp(s0, s1, k) * (leve ? DELOAD_FACTOR : 1)) || 1, alvo: r0 }
        : prescribe([s0, r0, s1, r1], k, leve)), un, dica,
    })).map(it => t.id === "calistenia" ? calibrate(it, k, leve) : it),
  };
}

export const unitLabel = (v, un) => un === "reps" ? `${v} reps` : `${v} ${un}`;
