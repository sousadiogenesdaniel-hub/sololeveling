// Missão: trilha, treino do dia, ponto por GPS, treino indoor em dia de chuva, Teste de Rank
import { views, actions, refresh } from "../core.js";
import { S, day, save, photos } from "../store.js";
import { today, addDays, esc, fmt, fmtTime, fmtDate, getPosition, getPreciseFix, distM, shrinkImage, uid, $, num } from "../util.js";
import { header, panel, toast, sysMessage, showEvents, modal, closeModal, confirmBox } from "../ui.js";
import { completeWorkout, passTest, isRestDay, workoutKcal, grant, R, RANK_TESTS, RANK_ORDER, testsPassed } from "../game.js";
import { TRACKS, trackById, currentTrack, currentPhase, progress, workoutFor, testUnlocked, testStatus, TEST_COOLDOWN, trackFinished, unitLabel, SESSIONS_PER_STAGE, testKey, setPR } from "../tracks.js";
import { statusList, avaliacaoLiberada, avaliacaoForm } from "./avaliacao.js";

const INDOOR_MIN = 25;        // minutos mínimos do treino indoor
const PUNCH_EXPIRES_H = 5;    // ponto de entrada vence depois disso

// Regras do ponto (pisos fixos: o Perfil pode aumentar, nunca diminuir)
export const MIN_DIST = 1000, MIN_MIN = 30;
const minDist = () => Math.max(MIN_DIST, S.profile.minDist ?? MIN_DIST);
const minMin = () => Math.max(MIN_MIN, S.profile.minMin ?? MIN_MIN);
const elapsedMin = w => (Date.now() - w.in.t) / 60000;

// Locais de treino: o ponto só vale dentro do raio de um local cadastrado
export const SPOT = { raio: 100, folgaMax: 50, max: 3, carenciaDias: 3 };
const spots = () => (S.spots ||= []);
const activeSpots = () => spots().filter(s => s.validFrom <= today());

function chooseTrack() {
  return `${header()}<div class="stack">
    ${panel("Escolha sua trilha", `<p>A trilha define seus treinos diários. O Sistema aumenta as cargas conforme você cumpre as missões.</p>
    <ul class="list">${TRACKS.map(t => `<li>
      <span style="font-size:1.6rem">${t.icone}</span>
      <span class="grow"><b>${t.nome}</b><br><span class="small muted">${t.resumo}</span></span>
      ${t.building ? `<span class="chip muted">Building…</span>` : `<button class="btn sm primary" data-act="pickTrack" data-id="${t.id}">Iniciar</button>`}
    </li>`).join("")}</ul>`)}</div>`;
}

actions.pickTrack = ({ id }) => {
  S.track = { id, startDate: S.game.log.length || Object.keys(S.days).length ? today() : addDays(today(), 1) };
  S.trackSince ??= S.track.startDate;
  progress(id);
  save();
  const ph = currentPhase();
  sysMessage("Trilha iniciada", `<p class="mid glow">${trackById(id).nome}</p>
    <p>Fase <b>${ph.nome}</b>. Sua primeira meta tem prazo de <b>${ph.prazo}</b>.</p>
    <p class="small muted">6 treinos por semana, 1 dia de descanso. Faltou, pagou.</p>`, { onClose: refresh });
};

// Rank que passa a ser permitido se você passar no próximo teste (null se já foi liberado em outra trilha)
const unlocks = () => RANK_ORDER.find(r => RANK_TESTS[r] === progress().phase + 1 && RANK_TESTS[r] > testsPassed()) || null;

function trailCard() {
  const t = currentTrack(), p = progress(), ph = currentPhase();
  const fases = t.phases.map((f, i) => {
    if (i < p.phase) return `<li><span class="ok">✔</span><span class="grow">${f.nome} <span class="small muted">(${f.prazo})</span></span><span class="chip ok">Conquistada</span></li>`;
    if (i === p.phase) return `<li><span class="glow">▶</span><span class="grow"><b>${f.nome}</b> <span class="small muted">(${f.prazo})</span></span><span class="chip">Atual</span></li>`;
    return `<li class="muted"><span>🔒</span><span class="grow">??? <span class="small">Meta oculta</span></span></li>`;
  }).join("");
  const stage = Math.min(p.week, ph.stages);
  const pct = ((stage - 1) * SESSIONS_PER_STAGE + (p.week > ph.stages ? 0 : p.sessions)) / (ph.stages * SESSIONS_PER_STAGE) * 100;
  return panel(`Trilha: ${t.nome}`, `
    <div class="row between small"><span>Etapa <b class="glow">${stage}</b> de ${ph.stages}</span>
      <span class="muted">${p.week > ph.stages ? "Teste de Rank liberado" : `${p.sessions}/${SESSIONS_PER_STAGE} treinos completos para subir a carga`}</span></div>
    ${p.week < Math.ceil(ph.stages / 2) + 1 ? `<p class="small muted" style="margin:4px 0 0">Teste antecipado a partir da etapa ${Math.ceil(ph.stages / 2) + 1}.</p>` : ""}
    <div class="bar" style="margin:6px 0 12px"><i style="width:${p.week > ph.stages ? 100 : pct}%"></i></div>
    <h3>Teste do rank ${ph.rank} · ~${ph.prazo.replace("~", "")} de jogo perfeito</h3>
    <p class="small" style="margin:4px 0">${ph.meta}</p>
    <h3 style="margin-top:10px">Seu status <span class="muted">(seu máximo / meta)</span></h3>
    ${statusList(ph)}
    <a class="btn sm block" style="margin:8px 0 12px" href="#/avaliacao">${S.pr && Object.keys(S.pr).length ? "Teste de Avaliação: atualizar meus máximos" : "Fazer o Teste de Avaliação (seus máximos)"}</a>
    <ul class="list small">${fases}</ul>
    <a class="btn sm ghost block" style="margin-top:8px" href="#/evolucao">Ver quadro de assiduidade</a>`);
}

function testCard() {
  const ph = currentPhase(), st = testStatus();
  if (st.nextTry) {
    return panel("Teste de Rank", `<p>Próxima tentativa do teste do rank <b>${ph.rank}</b> em <b>${fmtDate(st.nextTry)}</b>.</p>
      <p class="small muted">Uma tentativa a cada ${TEST_COOLDOWN} dias. Enquanto isso, siga a fase normalmente.</p>`);
  }
  const form = `<form data-act="submitTest" data-rascunho="teste"><input type="hidden" name="early" value="${st.early ? 1 : ""}">${ph.tests.map(([n, v, un], i) => `<div class="field">
      <label for="t${i}">${n} (meta: ${unitLabel(v, un)})</label>
      <input id="t${i}" name="t${i}" inputmode="decimal" required></div>`).join("")}
      <button class="btn primary block">Enviar resultado</button></form>`;
  const sobre = `<p class="small glow">Passar libera o rank ${ph.rank}${unlocks() ? "" : " (já liberado em outra trilha)"} quando você também tiver o nível, revela a próxima meta e dá +${R.testeXp} XP e +${R.testeOuro} Ouro.</p>`;
  if (st.early) {
    return panel("Teste antecipado", `<p>Você já completou metade da fase <b>${ph.nome}</b>. Se já consegue as metas do rank <b>${ph.rank}</b>, prove agora e pule direto para a próxima fase.</p>
      ${sobre}<p class="small muted">Se não passar, nada perde: continua a fase normalmente e pode tentar de novo em ${TEST_COOLDOWN} dias. Faça descansado, no início do treino.</p>
      <details><summary class="btn block" style="list-style:none">Fazer o teste agora</summary><div style="margin-top:12px">${form}</div></details>`);
  }
  return panel("Teste de Rank", `<p>Você concluiu todas as etapas da fase <b>${ph.nome}</b>. Prove que está pronto para o rank <b>${ph.rank}</b>:
    informe seu melhor resultado em cada prova (faça descansado, de preferência no início do treino).</p>
    ${sobre}${form}`, "good");
}

actions.submitTest = data => {
  const ph = currentPhase(), early = !!data.early;
  const falhas = ph.tests.filter(([, v], i) => (num(data["t" + i]) ?? 0) < v);
  ph.tests.forEach(([n], i) => setPR(testKey(n), num(data["t" + i]))); // a tentativa, mesmo reprovada, atualiza seus máximos
  day().testeFeito = true; // vale para concluir o "Dia de Teste de Rank"
  if (S.rascunhos) delete S.rascunhos.teste;
  if (falhas.length) {
    progress().lastTestTry = today(); save(); refresh();
    return sysMessage("Teste não superado", `<p>Ainda falta em: <b>${falhas.map(f => f[0]).join(", ")}</b>.</p>
      <p class="small muted">${early ? "Sem problema: continue a fase normalmente." : "Continue treinando na etapa final."} Próxima tentativa em ${fmtDate(addDays(today(), TEST_COOLDOWN))}.</p>`);
  }
  const ev = passTest(early);
  const acabou = trackFinished();
  showEvents("Meta conquistada", [ev], acabou
    ? `<p class="glow">Você concluiu a trilha inteira. O Sistema reconhece um Monarca.</p>`
    : `<p>Uma nova meta foi revelada: <b class="glow">${currentPhase().nome}</b>, rumo ao rank ${currentPhase().rank}.</p>`);
  refresh();
};

function exerciseList(w, plan, active) {
  return `<ul class="list">${plan.itens.map((it, e) => `<li style="display:block">
    <div class="row between"><b>${esc(it.nome)}</b><span class="chip">${it.series} × ${unitLabel(it.alvo, it.un)}</span></div>
    <div class="small muted">${esc(it.dica)}</div>
    ${it.calib ? `<div class="small glow">⚡ Ajustado ao seu máximo (${it.calib.v}): ${it.calib.pct}%</div>` : ""}
    <div class="sets">${Array.from({ length: it.series }, (_, i) => `<button class="set ${w?.sets?.[e]?.[i] === true ? "on" : w?.sets?.[e]?.[i] === "low" ? "low" : ""}"
      ${active ? "" : "disabled"} data-act="toggleSet" data-e="${e}" data-i="${i}" aria-pressed="${!!w?.sets?.[e]?.[i]}" aria-label="Série ${i + 1} de ${esc(it.nome)}">${i + 1}</button>`).join("")}</div>
  </li>`).join("")}</ul>`;
}

// 1º toque: série no alvo (verde) · 2º: feita abaixo do alvo (amarelo) · 3º: desmarca
actions.toggleSet = ({ e, i }, el) => {
  const w = day().workout; if (!w || w.done) return;
  w.sets ??= {}; w.sets[e] ??= [];
  const cur = w.sets[e][i];
  w.sets[e][i] = !cur ? true : cur === true ? "low" : false;
  el.classList.toggle("on", w.sets[e][i] === true); el.classList.toggle("low", w.sets[e][i] === "low");
  el.setAttribute("aria-pressed", !!w.sets[e][i]);
  el.setAttribute("aria-label", el.getAttribute("aria-label").replace(/( —.*)?$/, w.sets[e][i] === "low" ? " — abaixo do alvo" : w.sets[e][i] ? " — no alvo" : ""));
  save();
};

// Dias especiais: a avaliação ou o Teste de Rank viram a missão do dia (com ponto). A fila de treinos
// não anda (o treino do dia fica para amanhã) e a carga não sobe; XP, Ouro e sequência valem normalmente.
// Na Zona de Penalidade, o Dia de Avaliação pode servir de redenção (o treino pendente continua na fila e vai
// para o dia seguinte); o Dia de Teste de Rank não aparece na penalidade.
export const MODOS = {
  avaliacao: { titulo: "Dia de Avaliação", icone: "📊", link: "#/avaliacao", botao: "Registrar meus máximos",
    desc: "Faça uma série máxima de cada prova da fase, com 3 a 5 min de descanso entre elas, e registre os números.",
    pronto: () => avaliacaoLiberada(), feito: () => S.prEm === today() },
  teste: { titulo: "Dia de Teste de Rank", icone: "⚔️", link: null, botao: null,
    desc: "Faça cada prova do Teste de Rank descansado e registre os resultados no card do Teste de Rank, nesta mesma tela.",
    pronto: () => { const st = testStatus(); return !S.game.needsWorkout && !!st && !st.nextTry; }, feito: () => !!S.days[today()]?.testeFeito },
};

function modoCard(m) {
  const M = MODOS[m];
  return panel(M.titulo, `<p style="margin-top:0">${M.desc}</p>
    <p class="small muted">Vale como a missão de hoje: bata o ponto de entrada, faça as provas (mínimo de ${minMin()} min) e bata o ponto de saída no local.
      O treino da fila (${esc(workoutFor(today()).titulo)}) fica para amanhã, e este dia não conta para subir a carga.</p>
    ${S.game.needsWorkout ? `<p class="small warn">Vale como treino de redenção da Zona de Penalidade. O treino que ficou pendente continua na fila e passa para amanhã.</p>` : ""}
    <button class="btn primary block" data-act="punchIn">Bater ponto: entrada</button>
    <button class="btn ghost block" style="margin-top:8px" data-act="setModo" data-m="">Voltar ao treino normal</button>`, "", `<span class="chip">${M.icone}</span>`);
}

actions.setModo = ({ m }) => {
  const d = day();
  if (m && !MODOS[m]?.pronto()) return toast("Não está disponível hoje.");
  if (m) d.modo = m; else delete d.modo;
  save(); refresh();
};

function todayCard() {
  const t = today(), w = S.days[t]?.workout;
  if (w?.done) {
    return panel("Missão de hoje", `<p class="mid ok">✔ Missão concluída</p>
      <p>${esc(w.plano.titulo)}${w.indoor ? " (indoor)" : ""}</p>
      <div class="grid3">
        <div class="tile"><div class="lbl">Duração</div><div class="val num">${w.durMin} min</div></div>
        <div class="tile"><div class="lbl">Gasto</div><div class="val num">~${w.kcal} kcal</div></div>
        <div class="tile"><div class="lbl">${w.plano.modo ? "Tipo" : "Séries"}</div><div class="val">${w.plano.modo ? MODOS[w.plano.modo].icone : w.hit ? "No alvo" : w.full ? "Abaixo" : "Parcial"}</div></div></div>
      <p class="small muted">${w.indoor ? "Treino indoor validado pelo clima." : `Ponto: entrada ${fmtTime(w.in.t)} (${fmt(w.in.dist / 1000, 1)} km de casa) · saída ${fmtTime(w.out.t)} (${fmt(w.out.dist / 1000, 1)} km)`}
      ${w.plano.modo ? "<br>Dia especial: o treino da fila fica para amanhã." : w.hit ? "" : w.full ? "<br>Algumas séries ficaram abaixo do alvo: a carga se mantém e esse treino não conta para a etapa." : "<br>Como nem todas as séries foram marcadas, este treino não conta para subir a carga."}</p>`, "good");
  }
  if (isRestDay(t) && !S.game.needsWorkout) {
    return panel("Missão de hoje", `<p class="mid">Dia de descanso</p><p class="muted">Sem missão hoje. Durma bem e coma direito.</p>`);
  }
  if (w?.in && elapsedMin(w) > PUNCH_EXPIRES_H * 60) { delete day(t).workout; save(); }
  const cur = S.days[t]?.workout;
  if (cur?.in) {
    const plan = cur.plano, need = cur.indoor ? INDOOR_MIN : minMin();
    if (plan.modo) {
      const M = MODOS[plan.modo], feito = M.feito();
      return panel(plan.titulo, `<div class="timer num glow" id="timer">00:00</div>
        <p class="center small muted">Entrada às ${fmtTime(cur.in.t)} · ${cur.in.spot ? esc(cur.in.spot) : fmt(cur.in.dist / 1000, 1) + " km de casa"} · mínimo ${need} min</p>
        <p>${M.desc}</p>
        <p class="small ${feito ? "ok" : "warn"}">${feito ? "✔ Resultados registrados." : "Registre os resultados antes de bater o ponto de saída."}</p>
        ${plan.modo === "avaliacao" && !feito ? avaliacaoForm(currentPhase()) : ""}
        <button class="btn primary block" style="margin-top:8px" data-act="punchOut">Bater ponto: saída</button>
        <button class="btn ghost sm block" style="margin-top:8px" data-act="cancelWorkout">Cancelar</button>`, "", `<span class="chip warn">Em andamento</span>`);
    }
    return panel(plan.titulo, `
      <div class="timer num glow" id="timer">00:00</div>
      <p class="center small muted">${cur.indoor ? "Dungeon Indoor" : `Entrada às ${fmtTime(cur.in.t)} · ${cur.in.spot ? esc(cur.in.spot) : fmt(cur.in.dist / 1000, 1) + " km de casa"}`} · mínimo ${need} min</p>
      <p class="small muted center">Toque 1× na série = no alvo · 2× = abaixo do alvo (a carga não sobe) · 3× = desmarca</p>
      ${exerciseList(cur, plan, true)}
      ${cur.indoor
        ? `<label class="btn primary block" style="margin-top:12px">Concluir: tirar selfie de prova
            <input type="file" accept="image/*" capture="user" class="hidden" data-chg="finishIndoor"></label>`
        : `<button class="btn primary block" style="margin-top:12px" data-act="punchOut">Bater ponto: saída</button>`}
      <button class="btn ghost sm block" style="margin-top:8px" data-act="cancelWorkout">Cancelar este treino</button>`, "", `<span class="chip warn">Em andamento</span>`);
  }
  const modo = S.days[t]?.modo;
  if (modo && MODOS[modo]?.pronto()) return modoCard(modo);
  const plan = workoutFor(t);
  const especiais = Object.entries(MODOS).filter(([, M]) => M.pronto());
  const escolha = especiais.length ? `<div class="row wrap" style="gap:6px;margin-top:8px">${especiais.map(([k, M]) =>
    `<button class="btn sm ghost grow" data-act="setModo" data-m="${k}">${M.icone} Hoje é ${M.titulo.replace("Dia de ", "dia de ")}</button>`).join("")}</div>` : "";
  const redencao = S.game.needsWorkout ? `<p class="small warn">Treino de redenção: é o treino que ficou pendente${isRestDay(t) ? ". Hoje seria descanso, mas você está na Zona de Penalidade" : ""}.</p>` : "";
  const leve = plan.leve ? `<p class="small ok">Semana leve: volume 30% menor para o corpo se recuperar. Faz parte do plano.</p>` : "";
  return panel(plan.titulo, `${redencao}${leve}
    ${exerciseList(null, plan, false)}
    <p class="small muted">Para valer: bata o ponto de entrada ${activeSpots().length ? "no seu local de treino" : `a mais de ${fmt(minDist() / 1000, 1)} km de casa`} (GPS preciso), treine pelo menos ${minMin()} min e bata o ponto de saída no local.</p>
    <button class="btn primary block" data-act="punchIn">Bater ponto: entrada</button>
    <button class="btn ghost block" style="margin-top:8px" data-act="checkRain">🌧 Chuva forte? Verificar clima</button>
    ${escolha}`,
    "", `<span class="chip ${plan.leve ? "ok" : ""}">${plan.leve ? "Semana leve · " : ""}Etapa ${plan.stage}/${plan.stages}</span>`);
}

const homeOk = () => !!S.profile.home?.acc; // casas cadastradas antes da checagem de precisão não têm .acc

async function locate() {
  if (!homeOk()) {
    sysMessage(S.profile.home ? "Recadastre sua casa" : "Casa não cadastrada", `<p>${S.profile.home
      ? "O Sistema passou a exigir GPS preciso, e o cadastro antigo da sua casa pode ter sido feito com localização aproximada."
      : "Para o ponto funcionar, o Sistema precisa saber onde é sua casa."}</p>
      <p class="small muted">Esteja em casa ao cadastrar.</p>
      <a class="btn block" href="#/perfil" data-close>Cadastrar no Perfil</a>`, { botao: "Fechar" });
    return null;
  }
  toast("Verificando sua localização pelo GPS…", 30000);
  try {
    const pos = await getPreciseFix({ onUpdate: b => { const t = $("#toast"); if (t) t.textContent = `Verificando sua localização… precisão ±${b.acc} m`; } });
    $("#toast")?.remove();
    const dist = Math.round(distM(pos, S.profile.home));
    // conta a favor da regra: a distância só vale descontando o erro do GPS e do cadastro da casa
    const garantida = Math.max(0, dist - pos.acc - S.profile.home.acc);
    // local de treino mais próximo; a folga cobre o erro do GPS, até 50 m
    const near = activeSpots().map(sp => ({ sp, d: Math.round(distM(pos, sp)) })).sort((x, y) => x.d - y.d)[0] || null;
    const raio = near ? SPOT.raio + Math.min(SPOT.folgaMax, pos.acc + near.sp.acc) : 0;
    return { ...pos, t: Date.now(), dist, garantida, spot: near && near.d <= raio ? near.sp.nome : null, spotDist: near?.d, spotNome: near?.sp.nome, raio };
  } catch (e) { $("#toast")?.remove(); sysMessage("Localização não verificada", `<p>${esc(e.message)}</p>`); return null; }
}

const posLine = pos => pos.spot
  ? `Você está no <b>${esc(pos.spot)}</b> (${fmt(pos.spotDist)} m do ponto cadastrado, GPS ±${pos.acc} m), a ${fmt(pos.dist / 1000, 1)} km de casa.`
  : `Você está a <b>${fmt(pos.dist)} m</b> de casa (precisão do GPS ±${pos.acc} m).`;

// Devolve o motivo da recusa, ou null se o ponto vale
function refuse(pos, saida) {
  if (pos.garantida < minDist()) {
    return `<p>${posLine(pos)}</p><p>${saida ? "Bata o ponto de saída ainda no local de treino, a" : "O ponto só vale a"} mais de <b>${fmt(minDist() / 1000, 1)} km</b> de casa${pos.dist >= minDist() ? ", descontando a margem de erro do GPS" : ""}.</p>`;
  }
  if (!activeSpots().length) return null; // nenhum local ativo ainda: vale só a regra de 1 km
  if (!pos.spot) {
    return `<p>Você está a <b>${fmt(pos.spotDist)} m</b> do local de treino mais próximo (${esc(pos.spotNome)}). O ponto só vale num raio de ${pos.raio} m dele.</p>
      <p class="small muted">GPS ±${pos.acc} m. ${saida ? "Bata o ponto de saída no mesmo lugar onde treinou." : "Vá até o local de treino e tente de novo."}</p>`;
  }
  return null;
}

actions.punchIn = async () => {
  const pos = await locate(); if (!pos) return;
  const motivo = refuse(pos, false);
  if (motivo) return sysMessage("Ponto recusado", motivo);
  const m = day().modo && MODOS[day().modo] ? day().modo : null;
  const plano = m ? { titulo: MODOS[m].titulo, modo: m, itens: [], idx: null } : workoutFor(today());
  day().workout = { trackId: S.track.id, plano, in: pos, sets: {} };
  save(); refresh();
  sysMessage("Ponto de entrada registrado", `<p>${posLine(pos)}</p><p class="mid glow">${fmtTime(pos.t)}</p>
    ${activeSpots().length ? "" : `<p class="small warn">Cadastre seu local de treino abaixo: depois de ativo, o ponto só vale dentro dele.</p>`}
    <p class="small muted">Treine pelo menos ${minMin()} min e bata o ponto de saída ainda no local.</p>`, { botao: "Bom treino" });
};

actions.punchOut = async () => {
  const w = day().workout, falta = Math.ceil(minMin() - elapsedMin(w));
  if (falta > 0) return sysMessage("Ainda não", `<p>Faltam <b>${falta} min</b> para o tempo mínimo de ${minMin()} min de treino.</p>`);
  if (w.plano.modo && !MODOS[w.plano.modo].feito()) return sysMessage("Faltam os resultados", `<p>Registre os resultados ${w.plano.modo === "avaliacao" ? "da avaliação" : "do Teste de Rank"} antes de bater o ponto de saída.</p>`);
  const pos = await locate(); if (!pos) return;
  const motivo = refuse(pos, true);
  if (motivo) return sysMessage("Ponto recusado", motivo);
  w.out = pos;
  finish(w);
};

// ---- cadastro de locais de treino ------------------------------------------------------
function spotsCard() {
  const list = spots();
  const item = sp => {
    const ativo = sp.validFrom <= today();
    return `<li><span style="font-size:1.3rem">📍</span><span class="grow"><b>${esc(sp.nome)}</b><br>
      <span class="small ${ativo ? "ok" : "warn"}">${ativo ? "Ativo" : `Passa a valer em ${fmtDate(sp.validFrom)}`}</span>
      <span class="small muted"> · GPS ±${sp.acc} m</span></span>
      <button class="btn sm danger" data-act="delSpot" data-id="${sp.id}" aria-label="Remover ${esc(sp.nome)}">✕</button></li>`;
  };
  return panel("Locais de treino", `
    ${list.length ? `<ul class="list">${list.map(item).join("")}</ul>` : `<p class="warn small">Nenhum local cadastrado. Enquanto isso, o ponto vale em qualquer lugar a mais de 1 km de casa.</p>`}
    <p class="small muted">O ponto de entrada e o de saída só valem num raio de ${SPOT.raio} m do local (+ até ${SPOT.folgaMax} m de margem do GPS).
      Cadastre estando no ponto exato onde treina (ex.: nas barras). ${list.length || S.spotsEver ? `Local novo só passa a valer depois de ${SPOT.carenciaDias} dias.` : "O primeiro local vale na hora; os seguintes, só depois de " + SPOT.carenciaDias + " dias."} Máximo de ${SPOT.max}.</p>
    <button class="btn block" data-act="addSpot" ${list.length >= SPOT.max ? "disabled" : ""}>${list.length >= SPOT.max ? "Limite de 3 locais" : "📍 Cadastrar: estou no local de treino"}</button>`,
    "", `<span class="small muted">${list.length}/${SPOT.max}</span>`);
}

actions.addSpot = () => {
  if (spots().length >= SPOT.max) return;
  const o = modal(`<div class="ptitle"><h2>Novo local de treino</h2></div>
    <form id="spf"><div class="field"><label for="spn">Nome</label><input id="spn" name="nome" required maxlength="30" placeholder="ex.: Parque — barras"></div>
    <p class="small muted">Esteja agora no ponto exato onde você treina. O Sistema vai ler seu GPS.</p>
    <div class="row"><button type="button" class="btn ghost grow" data-close>Cancelar</button><button class="btn primary grow">Cadastrar aqui</button></div></form>`);
  $("#spf", o).onsubmit = async e => {
    e.preventDefault();
    const nome = e.target.nome.value.trim(); closeModal();
    if (!homeOk()) return locate(); // mostra o aviso de casa não cadastrada
    toast("Verificando sua localização pelo GPS…", 30000);
    let pos;
    try { pos = await getPreciseFix({ onUpdate: b => { const t = $("#toast"); if (t) t.textContent = `Verificando sua localização… precisão ±${b.acc} m`; } }); }
    catch (err) { $("#toast")?.remove(); return sysMessage("Local não cadastrado", `<p>${esc(err.message)}</p>`); }
    $("#toast")?.remove();
    const dist = Math.round(distM(pos, S.profile.home));
    if (dist - pos.acc - S.profile.home.acc < minDist()) {
      return sysMessage("Local recusado", `<p>Este lugar fica a <b>${fmt(dist)} m</b> de casa (GPS ±${pos.acc} m). O local de treino precisa estar a mais de ${fmt(minDist() / 1000, 1)} km de casa.</p>`);
    }
    const primeiro = !S.spotsEver && !spots().length;
    const sp = { id: uid(), nome, lat: pos.lat, lon: pos.lon, acc: pos.acc, criado: today(), validFrom: primeiro ? today() : addDays(today(), SPOT.carenciaDias) };
    spots().push(sp); S.spotsEver = true;
    grant(0, 0, `Local de treino cadastrado: ${nome}${primeiro ? "" : ` (vale a partir de ${fmtDate(sp.validFrom)})`}`);
    save(); refresh();
    sysMessage("Local cadastrado", `<p class="mid glow">📍 ${esc(nome)}</p><p>${fmt(dist / 1000, 1)} km de casa · GPS ±${pos.acc} m</p>
      <p class="${primeiro ? "ok" : "warn"}">${primeiro ? "Já vale a partir de agora." : `Passa a valer em ${fmtDate(sp.validFrom)}.`}</p>`);
  };
};

actions.delSpot = async ({ id }) => {
  const sp = spots().find(x => x.id === id);
  if (!await confirmBox("Remover local", `Remover "${sp.nome}"? Um local novo só passa a valer depois de ${SPOT.carenciaDias} dias.`, "Remover")) return;
  S.spots = spots().filter(x => x.id !== id);
  grant(0, 0, `Local de treino removido: ${sp.nome}`);
  save(); refresh();
};

function finish(w) {
  w.durMin = Math.round(((w.out?.t ?? Date.now()) - w.in.t) / 60000);
  w.kcal = workoutKcal(today(), w.durMin, w.indoor);
  const events = completeWorkout();
  refresh();
  showEvents("Missão concluída", events);
}

actions.cancelWorkout = async () => {
  if (!await confirmBox("Cancelar treino", "O ponto de entrada e as séries marcadas serão apagados.", "Cancelar treino")) return;
  delete day().workout; delete day().modo; save(); refresh();
};

// ---- chuva forte: Dungeon Indoor ---------------------------------------------------
const HEAVY_CODES = [63, 65, 66, 67, 81, 82, 95, 96, 99]; // chuva moderada/forte, pancadas fortes, trovoada
export function isHeavyRain(j) {
  const mm = j.current?.precipitation ?? 0, code = j.current?.weather_code;
  const horas = (j.hourly?.precipitation || []).slice(5, 23).filter(v => v >= 1).length;
  return { heavy: HEAVY_CODES.includes(code) || mm >= 2 || horas >= 8, mm, horas };
}

actions.checkRain = async () => {
  const d = day();
  if (!d.rain?.heavy) {
    toast("Consultando o clima…", 15000);
    try {
      const pos = S.profile.home || await getPosition();
      // coordenadas arredondadas (~1 km): suficiente para o clima, sem expor o endereço
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat.toFixed(2)}&longitude=${pos.lon.toFixed(2)}` +
        `&current=precipitation,weather_code&hourly=precipitation&forecast_days=1&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      d.rain = isHeavyRain(await res.json());
      save();
    } catch { return toast("Não consegui consultar o clima. Verifique a internet e tente de novo.", 5000); }
    $("#toast")?.remove();
  }
  if (!d.rain.heavy) {
    return sysMessage("Sem chuva forte", `<p>Agora: <b>${fmt(d.rain.mm, 1)} mm/h</b>. O Sistema não detectou chuva forte na sua região.</p>
      <p class="small muted">A missão continua valendo no local de treino. Você pode verificar de novo mais tarde.</p>`,
      { onClose: () => { delete d.rain; save(); } });
  }
  const plan = workoutFor(today(), true);
  modal(`<div class="ptitle"><h2>Dungeon Indoor liberada</h2></div>
    <p>Chuva forte confirmada (${fmt(d.rain.mm, 1)} mm/h agora, ${d.rain.horas} h de chuva previstas hoje). Você pode cumprir a missão em casa.</p>
    <ul><li>Treino: <b>${esc(plan.titulo)}</b></li><li>Mínimo de ${INDOOR_MIN} min com o cronômetro do app</li>
    <li>Todas as séries marcadas</li><li>Selfie de prova no final</li></ul>
    <p class="small muted">Sem barras em casa? Use duas cadeiras firmes para mergulhos e uma mesa resistente para as remadas.</p>
    <div class="row"><button class="btn ghost grow" data-close>Agora não</button>
    <button class="btn primary grow" data-act="startIndoor">Entrar na dungeon</button></div>`);
};

actions.startIndoor = () => {
  day().workout = { trackId: S.track.id, plano: workoutFor(today(), true), in: { t: Date.now() }, sets: {}, indoor: true };
  save(); closeModal(); refresh();
};

actions.finishIndoor = async (_, el) => {
  const file = el.files[0]; el.value = "";
  if (!file) return;
  const w = day().workout, falta = Math.ceil(INDOOR_MIN - elapsedMin(w));
  if (falta > 0) return toast(`Ainda faltam ${falta} min para o tempo mínimo.`, 4000);
  const total = w.plano.itens.reduce((n, i) => n + i.series, 0);
  const feitas = Object.values(w.sets).reduce((n, a) => n + a.filter(Boolean).length, 0);
  if (feitas < total) return toast(`Marque todas as séries antes de concluir (${feitas}/${total}).`, 4000);
  await photos.add({ date: today(), angulo: "prova", tipo: "prova", blob: await shrinkImage(file, 1000) });
  finish(w);
};

views.treino = () => {
  if (!S.track) return chooseTrack();
  if (trackFinished()) {
    return `${header()}<div class="stack">${panel("Trilha concluída", `<p class="mid glow">Você chegou ao topo desta trilha.</p>
      <p>Escolha uma nova trilha no Perfil para continuar evoluindo.</p>`, "good")}</div>`;
  }
  // Teste do fim da fase fica no topo; o antecipado (e o aviso de espera) fica abaixo da missão de hoje
  const st = testStatus(), topo = st && !st.early && !st.nextTry;
  return `${header()}<div class="stack">${topo ? testCard() : ""}${todayCard()}${st && !topo ? testCard() : ""}${spotsCard()}${trailCard()}</div>`;
};

let tick = null;
views.treino.after = () => {
  clearInterval(tick);
  const el = $("#timer"); if (!el) return;
  const upd = () => {
    const w = S.days[today()]?.workout;
    if (!w?.in || !el.isConnected) return clearInterval(tick);
    const s = Math.floor((Date.now() - w.in.t) / 1000);
    const hh = Math.floor(s / 3600), mm = Math.floor(s / 60) % 60, ss = s % 60;
    el.textContent = (hh ? hh + ":" : "") + String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
  };
  upd(); tick = setInterval(upd, 1000);
};
