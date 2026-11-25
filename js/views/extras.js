// Atividades extras: tudo o que você faz além da missão diária (caminhada, bike, futebol...).
// Entra no gasto calórico do dia. Pode ser lançada à mão ou rastreada por GPS (no app Android 1.5+, com a
// tela bloqueada: quem mede é o Android; no navegador, só com o app aberto).
import { keepScreenOn, nativo, gpsNativo, nativeTrack } from "../native.js";
import { views, actions, refresh } from "../core.js";
import { S, day, save } from "../store.js";
import { today, iso, esc, fmt, num, uid, fmtDate, fmtShort, addDays, distM, $ } from "../util.js";
import { header, panel, modal, closeModal, toast, confirmBox, showEvents } from "../ui.js";
import { checarMarcos, checarConquistas } from "../conquistas.js";
import { mostrarTitulos } from "./recompensas-ui.js";
import { tmb, weightOn, grant, extrasKcal, BONUS, campoXp, CAMPO, kmCampo, tentouCampo, gpsBonusStatus, checkGpsBonus, bonusWeek, weekStart, weekEnd } from "../game.js";
import { finalizarCampo } from "../portoes.js";
import { bauFx, portaoFx, falhaFx } from "../fx.js";
import { RAR } from "../premios.js";
import { mudarHp } from "../premios.js";

// Recompensa das atividades extras do dia (somadas): a partir de 250 kcal, +10 XP e +1 HP; acima de 700 kcal, mais
// +20 XP e +2 HP. O HP só vale para quem tem o Manto do Necromante. Recalcula ao salvar, editar ou excluir: se o total
// cair abaixo da faixa, o que foi dado volta. O percurso da Dungeon de Campo não conta aqui (é da dungeon).
export const ATIV = [{ kcal: 250, xp: 10, hp: 1 }, { kcal: 700, xp: 20, hp: 2, acima: true }];
const faixa = kcal => ATIV.filter(f => f.acima ? kcal > f.kcal : kcal >= f.kcal).length;
export function premiarAtividades(date) {
  const dd = day(date), kcal = extrasKcal(date, { campo: false }), nova = faixa(kcal);
  const antes = dd.ativFaixa ?? (dd.extraXp ? 1 : 0); // antes da regra das 250 kcal, a 1ª atividade do dia dava +10 XP
  dd.ativFaixa = nova;
  const ev = [];
  for (let i = antes; i < nova; i++) { const f = ATIV[i];
    ev.push({ ...grant(f.xp, 0, `Atividades do dia: ${i ? "mais de" : "pelo menos"} ${f.kcal} kcal`, date), hp: mudarHp(f.hp) }); }
  for (let i = antes; i > nova; i--) { const f = ATIV[i - 1];
    ev.push({ ...grant(-f.xp, 0, `Atividades do dia abaixo de ${f.kcal} kcal`, date), hp: mudarHp(-f.hp) }); }
  return ev;
}

const DIST = ["dist", "Distância (km)"], TEMPO = ["tempo", "Tempo (min)"], ELEV = ["elev", "Subida acumulada (m)"];
// met: [leve, moderada, intensa], usado quando não há distância
export const TYPES = [
  { id: "caminhada", nome: "Caminhada", icone: "🚶", gps: true, fields: [DIST, TEMPO, ELEV], met: [3, 3.8, 5] },
  { id: "corrida", nome: "Corrida", icone: "🏃", gps: true, fields: [DIST, TEMPO, ELEV], met: [7, 9, 11.5] },
  { id: "trilha", nome: "Trilha / hiking", icone: "🥾", gps: true, fields: [DIST, TEMPO, ELEV], met: [5, 6, 7.8] },
  { id: "bike", nome: "Bicicleta", icone: "🚴", gps: true, fields: [DIST, TEMPO, ELEV], met: [4, 6.8, 10] },
  { id: "natacao", nome: "Natação", icone: "🏊", fields: [TEMPO], met: [6, 8, 10] },
  { id: "futebol", nome: "Futebol / esporte coletivo", icone: "⚽", fields: [TEMPO], met: [6, 7, 10] },
  { id: "musculacao", nome: "Musculação / calistenia extra", icone: "🏋️", fields: [TEMPO], met: [3.5, 5, 6] },
  { id: "danca", nome: "Dança / luta", icone: "🥊", fields: [TEMPO], met: [4.5, 6, 9] },
  { id: "outro", nome: "Outra atividade", icone: "✨", fields: [TEMPO], met: [3, 5, 8] },
];
const INT = ["leve", "moderada", "intensa"];
const typeOf = id => TYPES.find(t => t.id === id);

// MET da bicicleta pela velocidade média (Compendium of Physical Activities)
const bikeMet = kmh => kmh < 16 ? 4 : kmh < 19 ? 6.8 : kmh < 22 ? 8 : kmh < 25.5 ? 10 : kmh < 30 ? 12 : 15.8;

// Calcula o gasto LÍQUIDO (acima do repouso, que já está no gasto base do dia).
export function estimate(tipo, d, intensidade, date) {
  const t = typeOf(tipo), min = d.tempo, h = min / 60, peso = weightOn(date);
  const perMetHour = tmb(date) / 24; // 1 MET ajustado ao seu metabolismo
  let met, detalhe;
  if (["caminhada", "corrida", "trilha"].includes(tipo) && d.dist) {
    // equações do ACSM: consideram velocidade e inclinação
    const v = d.dist * 1000 / min, grade = Math.min(0.3, (d.elev || 0) / (d.dist * 1000));
    const correndo = tipo === "corrida" || v > 134; // acima de ~8 km/h é corrida
    const vo2 = correndo ? 0.2 * v + 0.9 * v * grade + 3.5 : 0.1 * v + 1.8 * v * grade + 3.5;
    met = vo2 / 3.5 * (tipo === "trilha" ? 1.15 : 1); // terreno irregular
    detalhe = `${fmt(v * 0.06, 1)} km/h${d.elev ? ` · ${fmt(grade * 100, 1)}% de subida média` : ""}`;
  } else if (tipo === "bike" && d.dist) {
    const kmh = d.dist / h;
    met = bikeMet(kmh);
    detalhe = `${fmt(kmh, 1)} km/h`;
  } else {
    met = t.met[INT.indexOf(intensidade)] ?? t.met[1];
    detalhe = `intensidade ${intensidade}`;
  }
  let kcal = (met - 1) * perMetHour * h;
  if (tipo === "bike" && d.elev) kcal += peso * 9.81 * d.elev / 4184 / 0.25 * 0.5; // parte da energia da subida
  return { kcal: Math.max(0, Math.round(kcal)), met: Math.round(met * 10) / 10, detalhe };
}

export const extrasOf = date => S.days[date]?.extras || [];

// ---- diário das atividades (como o da Comida): total por dia, semana e mês -----------------------
function resumoDia(d) {
  const ex = extrasOf(d), dd = S.days[d] || {};
  const faixa = dd.ativFaixa ?? (dd.extraXp ? 1 : 0);
  return { ex, kcal: extrasKcal(d), min: ex.reduce((n, e) => n + (e.dados?.tempo || 0), 0), km: ex.reduce((n, e) => n + (e.dados?.dist || 0), 0),
    passos: ex.reduce((n, e) => n + (e.gps?.passos || 0), 0), xp: ATIV.slice(0, faixa).reduce((n, f) => n + f.xp, 0) };
}
function somaPeriodo(de, ate) {
  const r = { kcal: 0, min: 0, km: 0, passos: 0, dias: 0, xp: 0 };
  for (let d = de; d <= ate; d = addDays(d, 1)) { const x = resumoDia(d); if (!x.ex.length) continue; r.dias++; r.kcal += x.kcal; r.min += x.min; r.km += x.km; r.passos += x.passos; r.xp += x.xp; }
  return r;
}
// Barra do dia até as faixas de 250 e 700 kcal
function faixasHoje(t) {
  const k = extrasKcal(t, { campo: false }), max = Math.max(ATIV[1].kcal * 1.15, k), pct = v => Math.min(100, v / max * 100);
  const prox = ATIV.find(f => f.acima ? k <= f.kcal : k < f.kcal);
  return `<div class="ativ-barra" role="img" aria-label="${fmt(k)} kcal hoje"><i style="width:${pct(k)}%"></i>
      ${ATIV.map(f => `<b class="${(f.acima ? k > f.kcal : k >= f.kcal) ? "ok" : ""}" style="left:${pct(f.kcal)}%"><span>${f.kcal}</span></b>`).join("")}</div>
    <p class="small ${prox ? "muted" : "ok"}" style="margin:22px 0 6px">${prox ? `Faltam <b>${fmt(Math.max(1, f2(prox, k)))} kcal</b> para ${prox.acima ? "passar de" : "chegar a"} ${prox.kcal} kcal (+${prox.xp} XP).` : "As duas faixas do dia batidas."}</p>`;
}
const f2 = (f, k) => f.acima ? f.kcal + 1 - k : f.kcal - k;
// Passos: contados pelo celular durante o rastreamento a pé (app Android 2.2)
const passosTxt = n => n > 0 ? ` · ${fmt(n)} passos` : "";
function diario(t, dias, item) {
  const ws = weekStart(t), sem = somaPeriodo(ws, t), mes = somaPeriodo(t.slice(0, 8) + "01", t);
  const tile = (rot, r) => `<div class="tile"><div class="lbl">${rot}</div><div class="val num">~${fmt(r.kcal)} kcal</div>
    <div class="small muted">${r.dias} dia${r.dias === 1 ? "" : "s"} · ${fmt(r.min)} min${r.km ? ` · ${fmt(r.km, 1)} km` : ""}${passosTxt(r.passos)}${r.xp ? ` · +${r.xp} XP` : ""}</div></div>`;
  return panel("Diário das atividades", `<div class="grid2">${tile("Esta semana", sem)}${tile("Este mês", mes)}</div>
    ${dias.length ? dias.map(d => { const r = resumoDia(d);
      return `<div class="ativ-dia"><div class="row between"><b>${fmtDate(d, { weekday: "short", day: "2-digit", month: "2-digit" })}</b>
          <span class="num small">~${fmt(r.kcal)} kcal${r.xp ? ` · <b class="ok">+${r.xp} XP</b>` : ""}</span></div>
        <div class="small muted">${r.ex.length} atividade${r.ex.length > 1 ? "s" : ""} · ${fmt(r.min)} min${r.km ? ` · ${fmt(r.km, 1)} km` : ""}${passosTxt(r.passos)}</div>
        <ul class="list">${r.ex.map(e => item(d, e, true)).join("")}</ul></div>`; }).join("")
      : `<p class="muted small" style="margin-bottom:0">Nada nos últimos 30 dias.</p>`}`, "", `<span class="small muted">30 dias</span>`);
}

// ---- tela -----------------------------------------------------------------------
views.extras = () => {
  adotar();
  const t = today(), hoje = extrasOf(t), tr = S.tracking;
  const dias = [];
  for (let i = 1; i <= 30; i++) { const d = addDays(t, -i); if (extrasOf(d).length) dias.push(d); }
  const item = (d, e, semData) => `<li><span style="font-size:1.3rem">${typeOf(e.tipo)?.icone || "✨"}</span>
    <button class="item" data-act="editExtra" data-date="${d}" data-id="${e.id}"><div>${esc(typeOf(e.tipo)?.nome || e.tipo)}${e.campo ? ` <span class="small" style="color:${VERDE}">· Dungeon de Campo ${e.campo.venceu ? "✔" : "✗"}</span>` : ""}</div>
    <div class="small muted">${[e.dados.dist && fmt(e.dados.dist, 2) + " km", e.dados.tempo + " min", e.dados.elev && fmt(e.dados.elev) + " m ↑", e.gps?.passos > 0 && fmt(e.gps.passos) + " passos"].filter(Boolean).join(" · ")}</div></button>
    <span class="num">${d !== t && !semData ? `<span class="small muted">${fmtShort(d)}</span> ` : ""}~${fmt(e.kcal)} kcal</span></li>`;
  const meta = tr?.campo ? CAMPO[tr.tipo]?.km : null;
  const tracking = tr ? panel(tr.campo ? `Dungeon de Campo${tr.pausado ? ": pausado" : ""}` : tr.pausado ? "Pausado" : "Rastreando", `
      <p class="mid glow center num" id="tr-dist">${fmt(tr.dist / 1000, 2)} km</p>
      ${meta ? `<div class="bar" style="height:8px"><i id="tr-meta" style="width:${Math.min(100, tr.dist / 10 / meta)}%;background:${VERDE};box-shadow:0 0 8px ${VERDE}"></i></div>
        <p class="center small muted" style="margin:4px 0 0">Meta: <b>${meta} km</b> num percurso só</p>` : ""}
      ${tr.nativo && A_PE.includes(tr.tipo) ? `<p class="center small muted num" id="tr-passos" style="margin-top:-6px">${tr.passos >= 0 ? `${fmt(tr.passos)} passos` : ""}</p>` : ""}
      <p class="center timer num ${tr.pausado ? "muted" : "glow"}" id="tr-time" style="font-size:1.8rem">${relogio(ativoMs(tr))}</p>
      <p class="center small muted">${typeOf(tr.tipo).icone} ${typeOf(tr.tipo).nome} · <span id="tr-gps">${tr.pausado ? "pausado" : "aguardando GPS…"}</span></p>
      ${tr.pausado ? `<p class="small warn">Pausado: nada é somado${tr.nativo ? " e o GPS fica desligado" : ""}. O tempo parado não conta, e ao retomar o percurso recomeça de onde você estiver.${tr.nativo ? " Dá para retomar pela notificação também." : ""}</p>`
        : tr.nativo ? `<p class="small ok">Pode bloquear a tela e guardar o celular: o Android continua medindo, com a notificação "Rastreando" aberta (ela tem o botão Pausar). Para encerrar, abra o app e toque em Finalizar.</p>`
        : `<p class="small warn">Deixe o app aberto e a tela ligada: o navegador não lê o GPS com a tela apagada. Se a tela apagar, o tempo continua contando, mas a distância daquele trecho entra em linha reta.</p>`}
      ${podePausar(tr) ? `<button class="btn block" style="margin-bottom:8px" data-act="${tr.pausado ? "resumeTrack" : "pauseTrack"}">${tr.pausado ? "▶ Retomar" : "⏸ Pausar"}</button>`
        : `<p class="small muted">Pausar precisa do app Android 1.6. <a href="download/o-sistema.apk">Baixar</a></p>`}
      <div class="row"><button class="btn ghost grow" data-act="cancelTrack">${tr.campo ? "Desistir" : "Descartar"}</button>
      <button class="btn primary grow" data-act="stopTrack">Finalizar</button></div>`, tr.campo ? "portao" : "", tr.pausado ? `<span class="chip">Pausado</span>` : `<span class="chip warn">${tr.campo ? "Na dungeon" : "Ao vivo"}</span>`).replace('class="panel portao"', `class="panel portao" style="--pc:${VERDE}"`) : "";
  return `${header()}<div class="stack">
    ${tracking}
    ${panel("Atividades extras", `<p class="small muted" style="margin-top:0">O que você fez além da missão diária. As calorias entram no gasto do dia (Início e Evolução).
      Somando <b>${ATIV[0].kcal} kcal</b> no dia: +${ATIV[0].xp} XP (e +${ATIV[0].hp} HP com o Manto). Acima de <b>${ATIV[1].kcal} kcal</b>: mais +${ATIV[1].xp} XP e +${ATIV[1].hp} HP. Não substitui a missão.</p>
      <button class="btn primary block" data-act="newExtra">+ Registrar atividade</button>
      ${tr ? "" : `<button class="btn block" style="margin-top:8px" data-act="startTrack">📍 Rastrear agora com GPS</button>`}`)}
    ${bonusPanel()}
    ${panel("Hoje", `${faixasHoje(t)}${hoje.length ? `<ul class="list">${hoje.map(e => item(t, e)).join("")}</ul>` : `<p class="muted small" style="margin-bottom:0">Nenhuma atividade hoje.</p>`}`,
      "", hoje.length ? `<span class="num small muted">~${fmt(extrasKcal(t))} kcal</span>` : "")}
    ${diario(t, dias, item)}</div>`;
};

// ---- Dungeon de Campo ----------------------------------------------------------------
// Opcional: o jogador entra quando quer tentar. Um percurso só, rastreado pelo GPS do começo ao fim (pode pausar).
// Uma tentativa por tipo no dia; o que é feito lá dentro não é atividade extra (as calorias entram no gasto do dia).
const VERDE = "#3ddc84";
const CAMPO_TIPOS = Object.keys(CAMPO);
const podeEntrarCampo = (st = gpsBonusStatus()) => (st.ok || st.pendente) && CAMPO_TIPOS.some(k => !tentouCampo(today(), k));
export function bonusPanel() {
  const st = gpsBonusStatus(), usado = bonusWeek(), km = kmCampo(), tr = S.tracking;
  const linha = k => { const c = CAMPO[k], T = typeOf(k), v = km[k], tentou = tentouCampo(today(), k);
    return `<li><span class="grow">${T.icone} ${T.nome.split(" /")[0]} <span class="muted">· ${c.km} km</span></span>
      <b class="num ${v >= c.km ? "ok" : ""}">${v == null ? (tentou ? (tr?.campo && tr.tipo === k ? "na dungeon" : "tentativa gasta") : "—") : `${fmt(v, 1)} km ${v >= c.km ? "✔" : "✗"}`}</b></li>`; };
  const entrar = tr ? (tr.campo ? "" : `<p class="small muted">Finalize o rastreamento atual para entrar.</p>`)
    : podeEntrarCampo(st) ? `<button class="btn primary block" style="margin-top:4px;background:${VERDE};border-color:${VERDE};color:#04140b" data-act="entrarCampo">Entrar na Dungeon de Campo</button>`
    : (st.ok || st.pendente) ? `<p class="small muted">Você já tentou os quatro percursos hoje. Amanhã ela abre de novo.</p>` : "";
  return panel("Dungeon de Campo", `<p style="margin-top:0">Opcional: entre quando quiser tentar. Lá dentro é <b>um percurso só</b>, rastreado pelo GPS do começo ao fim (pode pausar):
      <b>${CAMPO.corrida.km} km correndo</b>, <b>${CAMPO.caminhada.km} km de caminhada</b>, <b>${CAMPO.trilha.km} km de trilha</b> ou <b>${CAMPO.bike.km} km de bike</b>.
      Vencendo, o Sistema sorteia o prêmio: <b class="gold">${BONUS.gpsOuro} Ouro</b> ou <b class="ok">${campoXp(BONUS.gpsOuro)} XP</b> em semana sem falta, ou <b class="gold">${BONUS.gpsOuroSeq} Ouro</b> ou <b class="ok">${campoXp(BONUS.gpsOuroSeq)} XP</b> se a semana teve falta mas as últimas ${BONUS.seguidos} missões foram cumpridas. Às vezes vem uma surpresa. Uma vitória por dia.</p>
    <p class="small muted">Uma tentativa por tipo no dia: só a primeira de cada tipo conta. O percurso da dungeon não é atividade extra (não soma para as faixas de ${ATIV[0].kcal} e ${ATIV[1].kcal} kcal), mas as calorias entram no gasto do dia.</p>
    <ul class="list small">${CAMPO_TIPOS.map(linha).join("")}</ul>
    <p class="small ${st.ok || st.feito ? "ok" : "warn"}">${st.ok || st.feito ? "✔ " : ""}${st.motivo}</p>
    ${entrar}
    <div class="row between small" style="margin-top:10px"><span class="muted">Bônus da semana em Ouro, o XP conta pelo equivalente (${fmtDate(weekStart(), { day: "2-digit", month: "2-digit" })} a ${fmtDate(weekEnd(), { day: "2-digit", month: "2-digit" })})</span><b class="gold num">${usado}/${BONUS.teto}</b></div>
    <div class="bar" style="margin-top:4px"><i style="width:${Math.min(100, usado / BONUS.teto * 100)}%;background:var(--gold);box-shadow:0 0 8px var(--gold)"></i></div>
    <p class="small muted" style="margin-bottom:0">Cada vitória entra no <a href="#/dungeons">Registro de Dungeons</a>.</p>`, "portao").replace('class="panel portao"', `class="panel portao" style="--pc:${VERDE}"`);
}

actions.entrarCampo = async () => {
  if (S.tracking || !podeEntrarCampo()) return refresh();
  await portaoFx("Dungeon de Campo", VERDE, "Um percurso só, do começo ao fim · toque para continuar", "[ SISTEMA ] Você entrou na Dungeon de Campo.");
  const o = modal(`<div class="ptitle"><h2 style="color:${VERDE}">Dungeon de Campo</h2></div>
    <p class="small muted">Escolha o percurso. O GPS mede do começo ao fim: pode pausar, mas é um percurso só. Desistir depois de 100 m gasta a tentativa do dia.</p>
    <div class="grid2">${CAMPO_TIPOS.map(k => { const T = typeOf(k), usado = tentouCampo(today(), k);
      return `<button class="btn" data-tipo="${k}" ${usado ? 'disabled aria-disabled="true"' : ""}>${T.icone} ${T.nome.split(" /")[0]}<br><span class="small ${usado ? "muted" : ""}">${usado ? "já tentou hoje" : `${CAMPO[k].km} km`}</span></button>`; }).join("")}</div>
    <button class="btn ghost block" style="margin-top:10px" data-close>Sair da dungeon</button>`);
  o.querySelectorAll("[data-tipo]:not([disabled])").forEach(b => b.onclick = () => {
    if (!iniciarRastreio(b.dataset.tipo, true)) return;
    (day(today()).campoTent ||= []).push(b.dataset.tipo); // a tentativa do tipo começa a contar
    save(); closeModal(); refresh();
  });
};

// Fim do percurso da Dungeon de Campo: salva sozinho (os valores são os do GPS, não dá para editar) e mostra o resultado
async function salvarCampo(tr) {
  const C = CAMPO[tr.tipo], km = Math.round(tr.dist / 10) / 100, tempo = Math.max(1, Math.round(ativoMs(tr) / 60000));
  const dados = { ...(km >= 0.05 ? { dist: km } : {}), tempo, ...(tr.elev >= 5 ? { elev: Math.round(tr.elev) } : {}) };
  const est = estimate(tr.tipo, dados, "moderada", tr.date), venceu = km >= C.km;
  day(tr.date).extras ||= [];
  S.days[tr.date].extras.push({ id: uid(), tipo: tr.tipo, dados, intensidade: "moderada", ...est,
    gps: { km, tipo: tr.tipo, ...(tr.passos > 0 ? { passos: tr.passos } : {}) }, campo: { venceu }, salvo: Date.now() });
  const ev = [];
  const bonus = checkGpsBonus(tr.date); if (bonus) ev.push(bonus);
  const campo = bonus ? finalizarCampo(tr.date) : null; if (campo) ev.push(...campo.eventos);
  checarMarcos(); const titulos = checarConquistas();
  save(); refresh();
  const kcal = `<p class="small muted">~${fmt(est.kcal)} kcal somadas ao gasto de ${tr.date === today() ? "hoje" : fmtDate(tr.date)}.</p>`;
  if (!venceu) {
    await falhaFx("A DUNGEON VENCEU", `${fmt(km, 2)} de ${C.km} km ${C.nome}`);
    await showEvents("Dungeon de Campo", [{ motivo: `Faltaram ${fmt(Math.max(0.01, C.km - km), 2)} km. A tentativa ${C.nome} de hoje foi gasta.`, xp: 0, gold: 0 }], kcal);
  } else if (!bonus) {
    const st = gpsBonusStatus(tr.date);
    await showEvents("Percurso cumprido", [{ motivo: `${fmt(km, 2)} km ${C.nome}: meta batida`, xp: 0, gold: 0 }],
      `<p class="small">${st.pendente ? "O prêmio entra quando você concluir a missão de hoje." : esc(st.motivo)}</p>${kcal}`);
  } else {
    await showEvents("Dungeon de Campo vencida", ev, kcal);
    if (campo?.bau) await bauFx(campo.bau.raridade, RAR[campo.bau.raridade].nome, RAR[campo.bau.raridade].cor, campo.bau.premios);
  }
  if (titulos.length) mostrarTitulos(titulos);
}

// ---- formulário -----------------------------------------------------------------
// gps: { km, tipo } do rastreamento (fica guardado mesmo se você editar a distância: é o que vale para o bônus)
function form({ date = today(), tipo = "caminhada", dados = {}, intensidade = "moderada", id = "", gps = null } = {}) {
  const o = modal(`<div class="ptitle"><h2>${id ? "Editar atividade" : "Nova atividade"}</h2><button class="btn sm ghost" data-close aria-label="Fechar">✕</button></div>
    <form id="xf"><div class="field"><label for="xt">Atividade</label><select id="xt" name="tipo">
      ${TYPES.map(t => `<option value="${t.id}" ${t.id === tipo ? "selected" : ""}>${t.icone} ${t.nome}</option>`).join("")}</select></div>
      <div class="grid2" id="xfields"></div>
      <div class="field" id="xint"><label for="xi">Intensidade</label><select id="xi" name="intensidade">
        ${INT.map(i => `<option ${i === intensidade ? "selected" : ""}>${i}</option>`).join("")}</select></div>
      <div class="field"><label for="xd">Data</label><input id="xd" type="date" name="data" value="${date}" max="${today()}"></div>
      <p class="center mid num glow" id="xk" style="margin:4px 0"></p><p class="center small muted" id="xdet" style="margin-top:0"></p>
      <div class="row">${id ? `<button type="button" class="btn danger" id="xdel">Excluir</button>` : ""}<button class="btn primary grow">Salvar</button></div></form>`);
  const f = $("#xf", o);
  const drawFields = () => {
    const t = typeOf(f.tipo.value);
    const prev = Object.fromEntries([...f.querySelectorAll("#xfields input")].map(i => [i.name, i.value]));
    $("#xfields", o).innerHTML = t.fields.map(([k, n]) => `<div class="field"><label for="x-${k}">${n}${k === "tempo" ? "" : " (opcional)"}</label>
      <input id="x-${k}" name="${k}" inputmode="decimal" value="${esc(prev[k] ?? dados[k] ?? "")}"></div>`).join("");
  };
  const read = () => {
    const t = typeOf(f.tipo.value), d = {};
    for (const [k] of t.fields) { const v = num(f[k]?.value); if (v !== null && v > 0) d[k] = v; }
    return d;
  };
  const upd = () => {
    const d = read(), t = typeOf(f.tipo.value);
    $("#xint", o).classList.toggle("hidden", !!(d.dist && t.gps)); // com distância, a velocidade define a intensidade
    if (!d.tempo) { $("#xk", o).textContent = "Informe o tempo"; $("#xdet", o).textContent = ""; return; }
    const e = estimate(f.tipo.value, d, f.intensidade.value, f.data.value || today());
    $("#xk", o).textContent = `~${fmt(e.kcal)} kcal`; $("#xdet", o).textContent = e.detalhe;
  };
  f.tipo.onchange = () => { drawFields(); upd(); };
  f.oninput = upd; drawFields(); upd();
  f.onsubmit = e => {
    e.preventDefault();
    const d = read(), date = f.data.value || today();
    if (!d.tempo) return toast("Informe o tempo da atividade.");
    if (d.tempo > 600 || (d.dist ?? 0) > 300 || (d.elev ?? 0) > 5000) return toast("Algum valor está fora do esperado.");
    const est = estimate(f.tipo.value, d, f.intensidade.value, date);
    const antigo = id ? Object.keys(S.days).flatMap(k => extrasOf(k)).find(e => e.id === id) : null; // editar não muda quando foi salva
    const rec = { id: id || uid(), tipo: f.tipo.value, dados: d, intensidade: f.intensidade.value, ...est, ...(gps ? { gps } : {}), salvo: antigo?.salvo ?? (id ? 0 : Date.now()) };
    const velha = id ? dateOf(id) : null;
    if (velha) removeExtra(velha, id);
    const dd = day(date); (dd.extras ??= []).push(rec);
    const ev = premiarAtividades(date);
    if (velha && velha !== date) ev.push(...premiarAtividades(velha));
    const bonus = checkGpsBonus(date); if (bonus) ev.push(bonus);
    const campo = bonus ? finalizarCampo(date) : null; if (campo) ev.push(...campo.eventos);
    checarMarcos(); const titulos = checarConquistas(); // km somados: marcos e títulos
    save(); closeModal(); refresh();
    if (titulos.length) setTimeout(() => mostrarTitulos(titulos), 1200);
    const fim = ev.length ? showEvents(campo ? "Dungeon de Campo vencida" : "Atividade registrada", ev, `<p class="small muted">~${fmt(est.kcal)} kcal somadas ao gasto de ${date === today() ? "hoje" : fmtDate(date)}.</p>`)
      : (toast(`Atividade salva: ~${fmt(est.kcal)} kcal.`), Promise.resolve());
    if (campo?.bau) fim.then(() => bauFx(campo.bau.raridade, RAR[campo.bau.raridade].nome, RAR[campo.bau.raridade].cor, campo.bau.premios));
  };
  if (id) $("#xdel", o).onclick = async () => {
    if (!await confirmBox("Excluir atividade", "Ela sai do gasto calórico do dia.", "Excluir")) return;
    removeExtra(date, id); const ev = premiarAtividades(date); save(); refresh();
    if (ev.length) showEvents("Atividade excluída", ev);
  };
}

// Percurso da Dungeon de Campo: os valores são os do GPS e não mudam; dá só para excluir (sai do gasto do dia)
function fichaCampo(date, e) {
  const T = typeOf(e.tipo), C = CAMPO[e.tipo];
  const o = modal(`<div class="ptitle"><h2 style="color:${VERDE}">Dungeon de Campo</h2><button class="btn sm ghost" data-close aria-label="Fechar">✕</button></div>
    <p class="center mid num glow" style="margin:4px 0">${fmt(e.gps?.km || 0, 2)} km</p>
    <p class="center small muted" style="margin-top:0">${T.icone} ${T.nome} · ${fmtDate(date)} · ${e.dados.tempo} min${e.gps?.passos ? ` · ${fmt(e.gps.passos)} passos` : ""} · ~${fmt(e.kcal)} kcal</p>
    <p class="small ${e.campo.venceu ? "ok" : "warn"}">${e.campo.venceu ? `✔ Meta de ${C?.km} km batida.` : `✗ Meta de ${C?.km} km não batida.`}</p>
    <p class="small muted">Os valores são os do GPS e não dá para editar. Excluir tira as calorias do dia; a tentativa continua gasta e o prêmio recebido fica.</p>
    <button class="btn danger block" id="xdel">Excluir</button>`);
  $("#xdel", o).onclick = async () => {
    if (!await confirmBox("Excluir percurso", "Ele sai do gasto calórico do dia.", "Excluir")) return;
    removeExtra(date, e.id); save(); closeModal(); refresh();
  };
}

const dateOf = id => Object.keys(S.days).find(d => extrasOf(d).some(e => e.id === id));
function removeExtra(date, id) { const d = S.days[date]; d.extras = d.extras.filter(e => e.id !== id); }

actions.newExtra = () => form();
actions.editExtra = ({ date, id }) => {
  const e = extrasOf(date).find(x => x.id === id);
  if (e.campo) return fichaCampo(date, e);
  form({ date, tipo: e.tipo, dados: e.dados, intensidade: e.intensidade, id, gps: e.gps || null });
};

// ---- rastreamento por GPS -----------------------------------------------------------
let watch = null, wake = null, tick = null;

const TRACK_ERR = {
  permissao: "Permita a localização (precisa, durante o uso do app) e toque de novo.",
  gpsoff: "A localização do celular está desligada. Ligue e toque de novo.",
};
const maxKmh = tipo => tipo === "bike" ? 70 : 30; // trecho mais rápido que isso (carro, ônibus) não conta
// Tempo de atividade, sem as pausas
const ativoMs = (tr, agora = Date.now()) => Math.max(0, agora - tr.start - (tr.pausadoMs || 0) - (tr.pausado ? agora - (tr.pausaInicio || agora) : 0));
const relogio = ms => { const s = Math.floor(ms / 1000);
  return (s >= 3600 ? Math.floor(s / 3600) + ":" : "") + String(Math.floor(s / 60) % 60).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };
const podePausar = tr => !tr.nativo || typeof nativo?.trackPause === "function";
// Pausa/retomada do Android (a fonte da verdade quando é ele quem rastreia)
const copiaPausa = (tr, st) => { tr.pausado = !!st.pausado; tr.pausadoMs = st.pausadoMs || 0; tr.pausaInicio = st.pausaInicio || 0; };
// Passos: o Android 2.2 lê o contador de passos do celular nas atividades a pé (-1 = sem contador; ausente = app antigo)
const A_PE = ["caminhada", "trilha", "corrida"];
function mostraPassos(tr, st) {
  const el = $("#tr-passos"); if (!el) return;
  if (st.passos == null) return el.remove(); // app Android antigo: não conta passos
  tr.passos = st.passos;
  el.textContent = st.passos >= 0 ? `${fmt(st.passos)} passos`
    : Date.now() - tr.start > 30000 ? "Sem passos: permita \"Atividade física\" para O Sistema nas permissões do Android" : "";
}

// Rastreamento que está rodando no Android sem o app saber (ex.: dados restaurados): assume ele
function adotar() {
  if (S.tracking || !gpsNativo()) return;
  const st = nativeTrack("trackStatus");
  if (!st?.ativo || !typeOf(st.tipo)) return;
  S.tracking = { tipo: st.tipo, start: st.start, date: iso(new Date(st.start)), dist: st.dist || 0, nativo: true };
  copiaPausa(S.tracking, st);
  save();
}

actions.startTrack = () => {
  const gps = TYPES.filter(t => t.gps), nat = gpsNativo();
  const o = modal(`<div class="ptitle"><h2>Rastrear com GPS</h2></div>
    <p class="small muted">${nat ? "O Android mede o percurso mesmo com a tela bloqueada: pode guardar o celular no bolso." : "O app soma a distância do percurso enquanto estiver aberto."} No fim, você confere os valores antes de salvar.</p>
    ${nativo && !nat ? `<p class="small warn">Para rastrear com a tela bloqueada, atualize o app Android para a versão 1.5. <a href="download/o-sistema.apk">Baixar</a></p>` : ""}
    <div class="grid2">${gps.map(t => `<button class="btn" data-tipo="${t.id}">${t.icone} ${t.nome}</button>`).join("")}</div>
    <button class="btn ghost block" style="margin-top:10px" data-close>Cancelar</button>`);
  o.querySelectorAll("[data-tipo]").forEach(b => b.onclick = () => { if (iniciarRastreio(b.dataset.tipo)) { save(); closeModal(); refresh(); } });
};
// Liga o GPS (no Android, com a tela bloqueada; no navegador, com o app aberto). campo = percurso da Dungeon de Campo
function iniciarRastreio(tipo, campo = false) {
  const nat = gpsNativo(), start = Date.now();
  if (nat) {
    const r = nativeTrack("trackStart", tipo, start, true);
    if (r !== "ok") { toast(TRACK_ERR[r] || "Não consegui ligar o GPS. Tente de novo.", 5000); return false; }
  } else keepScreenOn(true);
  S.tracking = { tipo, start, date: today(), dist: 0, last: null, ...(nat ? { nativo: true } : {}), ...(campo ? { campo: true } : {}) };
  return true;
}

function stopWatch() {
  if (watch !== null) navigator.geolocation.clearWatch(watch);
  watch = null; clearInterval(tick); wake?.release?.().catch(() => {}); wake = null;
}

actions.cancelTrack = async () => {
  const tr = S.tracking; if (!tr) return;
  const poucoCampo = tr.campo && tr.dist < 100; // começou sem querer: não gasta a tentativa
  if (!await confirmBox(tr.campo ? "Desistir da Dungeon de Campo" : "Descartar", tr.campo
      ? (poucoCampo ? "Ainda não deu 100 m: a tentativa não é gasta e você pode entrar de novo." : `O percurso é descartado e a tentativa ${CAMPO[tr.tipo].nome} de hoje fica gasta.`)
      : "O percurso rastreado será descartado.", tr.campo ? "Desistir" : "Descartar")) return;
  if (tr.nativo) nativeTrack("trackCancel");
  if (poucoCampo) { const dd = S.days[tr.date]; if (dd?.campoTent) dd.campoTent = dd.campoTent.filter(k => k !== tr.tipo); }
  stopWatch(); keepScreenOn(false); delete S.tracking; save(); refresh();
};

function setPausa(on) {
  const tr = S.tracking; if (!tr || !!tr.pausado === on) return;
  if (tr.nativo && !["ok", "erro"].includes(nativeTrack("trackPause", on))) return toast("Não consegui pausar. Tente de novo.");
  const agora = Date.now();
  if (on) { tr.pausado = true; tr.pausaInicio = agora; }
  else { tr.pausadoMs = (tr.pausadoMs || 0) + agora - (tr.pausaInicio || agora); tr.pausado = false; tr.last = null; } // retoma do ponto atual
  save(); refresh();
}
actions.pauseTrack = () => setPausa(true);
actions.resumeTrack = () => setPausa(false);

actions.stopTrack = async () => {
  const tr = S.tracking; if (!tr) return;
  if (tr.campo && tr.dist / 1000 < CAMPO[tr.tipo].km && !await confirmBox("Finalizar a Dungeon de Campo",
    `Você tem ${fmt(tr.dist / 1000, 2)} de ${CAMPO[tr.tipo].km} km. Finalizar agora encerra a tentativa ${CAMPO[tr.tipo].nome} de hoje.`, "Finalizar")) return;
  if (tr.nativo) { const st = nativeTrack("trackStop"); if (st) { tr.dist = st.dist || 0; tr.elev = st.elev || 0; tr.passos = st.passos; copiaPausa(tr, st); } }
  stopWatch(); keepScreenOn(false);
  delete S.tracking; save(); refresh();
  if (tr.campo) return salvarCampo(tr);
  const tempo = Math.max(1, Math.round(ativoMs(tr) / 60000));
  form({ date: tr.date, tipo: tr.tipo, gps: { km: Math.round(tr.dist / 10) / 100, tipo: tr.tipo, ...(tr.passos > 0 ? { passos: tr.passos } : {}) },
    dados: { dist: tr.dist >= 50 ? Math.round(tr.dist / 10) / 100 : "", tempo, elev: tr.elev >= 5 ? Math.round(tr.elev) : "" } });
};

export function startWatch() {
  if (watch !== null || !S.tracking || S.tracking.nativo || !navigator.geolocation) return;
  navigator.wakeLock?.request("screen").then(w => { wake = w; }).catch(() => {});
  let lastSave = 0;
  watch = navigator.geolocation.watchPosition(p => {
    const tr = S.tracking; if (!tr) return stopWatch();
    const c = p.coords, st = $("#tr-gps");
    if (tr.pausado) { if (st) st.textContent = "pausado"; return; }
    if (st) st.textContent = `GPS ±${Math.round(c.accuracy)} m`;
    if (c.accuracy > 35) return; // leitura imprecisa demais: ignora
    const pt = { lat: c.latitude, lon: c.longitude, alt: c.altitude, t: p.timestamp };
    if (tr.last) {
      const d = distM(tr.last, pt);
      if (d < Math.max(8, c.accuracy * 0.6)) return; // parado / ruído do GPS
      if (d / Math.max(1, (pt.t - tr.last.t) / 1000) * 3.6 <= maxKmh(tr.tipo)) {
        tr.dist += d;
        if (pt.alt != null && tr.last.alt != null && pt.alt - tr.last.alt > 2) tr.elev = (tr.elev || 0) + pt.alt - tr.last.alt;
      }
    }
    tr.last = pt;
    const el = $("#tr-dist"); if (el) el.textContent = `${fmt(tr.dist / 1000, 2)} km`;
    const m = $("#tr-meta"); if (m && tr.campo) m.style.width = `${Math.min(100, tr.dist / 10 / CAMPO[tr.tipo].km)}%`;
    if (Date.now() - lastSave > 15000) { lastSave = Date.now(); save(); }
  }, () => { const st = $("#tr-gps"); if (st) st.textContent = "sem sinal de GPS"; },
  { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
}

views.extras.after = () => {
  clearInterval(tick);
  if (!S.tracking) return stopWatch();
  startWatch();
  const el = $("#tr-time");
  let religou = false;
  const upd = () => {
    if (!S.tracking || !el.isConnected) return clearInterval(tick);
    if (S.tracking.nativo) {
      const tr = S.tracking, st = nativeTrack("trackStatus"), gpsEl = $("#tr-gps");
      // o Android fechou o app no meio do percurso: religa o GPS e continua de onde parou (uma tentativa por tela)
      if (st && (!st.ativo || !st.rodando) && !religou) { religou = true; nativeTrack("trackStart", tr.tipo, tr.start, !st.ativo); }
      if (st) {
        const mudou = !!st.pausado !== !!tr.pausado; // pausado/retomado pela notificação
        copiaPausa(tr, st);
        if (mudou) { save(); return refresh(); }
        tr.dist = st.dist || 0;
        const d = $("#tr-dist"); if (d) d.textContent = `${fmt(tr.dist / 1000, 2)} km`;
        mostraPassos(tr, st);
        const m = $("#tr-meta"); if (m) m.style.width = `${Math.min(100, tr.dist / 10 / CAMPO[tr.tipo].km)}%`;
        if (gpsEl) gpsEl.textContent = st.pausado ? "pausado" : st.gps === false ? "localização do celular desligada"
          : !st.fixAt ? "aguardando GPS…" : Date.now() - st.fixAt > 30000 ? "sem sinal de GPS" : `GPS ±${Math.round(st.acc)} m`;
      }
    }
    el.textContent = relogio(ativoMs(S.tracking));
  };
  upd(); tick = setInterval(upd, 1000);
};

// ao voltar para o app com a tela ligada, o navegador reativa o GPS e o wake lock
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { if (watch !== null) { navigator.geolocation.clearWatch(watch); watch = null; } }
  else if (S.tracking && !S.tracking.nativo) startWatch();
});
