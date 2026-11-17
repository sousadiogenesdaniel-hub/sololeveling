// Missão: trilha, treino do dia, ponto por GPS, treino indoor em dia de chuva, Teste de Rank
import { views, actions, refresh } from "../core.js";
import { S, day, save, photos } from "../store.js";
import { today, addDays, esc, fmt, fmtTime, getPosition, getPreciseFix, distM, shrinkImage, $, num } from "../util.js";
import { header, panel, toast, sysMessage, showEvents, modal, closeModal, confirmBox } from "../ui.js";
import { completeWorkout, passTest, isRestDay, workoutKcal, R, RANK_TESTS, RANK_ORDER, testsPassed } from "../game.js";
import { TRACKS, trackById, currentTrack, currentPhase, progress, workoutFor, testUnlocked, trackFinished, unitLabel, SESSIONS_PER_STAGE } from "../tracks.js";

const INDOOR_MIN = 25;        // minutos mínimos do treino indoor
const PUNCH_EXPIRES_H = 5;    // ponto de entrada vence depois disso

// Regras do ponto (pisos fixos: o Perfil pode aumentar, nunca diminuir)
export const MIN_DIST = 1000, MIN_MIN = 30;
const minDist = () => Math.max(MIN_DIST, S.profile.minDist ?? MIN_DIST);
const minMin = () => Math.max(MIN_MIN, S.profile.minMin ?? MIN_MIN);
const elapsedMin = w => (Date.now() - w.in.t) / 60000;

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
    <div class="bar" style="margin:6px 0 12px"><i style="width:${p.week > ph.stages ? 100 : pct}%"></i></div>
    <h3>Meta de ${ph.prazo}${unlocks() ? ` · libera o rank ${unlocks()}` : ""}</h3>
    <p class="small" style="margin:4px 0">${ph.meta}</p>
    <ul class="small" style="margin:4px 0 10px;padding-left:18px">${ph.tests.map(([n, v, un]) => `<li>${n}: <b>${unitLabel(v, un)}</b></li>`).join("")}</ul>
    <ul class="list small">${fases}</ul>`);
}

function testCard() {
  const ph = currentPhase();
  return panel("Teste de Rank", `<p>Você concluiu todas as etapas da fase <b>${ph.nome}</b>. Prove que bateu a meta de ${ph.prazo}:
    informe seu melhor resultado em cada prova (faça descansado, de preferência no início do treino).</p>
    ${unlocks() ? `<p class="small glow">Passar libera o rank ${unlocks()} (quando você também tiver o nível).</p>` : ""}
    <form data-act="submitTest">${ph.tests.map(([n, v, un], i) => `<div class="field">
      <label for="t${i}">${n} (meta: ${unitLabel(v, un)})</label>
      <input id="t${i}" name="t${i}" inputmode="decimal" required></div>`).join("")}
      <button class="btn primary block">Enviar resultado</button></form>`, "good");
}

actions.submitTest = data => {
  const ph = currentPhase();
  const falhas = ph.tests.filter(([, v], i) => (num(data["t" + i]) ?? 0) < v);
  if (falhas.length) {
    return sysMessage("Teste não superado", `<p>Ainda falta em: <b>${falhas.map(f => f[0]).join(", ")}</b>.</p>
      <p class="small muted">Continue treinando na etapa final e tente de novo quando estiver pronto.</p>`);
  }
  const ev = passTest();
  const acabou = trackFinished();
  showEvents("Meta conquistada", [ev], acabou
    ? `<p class="glow">Você concluiu a trilha inteira. O Sistema reconhece um Monarca.</p>`
    : `<p>Uma nova meta foi revelada: <b class="glow">${currentPhase().nome}</b> (${currentPhase().prazo}).</p>`);
  refresh();
};

function exerciseList(w, plan, active) {
  return `<ul class="list">${plan.itens.map((it, e) => `<li style="display:block">
    <div class="row between"><b>${esc(it.nome)}</b><span class="chip">${it.series} × ${unitLabel(it.alvo, it.un)}</span></div>
    <div class="small muted">${esc(it.dica)}</div>
    <div class="sets">${Array.from({ length: it.series }, (_, i) => `<button class="set ${w?.sets?.[e]?.[i] ? "on" : ""}"
      ${active ? "" : "disabled"} data-act="toggleSet" data-e="${e}" data-i="${i}" aria-pressed="${!!w?.sets?.[e]?.[i]}" aria-label="Série ${i + 1} de ${esc(it.nome)}">${i + 1}</button>`).join("")}</div>
  </li>`).join("")}</ul>`;
}

actions.toggleSet = ({ e, i }, el) => {
  const w = day().workout; if (!w || w.done) return;
  w.sets ??= {}; w.sets[e] ??= [];
  w.sets[e][i] = !w.sets[e][i];
  el.classList.toggle("on", w.sets[e][i]); el.setAttribute("aria-pressed", w.sets[e][i]);
  save();
};

function todayCard() {
  const t = today(), w = S.days[t]?.workout;
  if (w?.done) {
    return panel("Missão de hoje", `<p class="mid ok">✔ Missão concluída</p>
      <p>${esc(w.plano.titulo)}${w.indoor ? " (indoor)" : ""}</p>
      <div class="grid3">
        <div class="tile"><div class="lbl">Duração</div><div class="val num">${w.durMin} min</div></div>
        <div class="tile"><div class="lbl">Gasto</div><div class="val num">~${w.kcal} kcal</div></div>
        <div class="tile"><div class="lbl">Séries</div><div class="val">${w.full ? "Todas" : "Parcial"}</div></div></div>
      <p class="small muted">${w.indoor ? "Treino indoor validado pelo clima." : `Ponto: entrada ${fmtTime(w.in.t)} (${fmt(w.in.dist / 1000, 1)} km de casa) · saída ${fmtTime(w.out.t)} (${fmt(w.out.dist / 1000, 1)} km)`}
      ${w.full ? "" : "<br>Como nem todas as séries foram marcadas, este treino não conta para subir a carga."}</p>`, "good");
  }
  if (isRestDay(t) && !S.game.needsWorkout) {
    return panel("Missão de hoje", `<p class="mid">Dia de descanso</p><p class="muted">Sem missão hoje. Durma bem e coma direito.</p>`);
  }
  if (w?.in && elapsedMin(w) > PUNCH_EXPIRES_H * 60) { delete day(t).workout; save(); }
  const cur = S.days[t]?.workout;
  if (cur?.in) {
    const plan = cur.plano, need = cur.indoor ? INDOOR_MIN : minMin();
    return panel(plan.titulo, `
      <div class="timer num glow" id="timer">00:00</div>
      <p class="center small muted">${cur.indoor ? "Dungeon Indoor" : `Entrada às ${fmtTime(cur.in.t)} · ${fmt(cur.in.dist / 1000, 1)} km de casa`} · mínimo ${need} min</p>
      ${exerciseList(cur, plan, true)}
      ${cur.indoor
        ? `<label class="btn primary block" style="margin-top:12px">Concluir: tirar selfie de prova
            <input type="file" accept="image/*" capture="user" class="hidden" data-chg="finishIndoor"></label>`
        : `<button class="btn primary block" style="margin-top:12px" data-act="punchOut">Bater ponto: saída</button>`}
      <button class="btn ghost sm block" style="margin-top:8px" data-act="cancelWorkout">Cancelar este treino</button>`, "", `<span class="chip warn">Em andamento</span>`);
  }
  const plan = workoutFor(t);
  const redencao = isRestDay(t) ? `<p class="small warn">Treino de redenção: hoje seria descanso, mas você está na Zona de Penalidade.</p>` : "";
  return panel(plan.titulo, `${redencao}
    ${exerciseList(null, plan, false)}
    <p class="small muted">Para valer: bata o ponto de entrada a mais de ${fmt(minDist() / 1000, 1)} km de casa (GPS preciso), treine pelo menos ${minMin()} min e bata o ponto de saída no local.</p>
    <button class="btn primary block" data-act="punchIn">Bater ponto: entrada</button>
    <button class="btn ghost block" style="margin-top:8px" data-act="checkRain">🌧 Chuva forte? Verificar clima</button>`,
    "", `<span class="chip">Etapa ${plan.stage}/${plan.stages}</span>`);
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
    return { ...pos, t: Date.now(), dist, garantida };
  } catch (e) { $("#toast")?.remove(); sysMessage("Localização não verificada", `<p>${esc(e.message)}</p>`); return null; }
}

const posLine = pos => `Você está a <b>${fmt(pos.dist)} m</b> de casa (precisão do GPS ±${pos.acc} m).`;

actions.punchIn = async () => {
  const pos = await locate(); if (!pos) return;
  if (pos.garantida < minDist()) {
    return sysMessage("Ponto recusado", `<p>${posLine(pos)}</p><p>O ponto só vale a mais de <b>${fmt(minDist() / 1000, 1)} km</b> de casa${pos.dist >= minDist() ? ", descontando a margem de erro do GPS" : ""}.</p>
      <p class="small muted">Vá até o local de treino${pos.dist >= minDist() ? " ou espere o sinal melhorar" : ""} e tente de novo.</p>`);
  }
  day().workout = { trackId: S.track.id, plano: workoutFor(today()), in: pos, sets: {} };
  save(); refresh();
  sysMessage("Ponto de entrada registrado", `<p>${posLine(pos)}</p><p class="mid glow">${fmtTime(pos.t)}</p>
    <p class="small muted">Treine pelo menos ${minMin()} min e bata o ponto de saída ainda no local.</p>`, { botao: "Bom treino" });
};

actions.punchOut = async () => {
  const w = day().workout, falta = Math.ceil(minMin() - elapsedMin(w));
  if (falta > 0) return sysMessage("Ainda não", `<p>Faltam <b>${falta} min</b> para o tempo mínimo de ${minMin()} min de treino.</p>`);
  const pos = await locate(); if (!pos) return;
  if (pos.garantida < minDist()) {
    return sysMessage("Ponto recusado", `<p>${posLine(pos)}</p><p>Bata o ponto de saída ainda no local de treino, a mais de ${fmt(minDist() / 1000, 1)} km de casa.</p>`);
  }
  w.out = pos;
  finish(w);
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
  delete day().workout; save(); refresh();
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
  return `${header()}<div class="stack">${testUnlocked() ? testCard() : ""}${todayCard()}${trailCard()}</div>`;
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
