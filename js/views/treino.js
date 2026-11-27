// Missão: trilha, treino do dia, ponto por GPS, treino indoor em dia de chuva, Teste de Rank
import { views, actions, refresh } from "../core.js";
import { S, day, save, photos } from "../store.js";
import { today, addDays, daysBetween, esc, fmt, fmtTime, fmtDate, getPosition, getPreciseFix, distM, shrinkImage, uid, $, num } from "../util.js";
import { header, panel, toast, sysMessage, showEvents, modal, closeModal, confirmBox, aviso } from "../ui.js";
import { panel as panelBase } from "../ui.js";
import { completeWorkout, passTest, isRestDay, workoutKcal, grant, R, rankDe } from "../game.js";
import { TRACKS, trackById, currentTrack, currentPhase, progress, workoutFor, precisaAparelho, testUnlocked, testStatus, TEST_COOLDOWN, JANELA_2A, trackFinished, unitLabel, SESSIONS_PER_STAGE, testKey, setPR,
  ativas, multi, setFoco, trilhaSugerida, pesaPernas } from "../tracks.js";
import { statusList, avaliacaoLiberada, avaliacaoForm, provasHoje, avaliouHoje } from "./avaliacao.js";
import { posMissao } from "../recompensas.js";
import { COMANDANTES, arteSombra, derrotarChefe } from "../sombras.js";
import { telaMissaoConcluida, mostrarRecordes, mostrarClasseSePreciso } from "./recompensas-ui.js";
import { botaoCompartilhar } from "../cartao.js";
import { trilhaFx, serieFx } from "../fx.js";

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

// ---- Modo viagem ---------------------------------------------------------------------------
// Só ativa a 50 km ou mais de casa (GPS preciso, descontando a margem). Na viagem, o ponto vale em qualquer lugar a
// 50 km+ de casa e a saída tem que ser no mesmo lugar da entrada; o tempo mínimo é o de sempre. Termina sozinho no
// primeiro ponto batido perto de casa (a menos de 50 km). Chegou a 30 dias, o jogador informa quantos dias a mais
// vai ficar (o ponto de viagem só volta a valer depois disso). O dia de estrada é um dia normal: sem treino, é falta.
export const VIAGEM = { km: 50, dias: 30, maxExtra: 60 };
export const viagem = () => S.viagem || null;
const viagemLimite = v => v.ate || addDays(v.inicio, VIAGEM.dias);
const viagemVencida = () => { const v = viagem(); return !!v && today() >= viagemLimite(v); };
const emViagem = pos => !!viagem() && pos.garantida >= VIAGEM.km * 1000;
function encerrarViagem() {
  const v = viagem(); if (!v) return null;
  const dias = daysBetween(v.inicio, today());
  (S.viagens ||= []).push({ inicio: v.inicio, fim: today(), dias, ...(v.extensoes ? { extensoes: v.extensoes } : {}) });
  delete S.viagem;
  grant(0, 0, `Modo viagem encerrado: ${dias} dia${dias === 1 ? "" : "s"} fora`);
  return dias;
}
function viagemCard() {
  const v = viagem(); if (!v) return "";
  const dias = daysBetween(v.inicio, today()), vencida = viagemVencida(), t = today();
  return panel(`Modo viagem · dia ${dias + 1}`, `<p style="margin-top:0">Desde ${fmtDate(v.inicio)}. O ponto vale em qualquer lugar a <b>${VIAGEM.km} km ou mais de casa</b>, com a saída no mesmo lugar da entrada e o tempo mínimo de sempre.</p>
    ${vencida ? `<p class="warn">A viagem chegou a ${dias} dias. Quantos dias a mais você fica? Até responder, o ponto de viagem não vale.</p>
      <form data-act="estenderViagem" class="row" style="gap:8px"><input id="vg-dias" name="dias" inputmode="numeric" placeholder="dias" style="max-width:90px" aria-label="Dias a mais">
      <button class="btn primary grow">Confirmar</button></form>`
      : `<p class="small muted">${v.ate ? `Estendida até ${fmtDate(v.ate)}.` : `Até ${VIAGEM.dias} dias sem precisar avisar nada.`} O modo acaba sozinho quando você bater o ponto perto de casa.</p>`}
    <p class="small">Sem barras por perto? Na missão, toque em <b>Sem aparelhos hoje</b>: barra, paralela e banco viram exercícios no chão e com a mochila.</p>
    <p class="small muted" style="margin-bottom:0">O dia de estrada é um dia normal: sem treino, é falta. Se tiver 100 HP, usar a folga fica a seu critério.</p>
    <button class="btn ghost sm block" style="margin-top:8px" data-act="encerrarViagem">Já voltei: encerrar o modo viagem</button>`, "", `<span class="chip warn">✈️ Viagem</span>`);
}
actions.ativarViagem = async () => {
  if (viagem()) return;
  const pos = await locate(); if (!pos) return;
  if (pos.garantida < VIAGEM.km * 1000) return sysMessage("Modo viagem não ativado", `<p>${posLine(pos)}</p><p>O modo viagem só ativa a <b>${VIAGEM.km} km ou mais</b> de casa, descontando a margem do GPS.</p>
    <p class="small muted">Mais perto que isso, cadastre o local de treino (vale ${SPOT.carenciaDias} dias depois).</p>`);
  if (!await confirmBox("Ativar o modo viagem", `Você está a ${fmt(pos.dist / 1000)} km de casa. O ponto passa a valer em qualquer lugar a ${VIAGEM.km} km ou mais de casa, até você bater o ponto perto de casa de novo.`, "Ativar")) return;
  S.viagem = { inicio: today() };
  grant(0, 0, `Modo viagem ativado a ${fmt(pos.dist / 1000)} km de casa`);
  save(); refresh();
};
actions.estenderViagem = d => {
  const v = viagem(), n = Math.round(num(d.dias) ?? 0); if (!v) return;
  if (!(n >= 1 && n <= VIAGEM.maxExtra)) return toast(`Informe de 1 a ${VIAGEM.maxExtra} dias.`);
  v.ate = addDays(today(), n); (v.extensoes ||= []).push({ d: today(), dias: n });
  grant(0, 0, `Viagem estendida: mais ${n} dias (até ${fmtDate(v.ate)})`);
  save(); refresh(); toast(`Modo viagem até ${fmtDate(v.ate)}.`);
};
actions.encerrarViagem = async () => {
  if (!await confirmBox("Encerrar o modo viagem", "O ponto volta a valer só no seu local de treino de sempre.", "Encerrar")) return;
  const dias = encerrarViagem(); save(); refresh();
  if (dias != null) toast(`Modo viagem encerrado (${dias} dias).`);
};

function chooseTrack() {
  return `${header()}<div class="stack">
    ${panel("Escolha sua trilha", `<p>A trilha define seus treinos diários. O Sistema aumenta as cargas conforme você cumpre as missões.</p>
    <ul class="list">${TRACKS.map(t => `<li>
      <span style="font-size:1.6rem">${t.icone}</span>
      <span class="grow"><b>${t.nome}</b><br><span class="small muted">${t.resumo}</span></span>
      ${t.building ? `<span class="chip muted">Building…</span>` : `<button class="btn sm primary" data-act="pickTrack" data-id="${t.id}">Iniciar</button>`}
    </li>`).join("")}</ul>`)}</div>`;
}

actions.pickTrack = async ({ id }) => {
  S.track = { id, startDate: S.game.log.length || Object.keys(S.days).length ? today() : addDays(today(), 1) };
  S.trackSince ??= S.track.startDate;
  progress(id).inicio ??= S.track.startDate;
  S.ativas = [...new Set([...ativas(), id])];
  save();
  const ph = currentPhase(), tr = trackById(id);
  await trilhaFx({ id, nome: tr.nome, icone: tr.icone, fase: ph.nome, rank: ph.rank });
  sysMessage("Trilha iniciada", `<p class="mid glow">${trackById(id).nome}</p>
    <p>Fase <b>${ph.nome}</b>. Sua primeira meta tem prazo de <b>${ph.prazo}</b>.</p>
    <p class="small muted">6 treinos por semana, 1 dia de descanso. Faltou, pagou.</p>`, { onClose: refresh });
};

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
    ${p.nivelamento && p.week <= ph.stages ? `<p class="small ok" style="margin:4px 0 0">Nivelamento aberto: o teste do rank ${ph.rank} já vale (média de 2 tentativas), até o seu primeiro treino normal desta trilha.</p>`
      : p.week < Math.ceil(ph.stages / 2) + 1 ? `<p class="small muted" style="margin:4px 0 0">Teste antecipado a partir da etapa ${Math.ceil(ph.stages / 2) + 1}.</p>` : ""}
    <div class="bar" style="margin:6px 0 12px"><i style="width:${p.week > ph.stages ? 100 : pct}%"></i></div>
    <h3>Teste do rank ${ph.rank} · ~${ph.prazo.replace("~", "")} de jogo perfeito</h3>
    <p class="small" style="margin:4px 0">${ph.meta}</p>
    <h3 style="margin-top:10px">Seu status <span class="muted">(seu máximo / meta)</span></h3>
    ${statusList(ph)}
    <a class="btn sm block" style="margin:8px 0 12px" href="#/avaliacao">${S.pr && Object.keys(S.pr).length ? "Teste de Avaliação: atualizar meus máximos" : "Fazer o Teste de Avaliação (seus máximos)"}</a>
    <ul class="list small">${fases}</ul>
    <a class="btn sm ghost block" style="margin-top:8px" href="#/evolucao">Ver quadro de assiduidade</a>`);
}

const fmtV = (v, un) => unitLabel(fmt(v, un === "km" || v % 1 ? 1 : 0), un);
// Quanto a 2ª tentativa precisa, prova a prova, para a média bater a meta
const precisaNa2a = (ph, t1) => ph.tests.map(([n, meta, un], i) => ({ n, un, v1: t1.vals[i], min: Math.max(0, Math.ceil((2 * meta - (t1.vals[i] || 0)) * 10) / 10) }));
const listaPrecisa = ph => l => `<ul class="list small">${l.map(x => `<li><span class="grow">${esc(x.n)} <span class="muted">(1ª: ${fmtV(x.v1 || 0, x.un)})</span></span>
  <b class="num">${x.min ? "≥ " + fmtV(x.min, x.un) : "já garantido"}</b></li>`).join("")}</ul>`;

// Dano no chefe: média de (resultado / meta) em cada prova, até 100% por prova
const dano = (ph, vals) => ph.tests.reduce((n, [, meta], i) => n + Math.min(1, (vals[i] || 0) / meta), 0) / ph.tests.length;
function chefeHtml(ph, st) {
  const k = COMANDANTES[ph.rank], hp = st.tentativa === 2 ? Math.max(0, 1 - dano(ph, st.t1.vals)) : 1;
  return `<div class="cmd" style="margin-bottom:10px">${arteSombra({ grau: k.grau || "comandante", cmd: ph.rank }, { tam: 72 })}
    <div class="grow"><div class="small muted">Chefe da Dungeon do rank ${ph.rank}</div><b style="color:${k.cor}">${k.nome}</b>
    <div class="hp" style="margin-top:6px"><i style="width:${Math.round(hp * 100)}%"></i></div>
    <div class="small muted">${st.tentativa === 2 ? `A 1ª tentativa causou ${Math.round((1 - hp) * 100)}% de dano. Cada prova é uma parte da vida dele.` : "Cada prova é uma parte da vida dele. Bata todas as metas para derrotá-lo."}</div>
    ${ph.rank === "D" && !S.classe ? `<div class="small glow" style="margin-top:4px">Vencer este chefe libera a escolha de classe.</div>` : ""}</div></div>`;
}

function testCard() {
  const ph = currentPhase(), st = testStatus(), t = currentTrack();
  const panel = (titulo, corpo, cls) => panelBase(titulo, chefeHtml(ph, st) + corpo, cls);
  const titulo = st.nivel ? "Nivelamento" : st.early ? "Teste antecipado" : "Teste de Rank";
  const sobre = `<p class="small glow">Passou: rank ${ph.rank}${multi() ? ` na ${t.nome}` : ""} na hora, em qualquer nível. A fase seguinte começa (os treinos mudam) e você ganha +${R.testeXp} XP e +${R.testeOuro} Ouro.</p>`;
  const form = (precisa) => `<form data-act="submitTest" data-rascunho="teste">${ph.tests.map(([n, v, un], i) => `<div class="field">
      <label for="t${i}">${n} (meta: ${unitLabel(v, un)}${precisa ? ` · hoje: ${precisa[i].min ? "≥ " + fmtV(precisa[i].min, un) : "qualquer valor"}` : ""})</label>
      <input id="t${i}" name="t${i}" inputmode="decimal" required></div>`).join("")}
      <button class="btn primary block">${st.tentativa === 1 ? "Registrar 1ª tentativa" : st.tentativa === 2 ? "Registrar 2ª tentativa" : "Enviar resultado"}</button></form>`;
  if (st.tentativa === 2) {
    const precisa = precisaNa2a(ph, st.t1);
    if (st.nextTry) {
      return panel(titulo, `<p>1ª tentativa feita em ${fmtDate(st.t1.d)}. A 2ª abre em <b>${fmtDate(st.de)}</b> e vai até <b>${fmtDate(st.ate)}</b>: descanse entre as duas.</p>
        <p class="small muted">Passa se a média das duas bater a meta em cada prova. Na 2ª, você vai precisar de:</p>${listaPrecisa(ph)(precisa)}${sobre}`);
    }
    return panel(titulo, `<p><b>2ª tentativa</b> do teste do rank <b>${ph.rank}</b> (a 1ª foi em ${fmtDate(st.t1.d)}). Vale até ${fmtDate(st.ate)}.</p>
      <p class="small muted">Passa se a média das duas tentativas bater a meta em cada prova. Faça descansado, no início do treino.</p>
      ${sobre}${form(precisa)}`, "good");
  }
  if (st.nextTry) {
    return panel(titulo, `<p>Próxima tentativa do teste do rank <b>${ph.rank}</b> em <b>${fmtDate(st.nextTry)}</b>.</p>
      <p class="small muted">Uma tentativa a cada ${TEST_COOLDOWN} dias. Enquanto isso, siga a fase normalmente.</p>`);
  }
  if (st.early) {
    const intro = st.nivel
      ? `<p>Você acabou de iniciar a trilha <b>${t.nome}</b>. Se já tem condicionamento, prove o rank <b>${ph.rank}</b> agora e pule a fase <b>${ph.nome}</b>. Passando, dá para nivelar de novo na fase seguinte.</p>
         <p class="small muted">O nivelamento vale até o seu primeiro treino normal desta trilha.</p>`
      : `<p>Você já completou metade da fase <b>${ph.nome}</b>. Se já consegue as metas do rank <b>${ph.rank}</b>, prove agora e pule direto para a próxima fase.</p>`;
    return panel(titulo, `${intro}
      <p class="small">Vale pela <b>média de 2 tentativas em dias diferentes</b>: a 2ª entre ${JANELA_2A.de} e ${JANELA_2A.ate} dias depois da 1ª. Assim um dia inspirado não engana o Sistema.</p>
      ${st.expirou ? `<p class="small warn">A 1ª tentativa de ${fmtDate(st.expirou)} venceu sem a 2ª. Comece de novo.</p>` : ""}
      ${sobre}<p class="small muted">Se não passar, nada perde: continua a fase normalmente e pode tentar de novo em ${TEST_COOLDOWN} dias.</p>
      <details><summary class="btn block" style="list-style:none">Fazer a 1ª tentativa agora</summary><div style="margin-top:12px">${form()}</div></details>`);
  }
  return panel(titulo, `<p>Você concluiu todas as etapas da fase <b>${ph.nome}</b>. Prove que está pronto para o rank <b>${ph.rank}</b>:
    informe seu melhor resultado em cada prova (faça descansado, de preferência no início do treino). No fim da fase, uma tentativa basta.</p>
    ${sobre}${form()}`, "good");
}

actions.submitTest = data => {
  const ph = currentPhase(), st = testStatus(), p = progress();
  if (!st || st.nextTry) return toast("O teste não está disponível agora.");
  const vals = ph.tests.map((_, i) => num(data["t" + i]) ?? 0);
  ph.tests.forEach(([n], i) => setPR(testKey(n), vals[i], today(), "teste")); // cada tentativa, mesmo reprovada, atualiza seus máximos
  day().testeFeito = true; // vale para concluir o "Dia de Teste de Rank"
  if (S.rascunhos) delete S.rascunhos.teste;
  if (st.tentativa === 1) {
    p.antecipada = { d: today(), fase: p.phase, vals };
    save(); refresh();
    return aviso("1ª tentativa registrada", `<p>Agora descanse. A 2ª tentativa abre em <b>${fmtDate(addDays(today(), JANELA_2A.de))}</b> e vai até <b>${fmtDate(addDays(today(), JANELA_2A.ate))}</b>.</p>
      <p class="small muted">Passa se a média das duas bater a meta em cada prova. Na 2ª, você vai precisar de:</p>${listaPrecisa(ph)(precisaNa2a(ph, p.antecipada))}
      <p class="small muted">O chefe levou ${Math.round(dano(ph, vals) * 100)}% de dano.</p>`).then(mostrarRecordes);
  }
  const media = st.tentativa === 2;
  const finais = media ? vals.map((v, i) => (v + (st.t1.vals[i] || 0)) / 2) : vals;
  if (media) delete p.antecipada;
  const falhas = ph.tests.map(([n, meta, un], i) => ({ n, meta, un, v: finais[i] })).filter(x => x.v < x.meta);
  if (falhas.length) {
    p.lastTestTry = today(); save(); refresh();
    return aviso("Teste não superado", `<p>${COMANDANTES[ph.rank].nome} resistiu com ${Math.round((1 - dano(ph, finais)) * 100)}% da vida. ${media ? "Na média das duas tentativas, ainda" : "Ainda"} falta em:</p>
      <ul class="list small">${falhas.map(f => `<li><span class="grow">${esc(f.n)}</span><b class="num">${fmtV(f.v, f.un)} de ${unitLabel(f.meta, f.un)}</b></li>`).join("")}</ul>
      <p class="small muted">${st.early ? "Sem problema: continue a fase normalmente." : "Continue treinando na etapa final."} Próxima tentativa em ${fmtDate(addDays(today(), TEST_COOLDOWN))}.</p>`).then(mostrarRecordes);
  }
  const trilha = currentTrack().nome;
  const ev = passTest(st.early);
  const ch = derrotarChefe(ph.rank); save();
  const acabou = trackFinished(), prox = currentPhase(), k = COMANDANTES[ph.rank];
  const chefe = `<p>${ch.corpo.cmd ? `Chefe derrotado: <b style="color:${k.cor}">${k.nome}</b>. ${ch.corpo.grau === "marechal"
      ? "O corpo dele espera no Exército: só se levanta para quem tiver os 6 livros e o Manto no Arsenal."
      : "O corpo dele aguarda a extração no Exército."}` : "Chefe derrotado de novo: um corpo de Cavaleiro aguarda no Exército."}</p>${botaoCompartilhar("rank", { rank: ph.rank, trilha })}`;
  showEvents("Meta conquistada", [ev], chefe + (acabou
    ? `<p class="glow">Você concluiu a trilha inteira. O Sistema reconhece um Monarca.</p>`
    : `<p>Rank <b class="glow">${ph.rank}</b>${multi() ? ` na ${currentTrack().nome}` : ""}${media ? " (pela média das duas tentativas)" : ""}. Nova meta revelada: <b class="glow">${prox.nome}</b>, rumo ao rank ${prox.rank}. Os treinos já são os da fase nova.</p>
      ${progress().nivelamento ? `<p class="small muted">O nivelamento continua aberto: se quiser, já pode tentar o rank ${prox.rank} também.</p>` : ""}`))
    .then(mostrarRecordes).then(mostrarClasseSePreciso);
  refresh();
};

// "Sem aparelhos hoje": na viagem ou em dia de chuva forte, troca barra, paralela e banco por chão e mochila
const podeSemAparelhos = (cur = S.days[today()]?.workout) => !!viagem() || !!S.days[today()]?.rain?.heavy || !!cur?.indoor;
function botaoSemAparelhos(plan, cur = null) {
  if (!plan || plan.modo || !podeSemAparelhos(cur)) return "";
  if (plan.semAparelhos) {
    const n = plan.itens.filter(it => it.orig).length;
    return `<p class="small ok" style="margin-bottom:4px">🎒 Sem aparelhos: ${n} exercício${n === 1 ? "" : "s"} trocado${n === 1 ? "" : "s"} por chão e mochila. A missão vale normal; o Teste de Rank e a Avaliação continuam com os aparelhos.</p>
      <button class="btn ghost sm block" data-act="semAparelhos" data-on="0">Voltar aos aparelhos</button>`;
  }
  const n = plan.itens.filter(precisaAparelho).length;
  return n ? `<button class="btn block" style="margin-top:8px" data-act="semAparelhos" data-on="1">🎒 Sem aparelhos hoje (só chão e mochila)</button>
    <p class="small muted" style="margin:4px 0 0">Troca ${n} exercício${n === 1 ? "" : "s"} de barra, paralela ou banco. Cadeira e mesa ficam de fora: podem quebrar.</p>` : "";
}
actions.semAparelhos = ({ on }) => {
  const t = today(), w = S.days[t]?.workout;
  if (w?.done) return;
  if (+on) day(t).semAparelhos = true; else delete day(t).semAparelhos;
  if (w?.in && !w.plano?.modo) w.plano = workoutFor(t, !!w.indoor); // em andamento: as séries marcadas ficam
  save(); refresh();
  toast(+on ? "Sem aparelhos: exercícios trocados por chão e mochila." : "De volta aos aparelhos.");
};

function exerciseList(w, plan, active) {
  return `<ul class="list">${plan.itens.map((it, e) => `<li style="display:block">
    <div class="row between"><b>${esc(it.nome)}</b><span class="chip">${it.series} × ${unitLabel(it.alvo, it.un)}</span></div>
    ${it.orig ? `<div class="small" style="color:var(--glow)">🎒 No lugar de: ${esc(it.orig)}</div>` : ""}
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
  // som e efeito: série no alvo, abaixo do alvo ou desmarcada; e se fechou o exercício ou o treino inteiro
  const estado = w.sets[e][i] === true ? "on" : w.sets[e][i] === "low" ? "low" : "off";
  const feito = k => w.plano.itens[k] && Array.from({ length: w.plano.itens[k].series }, (_, j) => w.sets[k]?.[j]).every(Boolean);
  const extra = estado === "off" ? null : w.plano.itens.every((_, k) => feito(k)) ? "treino" : feito(+e) ? "exercicio" : null;
  serieFx(el, estado, extra);
};

// Dias especiais: a avaliação ou o Teste de Rank viram a missão do dia (com ponto). A fila de treinos
// não anda (o treino do dia fica para amanhã) e a carga não sobe; XP, Ouro e sequência valem normalmente.
// Na Zona de Penalidade, o Dia de Avaliação pode servir de redenção (o treino pendente continua na fila e vai
// para o dia seguinte); o Dia de Teste de Rank não aparece na penalidade.
export const MODOS = {
  avaliacao: { titulo: "Dia de Avaliação", icone: "📊", link: "#/avaliacao", botao: "Registrar meus máximos",
    desc: "Faça uma série máxima de cada prova da fase, com 3 a 5 min de descanso entre elas, e registre os números.",
    pronto: () => avaliacaoLiberada(), feito: () => avaliouHoje() },
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
      <p>${esc(w.plano.titulo)}${w.indoor ? " (indoor)" : ""}${w.plano.semAparelhos ? " · sem aparelhos" : ""}</p>
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
        <p class="small ${feito ? "ok" : "warn"}">${plan.modo === "avaliacao"
          ? (feito ? `✔ ${provasHoje(currentPhase())} de ${currentPhase().tests.length} provas salvas hoje. Pode continuar e depois bater o ponto de saída.` : "Salve pelo menos uma prova antes de bater o ponto de saída.")
          : (feito ? "✔ Resultados registrados." : "Registre os resultados antes de bater o ponto de saída.")}</p>
        ${plan.modo === "avaliacao" ? avaliacaoForm(currentPhase()) : ""}
        <button class="btn primary block" style="margin-top:8px" data-act="punchOut">Bater ponto: saída</button>
        <button class="btn ghost sm block" style="margin-top:8px" data-act="cancelWorkout">Cancelar</button>`, "", `<span class="chip warn">Em andamento</span>`);
    }
    return panel(plan.titulo, `
      <div class="timer num glow" id="timer">00:00</div>
      <p class="center small muted">${cur.indoor ? "Dungeon Indoor" : `Entrada às ${fmtTime(cur.in.t)} · ${cur.in.spot ? esc(cur.in.spot) : fmt(cur.in.dist / 1000, 1) + " km de casa"}`} · mínimo ${need} min</p>
      <p class="small muted center">Toque 1× na série = no alvo · 2× = abaixo do alvo (a carga não sobe) · 3× = desmarca</p>
      ${exerciseList(cur, plan, true)}
      ${botaoSemAparelhos(plan, cur)}
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
    ${botaoSemAparelhos(plan)}
    <p class="small muted">${viagem() ? `Em viagem: bata o ponto de entrada em qualquer lugar a ${VIAGEM.km} km ou mais de casa` : `Para valer: bata o ponto de entrada ${activeSpots().length ? "no seu local de treino" : `a mais de ${fmt(minDist() / 1000, 1)} km de casa`}`} (GPS preciso), treine pelo menos ${minMin()} min e bata o ponto de saída no ${viagem() ? "mesmo lugar" : "local"}.</p>
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
function refuse(pos, saida, w = null) {
  if (saida ? w?.in?.viagem : emViagem(pos)) { // ponto de viagem
    if (saida) {
      const d = Math.round(distM(pos, w.in)), lim = SPOT.raio + Math.min(SPOT.folgaMax, pos.acc + (w.in.acc || 0));
      return d > lim ? `<p>Você está a <b>${fmt(d)} m</b> de onde bateu a entrada. Em viagem, a saída tem que ser no mesmo lugar (até ${lim} m).</p>` : null;
    }
    if (viagemVencida()) return `<p>A viagem chegou a ${daysBetween(viagem().inicio, today())} dias. Informe em Missão quantos dias a mais você fica para o ponto de viagem voltar a valer.</p>`;
    return null;
  }
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
  if (emViagem(pos)) pos.viagem = true;
  // de volta perto de casa: o modo viagem acaba no primeiro ponto
  const voltou = viagem() && pos.dist < VIAGEM.km * 1000 ? encerrarViagem() : null;
  const m = day().modo && MODOS[day().modo] ? day().modo : null;
  const plano = m ? { titulo: MODOS[m].titulo, modo: m, itens: [], idx: null } : workoutFor(today());
  day().workout = { trackId: S.track.id, plano, in: pos, sets: {} };
  save(); refresh();
  sysMessage("Ponto de entrada registrado", `<p>${posLine(pos)}</p><p class="mid glow">${fmtTime(pos.t)}</p>
    ${voltou != null ? `<p class="ok small">Bem-vindo de volta: o modo viagem acabou (${voltou} dia${voltou === 1 ? "" : "s"} fora).</p>` : ""}
    ${pos.viagem ? `<p class="small">Ponto de viagem: bata a saída neste mesmo lugar.</p>` : activeSpots().length ? "" : `<p class="small warn">Cadastre seu local de treino abaixo: depois de ativo, o ponto só vale dentro dele.</p>`}
    <p class="small muted">Treine pelo menos ${minMin()} min e bata o ponto de saída ainda no local.</p>`, { botao: "Bom treino" });
};

actions.punchOut = async () => {
  const w = day().workout, falta = Math.ceil(minMin() - elapsedMin(w));
  if (falta > 0) return sysMessage("Ainda não", `<p>Faltam <b>${falta} min</b> para o tempo mínimo de ${minMin()} min de treino.</p>`);
  if (w.plano.modo && !MODOS[w.plano.modo].feito()) return sysMessage("Faltam os resultados", `<p>Registre os resultados ${w.plano.modo === "avaliacao" ? "da avaliação" : "do Teste de Rank"} antes de bater o ponto de saída.</p>`);
  const pos = await locate(); if (!pos) return;
  const motivo = refuse(pos, true, w);
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
    <button class="btn block" data-act="addSpot" ${list.length >= SPOT.max ? "disabled" : ""}>${list.length >= SPOT.max ? "Limite de 3 locais" : "📍 Cadastrar: estou no local de treino"}</button>
    ${viagem() ? "" : `<button class="btn ghost block" style="margin-top:8px" data-act="ativarViagem">✈️ Estou viajando (a ${VIAGEM.km} km ou mais de casa)</button>`}`,
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
  const pos = posMissao(w, today()); // baú, exército, marcos e títulos
  refresh();
  return telaMissaoConcluida(events, pos, w);
}

actions.cancelWorkout = async () => {
  if (!await confirmBox("Cancelar treino", "O ponto de entrada e as séries marcadas serão apagados.", "Cancelar treino")) return;
  delete day().workout; delete day().modo; save(); refresh();
};

// ---- chuva forte: Dungeon Indoor ---------------------------------------------------
const HEAVY_CODES = [63, 65, 66, 67, 81, 82, 95, 96, 99]; // chuva moderada/forte, pancadas fortes, trovoada
// Chuva forte: agora (código do tempo ou 2 mm/h), na última hora ou na próxima (dados de 15 em 15 min, quando vêm),
// na hora atual da previsão, ou 8 h ou mais de chuva previstas no dia.
export function isHeavyRain(j) {
  const mm = j.current?.precipitation ?? 0, code = j.current?.weather_code;
  const horas = (j.hourly?.precipitation || []).slice(5, 23).filter(v => v >= 1).length;
  const q = j.minutely_15 || {}, qp = q.precipitation || [], qc = q.weather_code || [];
  let maxHora = 0; // maior chuva somada em 4 quartos de hora seguidos (mm/h)
  for (let i = 0; i + 4 <= qp.length; i++) maxHora = Math.max(maxHora, qp.slice(i, i + 4).reduce((n, v) => n + (v || 0), 0));
  const agora = (j.current?.time || "").slice(0, 13), hi = (j.hourly?.time || []).findIndex(t => t.slice(0, 13) === agora);
  const horaAtual = hi >= 0 ? Math.max(j.hourly.precipitation?.[hi] ?? 0, j.hourly.precipitation?.[hi + 1] ?? 0) : 0;
  const codHora = hi >= 0 ? [j.hourly.weather_code?.[hi], j.hourly.weather_code?.[hi + 1]] : [];
  const heavy = HEAVY_CODES.includes(code) || qc.some(c => HEAVY_CODES.includes(c)) || codHora.some(c => HEAVY_CODES.includes(c))
    || mm >= 2 || maxHora >= 2 || horaAtual >= 2 || horas >= 8;
  return { heavy, mm: Math.max(mm, maxHora, horaAtual), horas };
}
// Quando o Sistema não vê a chuva (a previsão é um modelo, em grade de quilômetros), dá para provar com uma foto,
// até 2 vezes por mês. A foto fica guardada como prova, como a selfie do treino indoor.
export const CHUVA_FOTO_MES = 2;
const chuvaFotosMes = () => (S.chuvaFotos || []).filter(d => d.slice(0, 7) === today().slice(0, 7)).length;

actions.checkRain = async () => {
  const d = day();
  if (!d.rain?.heavy) {
    toast("Consultando o clima…", 15000);
    try {
      const pos = viagem() ? await getPosition() : (S.profile.home || await getPosition()); // em viagem, o clima de onde você está
      // coordenadas arredondadas (~1 km): suficiente para o clima, sem expor o endereço
      const base = `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat.toFixed(2)}&longitude=${pos.lon.toFixed(2)}&forecast_days=1&timezone=auto`;
      let res = await fetch(`${base}&current=precipitation,weather_code&hourly=precipitation,weather_code&minutely_15=precipitation,weather_code&past_minutely_15=4&forecast_minutely_15=4`);
      if (!res.ok) res = await fetch(`${base}&current=precipitation,weather_code&hourly=precipitation`); // consulta simples, se a completa falhar
      if (!res.ok) throw new Error();
      d.rain = isHeavyRain(await res.json());
      save();
    } catch { return toast("Não consegui consultar o clima. Verifique a internet e tente de novo.", 5000); }
    $("#toast")?.remove();
  }
  if (!d.rain.heavy) {
    const restam = CHUVA_FOTO_MES - chuvaFotosMes();
    return sysMessage("Sem chuva forte", `<p>Agora: <b>${fmt(d.rain.mm, 1)} mm/h</b>. O Sistema não detectou chuva forte na sua região.</p>
      <p class="small muted">A previsão é um modelo e às vezes não vê a chuva que está caindo. Garoa não vale: a missão continua no local de treino.</p>
      ${restam > 0 ? `<label class="btn block" style="margin-top:6px">🌧 Está chovendo forte aqui: provar com foto
        <input type="file" accept="image/*" capture="environment" class="hidden" data-chg="chuvaFoto"></label>
        <p class="small muted">Tire uma foto da chuva (rua, janela, céu). Ela fica guardada como prova. Restam ${restam} este mês.</p>`
        : `<p class="small warn">As ${CHUVA_FOTO_MES} provas por foto deste mês já foram usadas.</p>`}`,
      { onClose: () => { delete d.rain; save(); } });
  }
  const plan = workoutFor(today(), true);
  modal(`<div class="ptitle"><h2>Dungeon Indoor liberada</h2></div>
    <p>${d.rain.foto ? "Chuva forte confirmada pela sua foto." : `Chuva forte confirmada (${fmt(d.rain.mm, 1)} mm/h, ${d.rain.horas} h de chuva previstas hoje).`} Você pode cumprir a missão ${viagem() ? "onde está hospedado" : "em casa"}.</p>
    <ul><li>Treino: <b>${esc(plan.titulo)}</b></li><li>Mínimo de ${INDOOR_MIN} min com o cronômetro do app</li>
    <li>Todas as séries marcadas</li><li>Selfie de prova no final</li></ul>
    ${plan.itens.some(precisaAparelho) && !plan.semAparelhos ? `<p class="small muted">Sem barras ${viagem() ? "aí" : "em casa"}? Entre sem aparelhos: barra, paralela e banco viram exercícios no chão e com a mochila.</p>` : ""}
    <div class="row"><button class="btn ghost grow" data-close>Agora não</button>
    <button class="btn primary grow" data-act="startIndoor">Entrar na dungeon</button></div>
    ${plan.itens.some(precisaAparelho) && !plan.semAparelhos ? `<button class="btn block" style="margin-top:8px" data-act="startIndoor" data-sem="1">🎒 Entrar sem aparelhos</button>` : ""}`);
};

actions.chuvaFoto = async (_, el) => {
  const file = el.files[0]; el.value = "";
  if (!file || chuvaFotosMes() >= CHUVA_FOTO_MES) return;
  try { await photos.add({ date: today(), angulo: "chuva", tipo: "prova", blob: await shrinkImage(file, 1000) }); }
  catch { return toast("Não consegui ler essa foto."); }
  (S.chuvaFotos ||= []).push(today());
  day().rain = { heavy: true, foto: true, mm: 0, horas: 0 };
  grant(0, 0, "Chuva forte confirmada por foto (prova guardada)");
  save(); closeModal();
  actions.checkRain();
};

actions.startIndoor = ({ sem } = {}) => {
  if (sem) day().semAparelhos = true;
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

// Com 2+ trilhas: qual trilha vale o treino de hoje (antes de começar)
function focoCard() {
  if (!multi()) return "";
  const t = today(), w = S.days[t]?.workout;
  if (w?.in || w?.done || (isRestDay(t) && !S.game.needsWorkout)) return "";
  const ids = ativas().filter(id => (S.progress[id]?.phase || 0) < trackById(id).phases.length), sug = trilhaSugerida(t);
  if (ids.length < 2) return "";
  const ontem = S.days[addDays(t, -1)]?.workout, plan = !trackFinished() && workoutFor(t);
  const aviso = plan && ontem?.done && pesaPernas(ontem.trackId, ontem.plano?.titulo) && pesaPernas(S.track.id, plan.titulo)
    ? `<p class="small warn" style="margin-bottom:0">Ontem foi ${esc(ontem.plano.titulo)}: ${esc(plan.titulo)} hoje pesa nas mesmas pernas. Se puder, troque de trilha.</p>` : "";
  return panel("Trilha de hoje", `<div class="row wrap" style="gap:6px">${ids.map(id => {
      const tr = trackById(id), on = id === S.track.id;
      return `<button class="btn sm ${on ? "primary" : "ghost"} grow" data-act="focoTrilha" data-id="${id}" aria-pressed="${on}">${tr.icone} ${tr.nome} · ${rankDe(id)}${id === sug ? " · sugerida" : ""}</button>`;
    }).join("")}</div>
    <p class="small muted" style="margin-bottom:0">Qualquer trilha vale a missão de hoje. A sugerida é a que está há mais tempo sem treino.</p>${aviso}`);
}

actions.focoTrilha = ({ id }) => {
  const w = S.days[today()]?.workout;
  if (w?.in || w?.done) return toast("O treino de hoje já começou.");
  S.focoDia = { d: today(), id };
  setFoco(id);
  if (S.days[today()]?.modo) delete S.days[today()].modo; // dia especial era da outra trilha
  save(); refresh();
};

function trilhasCard() {
  if (!multi()) return "";
  return panel("Suas trilhas", `<ul class="list">${ativas().map(id => {
      const tr = trackById(id), p = S.progress[id] || {}, fim = (p.phase || 0) >= tr.phases.length, ph = tr.phases[Math.min(p.phase || 0, tr.phases.length - 1)];
      return `<li><span style="font-size:1.4rem">${tr.icone}</span><span class="grow"><b>${tr.nome}</b> · rank <b class="glow">${rankDe(id)}</b><br>
        <span class="small muted">${fim ? "Trilha concluída" : `Fase ${ph.nome} · etapa ${Math.min(p.week || 1, ph.stages)}/${ph.stages}${p.nivelamento ? " · nivelamento aberto" : ""}`}</span></span>
        ${id === S.track.id ? `<span class="chip">Hoje</span>` : ""}</li>`;
    }).join("")}</ul>
    <p class="small muted">XP, nível, Ouro, sequência e penalidade são do jogador; fase, etapa, fila, máximos e rank são de cada trilha.</p>
    <a class="btn sm ghost block" href="#/perfil">Gerenciar trilhas</a>`);
}

views.treino = () => {
  if (!S.track) return chooseTrack();
  if (trackFinished()) {
    return `${header()}<div class="stack">${focoCard()}${panel("Trilha concluída", `<p class="mid glow">Você chegou ao topo da trilha ${currentTrack().nome}.</p>
      <p>${multi() ? "Escolha outra trilha acima para o treino de hoje." : "Escolha uma nova trilha no Perfil para continuar evoluindo."}</p>`, "good")}${trilhasCard()}</div>`;
  }
  // Teste do fim da fase fica no topo; o antecipado (e o aviso de espera) fica abaixo da missão de hoje
  const st = testStatus(), topo = st && !st.early && !st.nextTry;
  return `${header()}<div class="stack">${focoCard()}${viagemCard()}${topo ? testCard() : ""}${todayCard()}${st && !topo ? testCard() : ""}${spotsCard()}${trailCard()}${trilhasCard()}</div>`;
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
