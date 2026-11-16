// Trilhas de treino. Cada trilha tem 3 fases (3 meses, 6 meses, 1 ano).
// Cada fase tem N etapas; uma etapa avança a cada 6 treinos completos.
// A carga de cada exercício cresce em linha reta do valor inicial ao final da fase.
import { S } from "./store.js";
import { weekday } from "./util.js";

export const SESSIONS_PER_STAGE = 6;

// exercício: [nome, sériesIni, repsIni, sériesFim, repsFim, unidade, dica]
const cal = {
  id: "calistenia", nome: "Calistenia", icone: "💪", met: 6,
  resumo: "6 treinos por semana usando só o corpo, barras paralelas e um banco de praça. Foco em V shape e abdômen.",
  phases: [
    {
      nome: "Fundação", prazo: "3 meses", stages: 12,
      meta: "Construir a base: flexões, mergulhos e remadas sólidas.",
      tests: [
        ["Flexões seguidas", 20, "reps"], ["Mergulhos nas paralelas seguidos", 8, "reps"],
        ["Remadas australianas seguidas", 15, "reps"], ["Prancha", 90, "s"],
        ["Elevações de joelhos nas paralelas", 15, "reps"],
      ],
      days: [
        ["Empurrar A — Peito e tríceps", [
          ["Flexão de braço", 3, 8, 4, 18, "reps", "Corpo reto, peito quase no chão."],
          ["Flexão com as mãos no banco", 3, 10, 4, 20, "reps", "Mais leve: use para somar volume."],
          ["Mergulho no banco", 3, 8, 4, 15, "reps", "Mãos no banco atrás do corpo, desça até 90°."],
          ["Flexão pike", 2, 5, 3, 10, "reps", "Quadril alto, cabeça desce entre as mãos (ombros)."],
          ["Prancha", 3, 30, 3, 60, "s", "Abdômen e glúteos contraídos."],
        ]],
        ["Puxar A — Costas e bíceps", [
          ["Remada australiana nas paralelas", 3, 6, 4, 14, "reps", "Deite sob as barras, puxe o peito até elas."],
          ["Remada australiana pegada supinada", 3, 6, 4, 12, "reps", "Palmas viradas para você: mais bíceps."],
          ["Encolhimento escapular nas paralelas", 3, 8, 3, 15, "reps", "Braços retos, suba e desça só os ombros."],
          ["Suspensão nas paralelas", 3, 15, 3, 40, "s", "Braços travados, ombros longe das orelhas."],
          ["Superman", 3, 10, 3, 20, "reps", "Deitado de bruços, eleve braços e pernas."],
        ]],
        ["Pernas e core A", [
          ["Agachamento", 3, 15, 4, 30, "reps", "Desça até a coxa ficar paralela ao chão."],
          ["Afundo (cada perna)", 3, 8, 4, 15, "reps", "Passo largo, joelho de trás quase no chão."],
          ["Subida no banco (cada perna)", 3, 10, 4, 15, "reps", "Suba sem impulso da perna de baixo."],
          ["Elevação de panturrilha", 3, 15, 4, 25, "reps", "Na borda do banco, amplitude total."],
          ["Elevação de joelhos nas paralelas", 3, 6, 4, 14, "reps", "Apoiado nas barras, joelhos até o peito."],
          ["Abdominal bicicleta", 3, 16, 3, 30, "reps", "Cotovelo no joelho oposto, sem pressa."],
        ]],
        ["Empurrar B — Paralelas", [
          ["Mergulho nas paralelas", 3, 3, 4, 8, "reps", "No começo, faça só a descida lenta (5 s)."],
          ["Flexão diamante", 3, 5, 4, 12, "reps", "Mãos juntas sob o peito (tríceps)."],
          ["Flexão aberta", 3, 8, 4, 15, "reps", "Mãos mais largas que os ombros (peito)."],
          ["Flexão pike", 2, 5, 3, 10, "reps", "Ombros."],
          ["Prancha lateral (cada lado)", 2, 20, 3, 40, "s", "Quadril alto, corpo em linha."],
        ]],
        ["Puxar B — Largura das costas", [
          ["Remada australiana nas paralelas", 4, 6, 5, 12, "reps", "Cotovelos junto ao corpo, aperte as costas."],
          ["Remada com pausa de 2 s no topo", 3, 5, 4, 10, "reps", "Segure com o peito na barra."],
          ["Remada isométrica (segurar no topo)", 3, 10, 3, 25, "s", "Peito colado na barra."],
          ["Superman em Y", 3, 10, 3, 18, "reps", "Braços em Y, polegares para cima."],
          ["Hollow hold (canoa)", 3, 15, 3, 40, "s", "Lombar colada no chão."],
        ]],
        ["Pernas e core B", [
          ["Agachamento búlgaro no banco (cada perna)", 3, 6, 4, 12, "reps", "Pé de trás apoiado no banco."],
          ["Agachamento com salto", 3, 8, 4, 15, "reps", "Aterrisse macio."],
          ["Ponte de glúteo unilateral (cada perna)", 3, 10, 4, 15, "reps", "Costas no chão, suba o quadril."],
          ["Panturrilha unilateral (cada perna)", 3, 10, 4, 18, "reps", "Segure no banco para equilibrar."],
          ["L-sit com joelhos dobrados nas paralelas", 3, 8, 4, 20, "s", "Joelhos na altura do quadril."],
          ["Elevação de pernas deitado", 3, 8, 4, 15, "reps", "Pernas retas, desça devagar."],
        ]],
      ],
    },
    {
      nome: "Ascensão", prazo: "6 meses", stages: 12,
      meta: "Volume alto e variações mais difíceis: o V shape começa a aparecer.",
      tests: [
        ["Flexões seguidas", 35, "reps"], ["Mergulhos nas paralelas seguidos", 15, "reps"],
        ["Remadas australianas com pés elevados", 20, "reps"], ["L-sit nas paralelas", 20, "s"],
        ["Elevações de pernas retas nas paralelas", 12, "reps"],
      ],
      days: [
        ["Empurrar A — Peito e tríceps", [
          ["Flexão de braço", 4, 18, 5, 28, "reps", "Ritmo controlado."],
          ["Flexão com os pés no banco", 3, 8, 4, 16, "reps", "Enfatiza a parte de cima do peito."],
          ["Mergulho nas paralelas", 3, 8, 4, 14, "reps", "Incline o tronco para pegar mais peito."],
          ["Flexão pike com pés no banco", 3, 5, 4, 10, "reps", "Ombros."],
          ["Prancha com toque no ombro", 3, 16, 3, 30, "reps", "Sem balançar o quadril."],
        ]],
        ["Puxar A — Costas e bíceps", [
          ["Remada australiana com pés no banco", 4, 8, 5, 16, "reps", "Corpo na horizontal."],
          ["Remada supinada com pés no banco", 3, 8, 4, 14, "reps", "Bíceps."],
          ["Remada arqueiro (cada lado)", 3, 4, 4, 8, "reps", "Puxe para um lado, outro braço estendido."],
          ["Tuck front lever nas paralelas", 3, 8, 4, 20, "s", "Joelhos no peito, costas paralelas ao chão."],
          ["Superman em Y", 3, 15, 3, 25, "reps", "Segure 1 s no alto."],
        ]],
        ["Pernas e core A", [
          ["Agachamento com salto", 4, 12, 4, 20, "reps", "Explosivo."],
          ["Afundo andando (cada perna)", 4, 10, 4, 18, "reps", "Passos longos."],
          ["Agachamento búlgaro (cada perna)", 3, 10, 4, 16, "reps", "Desça em 3 s."],
          ["Panturrilha unilateral (cada perna)", 4, 15, 4, 25, "reps", "Amplitude total."],
          ["Elevação de pernas retas nas paralelas", 3, 5, 4, 12, "reps", "Pernas até a altura do quadril."],
          ["Abdominal em V", 3, 8, 4, 15, "reps", "Mãos encontram os pés."],
        ]],
        ["Empurrar B — Paralelas", [
          ["Mergulho nas paralelas", 4, 8, 5, 15, "reps", "Amplitude completa."],
          ["Flexão diamante", 4, 10, 4, 20, "reps", "Tríceps."],
          ["Flexão arqueiro (cada lado)", 3, 4, 4, 8, "reps", "Um braço trabalha, o outro apoia."],
          ["Flexão pike com pés no banco", 3, 5, 4, 10, "reps", "Ombros."],
          ["Prancha lateral com elevação de quadril", 3, 10, 3, 20, "reps", "Oblíquos."],
        ]],
        ["Puxar B — Largura das costas", [
          ["Remada australiana pegada aberta, pés no banco", 4, 8, 5, 14, "reps", "Abre as costas (dorsais)."],
          ["Remada com pausa de 3 s no topo", 4, 6, 4, 12, "reps", "Aperte as escápulas."],
          ["Remada isométrica (segurar no topo)", 3, 20, 3, 40, "s", "Peito colado na barra."],
          ["Encolhimento escapular invertido", 3, 10, 3, 18, "reps", "Braços retos sob a barra."],
          ["Hollow hold (canoa)", 3, 30, 3, 60, "s", "Braços atrás da cabeça."],
        ]],
        ["Pernas e core B", [
          ["Agachamento pistola assistido (cada perna)", 3, 4, 4, 8, "reps", "Segure na barra para equilibrar."],
          ["Agachamento isométrico na parede", 3, 40, 3, 75, "s", "Coxas paralelas ao chão."],
          ["Ponte de glúteo unilateral, pé no banco", 3, 12, 4, 18, "reps", "Posterior e glúteo."],
          ["Salto no banco", 3, 8, 4, 12, "reps", "Desça caminhando."],
          ["L-sit nas paralelas", 3, 8, 4, 20, "s", "Pernas retas à frente."],
          ["Limpador de para-brisa no chão", 3, 10, 3, 20, "reps", "Pernas retas, lado a lado."],
        ]],
      ],
    },
    {
      nome: "Monarca", prazo: "1 ano", stages: 24,
      meta: "Força avançada com o peso do corpo: físico em V e abdômen marcado.",
      tests: [
        ["Flexões seguidas", 50, "reps"], ["Mergulhos nas paralelas seguidos", 25, "reps"],
        ["Tuck front lever", 25, "s"], ["L-sit nas paralelas", 35, "s"],
        ["Agachamento pistola (cada perna)", 8, "reps"],
      ],
      days: [
        ["Empurrar A — Peito e tríceps", [
          ["Flexão de braço", 5, 28, 5, 40, "reps", "Últimas reps sem perder a forma."],
          ["Flexão com os pés no banco", 4, 16, 5, 25, "reps", "Parte superior do peito."],
          ["Mergulho nas paralelas", 4, 14, 5, 22, "reps", "Tronco inclinado."],
          ["Flexão pseudo-planche", 3, 5, 4, 12, "reps", "Mãos na linha da cintura, ombros à frente."],
          ["Flexão pike com pés no banco", 4, 8, 4, 15, "reps", "Ombros."],
        ]],
        ["Puxar A — Costas e bíceps", [
          ["Remada arqueiro (cada lado)", 4, 8, 5, 12, "reps", "Corpo na horizontal."],
          ["Remada australiana com pés no banco", 5, 14, 5, 22, "reps", "Volume."],
          ["Tuck front lever com remada", 3, 3, 4, 8, "reps", "Puxe mantendo as costas paralelas ao chão."],
          ["Tuck front lever", 3, 12, 4, 25, "s", "Abra os joelhos aos poucos."],
          ["Remada supinada com pausa", 3, 10, 4, 15, "reps", "Bíceps."],
        ]],
        ["Pernas e core A", [
          ["Agachamento pistola (cada perna)", 3, 3, 4, 8, "reps", "Sem apoio."],
          ["Afundo com salto (cada perna)", 4, 8, 4, 15, "reps", "Troque as pernas no ar."],
          ["Agachamento búlgaro lento (cada perna)", 4, 12, 4, 20, "reps", "5 s na descida."],
          ["Panturrilha unilateral (cada perna)", 4, 20, 4, 30, "reps", "Pausa de 2 s no alto."],
          ["Elevação de pernas retas nas paralelas", 4, 12, 5, 18, "reps", "Pés acima do quadril."],
          ["Abdominal em V", 4, 12, 4, 20, "reps", "Sem tocar os pés no chão."],
        ]],
        ["Empurrar B — Paralelas", [
          ["Mergulho nas paralelas com pausa embaixo", 4, 10, 5, 18, "reps", "2 s na posição mais baixa."],
          ["Flexão arqueiro (cada lado)", 4, 8, 4, 14, "reps", "Caminho para a flexão de um braço."],
          ["Flexão diamante com pés no banco", 4, 10, 4, 18, "reps", "Tríceps."],
          ["Flexão explosiva (com palma)", 3, 5, 4, 10, "reps", "Potência."],
          ["Prancha lateral com elevação de quadril", 3, 20, 3, 30, "reps", "Oblíquos."],
        ]],
        ["Puxar B — Largura das costas", [
          ["Remada australiana pegada aberta, pés no banco", 5, 14, 5, 20, "reps", "Dorsais."],
          ["Remada com um braço assistida (cada lado)", 3, 4, 4, 8, "reps", "Outro braço só ajuda segurando no punho."],
          ["Remada isométrica (segurar no topo)", 3, 40, 3, 60, "s", "Peito colado na barra."],
          ["Skin the cat nas paralelas", 3, 2, 3, 6, "reps", "Giro completo e controlado."],
          ["Hollow hold (canoa)", 3, 60, 3, 90, "s", "Core de aço."],
        ]],
        ["Pernas e core B", [
          ["Agachamento pistola (cada perna)", 3, 4, 4, 10, "reps", "Controle na descida."],
          ["Salto no banco", 4, 12, 4, 18, "reps", "Explosão."],
          ["Deslizamento de posterior (cada perna)", 3, 8, 4, 15, "reps", "Ponte com um pé, estenda e recolha."],
          ["Agachamento isométrico na parede", 3, 75, 3, 120, "s", "Mental."],
          ["L-sit nas paralelas", 4, 20, 4, 35, "s", "Pernas retas e altas."],
          ["Limpador de para-brisa nas paralelas", 3, 6, 4, 12, "reps", "Em L-sit, pernas de um lado ao outro."],
        ]],
      ],
    },
  ],
};

const aquece = ["Aquecimento: caminhada rápida", 1, 5, 1, 5, "min", "Solte tornozelos e quadril."];
const desaquece = ["Desaquecimento: caminhada + alongamento", 1, 5, 1, 8, "min", "Panturrilha, posterior e quadril."];

const run = {
  id: "corrida", nome: "Corrida", icone: "🏃", met: 9,
  resumo: "6 sessões por semana: leves, tiros, ritmo e um longão. Do zero aos 21 km.",
  phases: [
    {
      nome: "Fundação", prazo: "3 meses", stages: 12,
      meta: "Sair do zero e correr sem parar.",
      tests: [["Correr sem parar", 5, "km"]],
      days: [
        ["Corrida leve", [aquece,
          ["Trote leve (caminhe 1 min quando precisar)", 1, 12, 1, 30, "min", "Ritmo em que dá para conversar."], desaquece]],
        ["Tiros", [aquece,
          ["Tiro forte de 1 min + 2 min caminhando", 4, 1, 8, 1, "min", "Forte, mas sem ser sprint máximo."], desaquece]],
        ["Regenerativo + core", [
          ["Caminhada rápida", 1, 25, 1, 40, "min", "Recuperação ativa."],
          ["Prancha", 3, 30, 3, 60, "s", "Core firme ajuda na postura da corrida."],
          ["Agachamento", 3, 12, 3, 20, "reps", "Fortalece para proteger os joelhos."],
          ["Elevação de panturrilha", 3, 15, 3, 25, "reps", "Amplitude total."]]],
        ["Ritmo", [aquece,
          ["Corrida em ritmo moderado-forte", 1, 8, 1, 20, "min", "Desconfortável, mas sustentável."], desaquece]],
        ["Corrida leve", [aquece,
          ["Trote leve (caminhe 1 min quando precisar)", 1, 10, 1, 25, "min", "Bem solto."], desaquece]],
        ["Longão", [aquece,
          ["Corrida longa e lenta", 1, 2, 1, 5, "km", "Pode intercalar caminhada nas primeiras semanas."], desaquece]],
      ],
    },
    {
      nome: "Ascensão", prazo: "6 meses", stages: 12,
      meta: "Dobrar a distância com ritmo consistente.",
      tests: [["Correr sem parar", 10, "km"]],
      days: [
        ["Corrida leve", [aquece, ["Corrida leve contínua", 1, 30, 1, 45, "min", "Ritmo de conversa."], desaquece]],
        ["Tiros de 400 m", [aquece,
          ["400 m forte + 200 m trotando", 6, 400, 10, 400, "m", "Mesmo ritmo do primeiro ao último."], desaquece]],
        ["Regenerativo + core", [
          ["Trote muito leve ou caminhada", 1, 30, 1, 40, "min", "Recuperação."],
          ["Prancha", 3, 60, 3, 90, "s", "Core."],
          ["Afundo (cada perna)", 3, 10, 3, 16, "reps", "Força de pernas."],
          ["Ponte de glúteo unilateral (cada perna)", 3, 10, 3, 15, "reps", "Glúteos protegem o joelho."]]],
        ["Ritmo", [aquece, ["Corrida em ritmo moderado-forte", 1, 20, 1, 30, "min", "Ritmo de prova de 10 km."], desaquece]],
        ["Corrida leve", [aquece, ["Corrida leve contínua", 1, 25, 1, 40, "min", "Solto."], desaquece]],
        ["Longão", [aquece, ["Corrida longa e lenta", 1, 6, 1, 10, "km", "Hidrate-se."], desaquece]],
      ],
    },
    {
      nome: "Monarca", prazo: "1 ano", stages: 24,
      meta: "Resistência de meia maratona.",
      tests: [["Correr sem parar", 21, "km"]],
      days: [
        ["Corrida leve", [aquece, ["Corrida leve contínua", 1, 40, 1, 60, "min", "Ritmo de conversa."], desaquece]],
        ["Tiros de 800 m", [aquece,
          ["800 m forte + 400 m trotando", 5, 800, 8, 800, "m", "Controle o ritmo."], desaquece]],
        ["Regenerativo + core", [
          ["Trote muito leve", 1, 30, 1, 45, "min", "Recuperação."],
          ["Prancha", 3, 90, 3, 120, "s", "Core."],
          ["Agachamento búlgaro (cada perna)", 3, 10, 3, 16, "reps", "Força."],
          ["Panturrilha unilateral (cada perna)", 3, 15, 3, 25, "reps", "Tendão de Aquiles forte."]]],
        ["Ritmo", [aquece, ["Corrida em ritmo moderado-forte", 1, 30, 1, 50, "min", "Ritmo de meia maratona."], desaquece]],
        ["Corrida leve", [aquece, ["Corrida leve contínua", 1, 35, 1, 50, "min", "Solto."], desaquece]],
        ["Longão", [aquece, ["Corrida longa e lenta", 1, 11, 1, 21, "km", "Leve água e algo para comer acima de 15 km."], desaquece]],
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
// A etapa final da fase foi concluída: libera o Teste de Rank.
export function testUnlocked() {
  const ph = currentPhase(); const p = progress();
  return !!ph && !trackFinished() && p.week > ph.stages;
}

const lerp = (a, b, k) => Math.round(a + (b - a) * k);

// Posição do dia entre os 6 dias de treino da semana (pulando o dia de descanso).
export function workoutIndex(date) {
  const rest = S.profile?.restDay ?? 0;
  const wd = weekday(date);
  if (wd === rest) return Object.values(S.days).filter(d => d.workout?.done).length % 6;
  return ((wd - rest + 7) % 7) - 1;
}

// Treino prescrito para a data, na etapa atual. { titulo, itens: [{nome, series, alvo, un, dica}] }
export function workoutFor(date, indoor = false) {
  const t = currentTrack(), ph = currentPhase(); if (!t || !ph) return null;
  const p = progress();
  const stage = Math.min(p.week, ph.stages);
  const k = ph.stages > 1 ? (stage - 1) / (ph.stages - 1) : 1;
  const idx = workoutIndex(date);
  const [titulo, exs] = indoor && t.id === "corrida" ? runIndoor : ph.days[idx];
  return {
    idx, titulo, stage, stages: ph.stages,
    itens: exs.map(([nome, s0, r0, s1, r1, un, dica]) => ({
      nome, series: lerp(s0, s1, k), alvo: lerp(r0, r1, k), un, dica,
    })),
  };
}

export const unitLabel = (v, un) => un === "reps" ? `${v} reps` : `${v} ${un}`;
