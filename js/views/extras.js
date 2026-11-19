// Atividades extras: tudo o que você faz além da missão diária (caminhada, bike, futebol...).
// Entra no gasto calórico do dia. Pode ser lançada à mão ou rastreada por GPS com o app aberto.
import { views, actions, refresh } from "../core.js";
import { S, day, save } from "../store.js";
import { today, esc, fmt, num, uid, fmtDate, fmtShort, addDays, distM, $ } from "../util.js";
import { header, panel, modal, closeModal, toast, confirmBox, showEvents } from "../ui.js";
import { tmb, weightOn, grant, extrasKcal, BONUS, gpsBonusStatus, checkGpsBonus, bonusWeek, weekStart, weekEnd } from "../game.js";

export const EXTRA_XP = 10; // uma vez por dia, só pelo hábito de se mexer

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

// ---- tela -----------------------------------------------------------------------
views.extras = () => {
  const t = today(), hoje = extrasOf(t), tr = S.tracking;
  const recentes = [];
  for (let i = 1; i <= 30; i++) { const d = addDays(t, -i); extrasOf(d).forEach(e => recentes.push([d, e])); }
  const item = (d, e) => `<li><span style="font-size:1.3rem">${typeOf(e.tipo)?.icone || "✨"}</span>
    <button class="item" data-act="editExtra" data-date="${d}" data-id="${e.id}"><div>${esc(typeOf(e.tipo)?.nome || e.tipo)}</div>
    <div class="small muted">${[e.dados.dist && fmt(e.dados.dist, 2) + " km", e.dados.tempo + " min", e.dados.elev && fmt(e.dados.elev) + " m ↑"].filter(Boolean).join(" · ")}</div></button>
    <span class="num">${d !== t ? `<span class="small muted">${fmtShort(d)}</span> ` : ""}~${fmt(e.kcal)} kcal</span></li>`;
  const tracking = tr ? panel("Rastreando", `
      <p class="mid glow center num" id="tr-dist">${fmt(tr.dist / 1000, 2)} km</p>
      <p class="center timer num glow" id="tr-time" style="font-size:1.8rem">00:00</p>
      <p class="center small muted">${typeOf(tr.tipo).icone} ${typeOf(tr.tipo).nome} · <span id="tr-gps">aguardando GPS…</span></p>
      <p class="small warn">Deixe o app aberto e a tela ligada: o navegador não lê o GPS com a tela apagada. Se a tela apagar, o tempo continua contando, mas a distância daquele trecho entra em linha reta.</p>
      <div class="row"><button class="btn ghost grow" data-act="cancelTrack">Descartar</button>
      <button class="btn primary grow" data-act="stopTrack">Finalizar</button></div>`, "", `<span class="chip warn">Ao vivo</span>`) : "";
  return `${header()}<div class="stack">
    ${tracking}
    ${panel("Atividades extras", `<p class="small muted" style="margin-top:0">O que você fez além da missão diária. As calorias entram no gasto do dia (Início e Evolução).
      A primeira atividade de cada dia vale +${EXTRA_XP} XP. Não substitui a missão.</p>
      <button class="btn primary block" data-act="newExtra">+ Registrar atividade</button>
      ${tr ? "" : `<button class="btn block" style="margin-top:8px" data-act="startTrack">📍 Rastrear agora com GPS</button>`}`)}
    ${bonusPanel()}
    ${panel("Hoje", hoje.length ? `<ul class="list">${hoje.map(e => item(t, e)).join("")}</ul>` : `<p class="muted small">Nenhuma atividade extra hoje.</p>`,
      "", hoje.length ? `<span class="num small muted">~${fmt(extrasKcal(t))} kcal</span>` : "")}
    ${recentes.length ? panel("Últimos 30 dias", `<ul class="list">${recentes.map(([d, e]) => item(d, e)).join("")}</ul>`) : ""}</div>`;
};

// ---- missão bônus ----------------------------------------------------------------
export function bonusPanel() {
  const st = gpsBonusStatus(), usado = bonusWeek();
  return panel("Missão bônus", `<p style="margin-top:0">Caminhada, corrida ou trilha de <b>${BONUS.km.caminhada} km ou mais</b> (bike: ${BONUS.km.bike} km), <b>rastreada pelo GPS</b>: <b class="gold">+${BONUS.gpsOuro} Ouro</b>. Uma por dia, só Ouro.</p>
    <p class="small ${st.ok ? "ok" : st.feito ? "ok" : "warn"}">${st.ok ? "✔ " : st.feito ? "✔ " : ""}${st.motivo}</p>
    <div class="row between small"><span class="muted">Bônus da semana (${fmtDate(weekStart(), { day: "2-digit", month: "2-digit" })} a ${fmtDate(weekEnd(), { day: "2-digit", month: "2-digit" })})</span><b class="gold num">${usado}/${BONUS.teto}</b></div>
    <div class="bar" style="margin-top:4px"><i style="width:${Math.min(100, usado / BONUS.teto * 100)}%;background:var(--gold);box-shadow:0 0 8px var(--gold)"></i></div>
    <p class="small muted" style="margin-bottom:0">Registro manual não conta para o bônus: só a distância medida pelo rastreamento.</p>`, "", `<span class="gold">◆</span>`);
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
    const rec = { id: id || uid(), tipo: f.tipo.value, dados: d, intensidade: f.intensidade.value, ...est, ...(gps ? { gps } : {}) };
    if (id) removeExtra(dateOf(id), id);
    const dd = day(date); (dd.extras ??= []).push(rec);
    const ev = [];
    if (!dd.extraXp) { dd.extraXp = true; ev.push(grant(EXTRA_XP, 0, "Atividade extra registrada", date)); }
    const bonus = checkGpsBonus(date); if (bonus) ev.push(bonus);
    save(); closeModal(); refresh();
    ev.length ? showEvents("Atividade registrada", ev, `<p class="small muted">~${fmt(est.kcal)} kcal somadas ao gasto de ${date === today() ? "hoje" : fmtDate(date)}.</p>`)
      : toast(`Atividade salva: ~${fmt(est.kcal)} kcal.`);
  };
  if (id) $("#xdel", o).onclick = async () => {
    if (!await confirmBox("Excluir atividade", "Ela sai do gasto calórico do dia.", "Excluir")) return;
    removeExtra(date, id); save(); refresh();
  };
}

const dateOf = id => Object.keys(S.days).find(d => extrasOf(d).some(e => e.id === id));
function removeExtra(date, id) { const d = S.days[date]; d.extras = d.extras.filter(e => e.id !== id); }

actions.newExtra = () => form();
actions.editExtra = ({ date, id }) => {
  const e = extrasOf(date).find(x => x.id === id);
  form({ date, tipo: e.tipo, dados: e.dados, intensidade: e.intensidade, id, gps: e.gps || null });
};

// ---- rastreamento por GPS -----------------------------------------------------------
let watch = null, wake = null, tick = null;

actions.startTrack = () => {
  const gps = TYPES.filter(t => t.gps);
  const o = modal(`<div class="ptitle"><h2>Rastrear com GPS</h2></div>
    <p class="small muted">O app soma a distância do percurso enquanto estiver aberto. No fim, você confere os valores antes de salvar.</p>
    <div class="grid2">${gps.map(t => `<button class="btn" data-tipo="${t.id}">${t.icone} ${t.nome}</button>`).join("")}</div>
    <button class="btn ghost block" style="margin-top:10px" data-close>Cancelar</button>`);
  o.querySelectorAll("[data-tipo]").forEach(b => b.onclick = () => {
    S.tracking = { tipo: b.dataset.tipo, start: Date.now(), date: today(), dist: 0, last: null };
    save(); closeModal(); refresh();
  });
};

function stopWatch() {
  if (watch !== null) navigator.geolocation.clearWatch(watch);
  watch = null; clearInterval(tick); wake?.release?.().catch(() => {}); wake = null;
}

actions.cancelTrack = async () => {
  if (!await confirmBox("Descartar", "O percurso rastreado será descartado.", "Descartar")) return;
  stopWatch(); delete S.tracking; save(); refresh();
};

actions.stopTrack = () => {
  const tr = S.tracking; stopWatch();
  delete S.tracking; save(); refresh();
  const tempo = Math.max(1, Math.round((Date.now() - tr.start) / 60000));
  form({ date: tr.date, tipo: tr.tipo, gps: { km: Math.round(tr.dist / 10) / 100, tipo: tr.tipo },
    dados: { dist: tr.dist >= 50 ? Math.round(tr.dist / 10) / 100 : "", tempo, elev: tr.elev >= 5 ? Math.round(tr.elev) : "" } });
};

export function startWatch() {
  if (watch !== null || !S.tracking || !navigator.geolocation) return;
  navigator.wakeLock?.request("screen").then(w => { wake = w; }).catch(() => {});
  let lastSave = 0;
  watch = navigator.geolocation.watchPosition(p => {
    const tr = S.tracking; if (!tr) return stopWatch();
    const c = p.coords, st = $("#tr-gps");
    if (st) st.textContent = `GPS ±${Math.round(c.accuracy)} m`;
    if (c.accuracy > 35) return; // leitura imprecisa demais: ignora
    const pt = { lat: c.latitude, lon: c.longitude, alt: c.altitude, t: p.timestamp };
    if (tr.last) {
      const d = distM(tr.last, pt);
      if (d < Math.max(8, c.accuracy * 0.6)) return; // parado / ruído do GPS
      tr.dist += d;
      if (pt.alt != null && tr.last.alt != null && pt.alt - tr.last.alt > 2) tr.elev = (tr.elev || 0) + pt.alt - tr.last.alt;
    }
    tr.last = pt;
    const el = $("#tr-dist"); if (el) el.textContent = `${fmt(tr.dist / 1000, 2)} km`;
    if (Date.now() - lastSave > 15000) { lastSave = Date.now(); save(); }
  }, () => { const st = $("#tr-gps"); if (st) st.textContent = "sem sinal de GPS"; },
  { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
}

views.extras.after = () => {
  clearInterval(tick);
  if (!S.tracking) return stopWatch();
  startWatch();
  const el = $("#tr-time");
  const upd = () => {
    if (!S.tracking || !el.isConnected) return clearInterval(tick);
    const s = Math.floor((Date.now() - S.tracking.start) / 1000);
    el.textContent = (s >= 3600 ? Math.floor(s / 3600) + ":" : "") + String(Math.floor(s / 60) % 60).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  };
  upd(); tick = setInterval(upd, 1000);
};

// ao voltar para o app com a tela ligada, o navegador reativa o GPS e o wake lock
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { if (watch !== null) { navigator.geolocation.clearWatch(watch); watch = null; } }
  else if (S.tracking) startWatch();
});
