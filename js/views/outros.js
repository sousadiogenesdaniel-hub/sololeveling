// Mais, Medidas (diárias e semanais), Fotos e Loja
import { views, actions, refresh } from "../core.js";
import { S, day, save, photos } from "../store.js";
import { today, esc, fmt, num, fmtDate, fmtShort, signed, shrinkImage, uid, $ } from "../util.js";
import { header, panel, modal, closeModal, toast, showEvents, confirmBox, sysMessage } from "../ui.js";
import { grant, R, inPenalty, daysToFriday, pendingDebts, monthDebt } from "../game.js";

// ---- Mais -----------------------------------------------------------------------
views.mais = () => {
  const item = (rota, ic, nome, desc, extra = "") => `<li><span style="font-size:1.4rem">${ic}</span>
    <a class="grow" href="#/${rota}" style="text-decoration:none;color:inherit"><b>${nome}</b><br><span class="small muted">${desc}</span></a>${extra}<span class="muted">›</span></li>`;
  const pend = pendingDebts().length;
  return `${header()}<div class="stack">${panel("Menu", `<ul class="list">
    ${item("extras", "🚶", "Atividades extras", "Caminhada, bike, esporte... somam no gasto do dia", S.tracking ? `<span class="chip warn">Ao vivo</span>` : "")}
    ${item("medidas", "📏", "Medidas", "Peso e abdômen diários, medidas semanais")}
    ${item("fotos", "📸", "Fotos", "Registro semanal e antes × depois")}
    ${item("loja", "🛒", "Loja de sexta", "Troque Ouro pelo direito de comer besteira")}
    ${item("penalidade", "⚠️", "Penalidades", "Comprovantes e dívidas do mês", pend ? `<span class="chip bad">${pend}</span>` : "")}
    ${item("historico", "📜", "Registro do Sistema", "Histórico de XP e Ouro")}
    ${item("perfil", "👤", "Perfil e ajustes", "Status, metas, casa, trilha e backup")}
  </ul>`)}</div>`;
};

views.historico = () => {
  const log = [...S.game.log].reverse().slice(0, 120);
  return `${header()}<div class="stack">${panel("Registro do Sistema", log.length ? `<ul class="list small">${log.map(e => `<li>
    <span class="muted num">${fmtShort(e.d)}</span><span class="grow">${esc(e.motivo)}</span>
    <span class="num">${e.xp ? `<b class="${e.xp > 0 ? "ok" : "bad"}">${signed(e.xp, 0)} XP</b>` : ""} ${e.gold ? `<b class="${e.gold > 0 ? "gold" : "bad"}">${signed(e.gold, 0)} ◆</b>` : ""}</span></li>`).join("")}</ul>`
    : `<p class="muted">Nada registrado ainda.</p>`)}</div>`;
};

// ---- Medidas ----------------------------------------------------------------------
export const WEEKLY = [["pescoco", "Pescoço"], ["torax", "Tórax"], ["quadril", "Quadril"], ["bracoE", "Braço esq."],
  ["bracoD", "Braço dir."], ["coxaE", "Coxa esq."], ["coxaD", "Coxa dir."]];

views.medidas = arg => {
  const tab = arg === "semanal" ? "semanal" : "diaria";
  const tabs = `<div class="tabs"><a class="btn sm ${tab === "diaria" ? "on" : ""}" href="#/medidas">Diárias</a>
    <a class="btn sm ${tab === "semanal" ? "on" : ""}" href="#/medidas/semanal">Semanais</a></div>`;
  if (tab === "diaria") {
    const d = S.days[today()] || {};
    const hist = Object.keys(S.days).filter(k => S.days[k].peso || S.days[k].abdomen).sort().reverse().slice(0, 14);
    return `${header()}${tabs}<div class="stack">
      ${panel("Medidas de hoje", `<form data-act="saveDaily">
        <div class="row"><div class="field grow"><label for="dp">Peso (kg)</label><input id="dp" name="peso" inputmode="decimal" value="${d.peso ?? ""}"></div>
        <div class="field grow"><label for="da">Abdômen (cm)</label><input id="da" name="abdomen" inputmode="decimal" value="${d.abdomen ?? ""}"></div></div>
        <div class="field"><label for="dd">Data</label><input id="dd" type="date" name="data" value="${today()}" max="${today()}"></div>
        <button class="btn primary block">Salvar</button></form>
        <p class="small muted">Meça sempre no mesmo horário, de preferência ao acordar. Registrar os dois hoje vale +${R.medidasXp} XP.</p>`)}
      ${panel("Últimos registros", hist.length ? `<table class="t"><tr><th>Data</th><th>Peso</th><th>Abdômen</th></tr>
        ${hist.map(k => `<tr><td>${fmtDate(k)}</td><td class="num">${S.days[k].peso ? fmt(S.days[k].peso, 1) + " kg" : "—"}</td><td class="num">${S.days[k].abdomen ? fmt(S.days[k].abdomen, 1) + " cm" : "—"}</td></tr>`).join("")}</table>`
        : `<p class="muted">Nenhum registro ainda.</p>`)}</div>`;
  }
  const keys = Object.keys(S.weekly).sort(), last = S.weekly[keys[keys.length - 1]] || {}, prev = S.weekly[keys[keys.length - 2]];
  const cur = S.weekly[today()] || {};
  return `${header()}${tabs}<div class="stack">
    ${panel("Medidas da semana", `<form data-act="saveWeekly"><div class="grid2">
      ${WEEKLY.map(([k, n]) => `<div class="field"><label for="w${k}">${n} (cm)</label><input id="w${k}" name="${k}" inputmode="decimal" value="${cur[k] ?? ""}" placeholder="${last[k] ?? ""}"></div>`).join("")}
      <div class="field"><label for="wd">Data</label><input id="wd" type="date" name="data" value="${today()}" max="${today()}"></div></div>
      <button class="btn primary block">Salvar</button></form>`)}
    ${panel("Última medição", keys.length ? `<p class="small muted" style="margin-top:0">${fmtDate(keys[keys.length - 1])}${prev ? " · variação desde a medição anterior" : ""}</p>
      <table class="t">${WEEKLY.map(([k, n]) => `<tr><td>${n}</td><td class="num">${last[k] ? fmt(last[k], 1) + " cm" : "—"}</td>
      <td class="num small muted">${prev && last[k] && prev[k] ? signed(last[k] - prev[k]) : ""}</td></tr>`).join("")}</table>` : `<p class="muted">Nenhuma medição semanal ainda.</p>`)}</div>`;
};

actions.saveDaily = d => {
  const peso = num(d.peso), abd = num(d.abdomen), date = d.data || today();
  if (peso !== null && !(peso > 20 && peso < 400)) return toast("Peso fora do esperado.");
  if (abd !== null && !(abd > 30 && abd < 300)) return toast("Abdômen fora do esperado.");
  const rec = day(date);
  if (peso !== null) rec.peso = peso; else delete rec.peso;
  if (abd !== null) rec.abdomen = abd; else delete rec.abdomen;
  const ev = [];
  if (date === today() && rec.peso && rec.abdomen && !rec.medXp) { rec.medXp = true; ev.push(grant(R.medidasXp, 0, "Medidas do dia registradas")); }
  save(); refresh();
  ev.length ? showEvents("Registro salvo", ev) : toast("Medidas salvas.");
};

actions.saveWeekly = d => {
  const rec = {};
  for (const [k] of WEEKLY) { const v = num(d[k]); if (v !== null) { if (!(v > 5 && v < 300)) return toast("Valor fora do esperado."); rec[k] = v; } }
  if (!Object.keys(rec).length) return toast("Preencha ao menos uma medida.");
  const date = d.data || today(), novo = !S.weekly[date];
  const semana = Object.keys(S.weekly).some(k => Math.abs(new Date(k) - new Date(date)) < 6 * 86400000);
  S.weekly[date] = rec;
  const ev = novo && !semana ? [grant(R.semanalXp, 0, "Medidas semanais registradas")] : [];
  save(); refresh();
  ev.length ? showEvents("Registro salvo", ev) : toast("Medidas semanais salvas.");
};

// ---- Fotos ------------------------------------------------------------------------
const ANGULOS = [["frente", "Frente"], ["lado", "Lado"], ["costas", "Costas"]];
let urls = [];
const urlOf = blob => { const u = URL.createObjectURL(blob); urls.push(u); return u; };
let photoCache = [];

views.fotos = () => `${header()}<div class="stack">
  ${panel("Nova foto", `<form data-act="addPhoto"><div class="row">
      <div class="field grow"><label for="pd">Data</label><input id="pd" type="date" name="data" value="${today()}" max="${today()}"></div>
      <div class="field grow"><label for="pa">Ângulo</label><select id="pa" name="angulo">${ANGULOS.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></div></div>
      <div class="field"><label for="pf">Foto</label><input id="pf" type="file" name="foto" accept="image/*" required></div>
      <button class="btn primary block">Adicionar</button></form>
      <p class="small muted">Mesma luz, mesma distância e mesma pose toda semana. As fotos ficam só neste aparelho.</p>`)}
  <div id="photo-area"><p class="muted center">Carregando fotos…</p></div></div>`;

views.fotos.after = async () => {
  urls.forEach(URL.revokeObjectURL); urls = [];
  photoCache = (await photos.all()).filter(p => p.tipo !== "prova").sort((a, b) => b.date.localeCompare(a.date) || a.angulo.localeCompare(b.angulo));
  const area = $("#photo-area"); if (!area) return;
  if (!photoCache.length) { area.innerHTML = `<p class="muted center">Nenhuma foto ainda.</p>`; return; }
  const dates = [...new Set(photoCache.map(p => p.date))];
  const opts = sel => dates.map(d => `<option value="${d}" ${d === sel ? "selected" : ""}>${fmtDate(d)}</option>`).join("");
  const compare = dates.length > 1 ? panel("Antes × depois", `<div class="row">
      <select id="cA" aria-label="Data antes">${opts(dates[dates.length - 1])}</select><select id="cB" aria-label="Data depois">${opts(dates[0])}</select>
      <select id="cAng" aria-label="Ângulo">${ANGULOS.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></div>
      <div class="compare" id="cmp" style="margin-top:8px"></div>`) : "";
  area.innerHTML = `<div class="stack">${compare}${dates.map(d => panel(fmtDate(d), `<div class="photos">
    ${photoCache.filter(p => p.date === d).map(p => `<figure><img src="${urlOf(p.blob)}" alt="Foto de ${p.angulo} em ${fmtDate(d)}" loading="lazy">
      <figcaption class="row between"><span>${esc(p.angulo)}</span><button class="btn sm danger" style="min-height:0;padding:0 6px" data-act="delPhoto" data-id="${p.id}" aria-label="Excluir foto">✕</button></figcaption></figure>`).join("")}</div>`,
    "", S.days[d]?.peso ? `<span class="small muted num">${fmt(S.days[d].peso, 1)} kg</span>` : "")).join("")}</div>`;
  const cmp = $("#cmp");
  if (cmp) {
    const draw = () => {
      cmp.innerHTML = [$("#cA").value, $("#cB").value].map(d => {
        const p = photoCache.find(x => x.date === d && x.angulo === $("#cAng").value);
        return `<div>${p ? `<img src="${urlOf(p.blob)}" alt="Foto de ${fmtDate(d)}">` : `<span class="muted small center">Sem foto de<br>${fmtDate(d)}</span>`}</div>`;
      }).join("");
    };
    ["cA", "cB", "cAng"].forEach(id => { $("#" + id).onchange = draw; });
    draw();
  }
};

actions.addPhoto = async (d, form) => {
  const file = form.foto.files[0]; if (!file) return;
  try {
    await photos.add({ date: d.data || today(), angulo: d.angulo, tipo: "progresso", blob: await shrinkImage(file) });
  } catch { return toast("Não consegui ler essa imagem."); }
  if (!S.lastPhoto || d.data > S.lastPhoto) S.lastPhoto = d.data || today();
  save(); toast("Foto adicionada."); refresh();
};
actions.delPhoto = async ({ id }) => {
  if (!await confirmBox("Excluir foto", "Esta foto será apagada do aparelho.", "Excluir")) return;
  await photos.del(id); refresh();
};

// ---- Loja -------------------------------------------------------------------------
views.loja = () => {
  const sexta = daysToFriday() === 0, pen = inPenalty(), g = S.game.gold, dias = daysToFriday();
  const status = pen ? `<p class="bad">Loja trancada: você está na Zona de Penalidade.</p>`
    : sexta ? `<p class="ok">Hoje é sexta. A Loja está aberta.</p>`
      : `<p class="muted">A Loja abre na sexta-feira (em ${dias} ${dias === 1 ? "dia" : "dias"}).</p>`;
  const compras = [...S.purchases].reverse().slice(0, 10);
  return `${header()}<div class="stack">
    ${panel("Loja de sexta", `${status}<p class="small muted">Cada treino rende ${R.treinoOuro} de Ouro. Uma semana perfeita (6 treinos) paga exatamente uma pizza.
      Cada compra libera uma cota de ${R.cotaPorOuro} kcal por Ouro gasto naquele dia (pizza = ${fmt(600 * R.cotaPorOuro)} kcal), sem penalidade na dieta.</p>
      <ul class="list">${S.shop.map(i => `<li><span style="font-size:1.5rem">${i.icone}</span>
        <button class="item" data-act="editShop" data-id="${i.id}"><b>${esc(i.nome)}</b><br><span class="small gold num">◆ ${fmt(i.custo)}</span></button>
        <button class="btn sm primary" data-act="buy" data-id="${i.id}" ${!sexta || pen || g < i.custo ? "disabled" : ""}>Comprar</button></li>`).join("")}</ul>
      <button class="btn ghost sm block" data-act="editShop" data-id="">+ Novo item</button>`, "", `<span class="gold num">◆ ${fmt(g)}</span>`)}
    ${panel("Compras", compras.length ? `<ul class="list small">${compras.map(c => `<li><span class="muted num">${fmtShort(c.date)}</span>
      <span class="grow">${c.icone} ${esc(c.nome)}</span><span class="gold num">−${fmt(c.custo)} ◆</span></li>`).join("")}</ul>` : `<p class="muted">Nenhuma compra ainda.</p>`)}</div>`;
};

actions.buy = async ({ id }) => {
  const i = S.shop.find(x => x.id === id);
  if (daysToFriday() !== 0 || inPenalty() || S.game.gold < i.custo) return;
  if (!await confirmBox("Confirmar compra", `Trocar ${i.custo} de Ouro por: ${i.nome}?`, "Comprar")) return;
  grant(0, -i.custo, `Loja: ${i.nome}`);
  S.purchases.push({ date: today(), nome: i.nome, icone: i.icone, custo: i.custo });
  save(); refresh();
  sysMessage("Recompensa adquirida", `<p style="font-size:3rem;margin:0">${i.icone}</p><p class="mid glow">${esc(i.nome)}</p>
    <p>Cota liberada hoje: <b class="gold">+${fmt(i.custo * R.cotaPorOuro)} kcal</b> acima da meta, sem penalidade.</p>
    <p class="small muted">Aproveite sem culpa: você pagou por isso. Lance em Comida o que comer, para as calorias do dia baterem.</p>`);
};

actions.editShop = ({ id }) => {
  const i = S.shop.find(x => x.id === id);
  modal(`<div class="ptitle"><h2>${i ? "Editar item" : "Novo item"}</h2></div>
    <form data-act="saveShop"><input type="hidden" name="id" value="${id}">
      <div class="row"><div class="field" style="width:80px"><label for="si">Ícone</label><input id="si" name="icone" maxlength="4" value="${i?.icone || "🍩"}"></div>
      <div class="field grow"><label for="sn">Nome</label><input id="sn" name="nome" required value="${esc(i?.nome || "")}"></div></div>
      <div class="field"><label for="sc">Custo em Ouro</label><input id="sc" name="custo" inputmode="numeric" required value="${i?.custo ?? ""}"></div>
      <div class="row">${i ? `<button type="button" class="btn danger" data-act="delShop" data-id="${id}">Excluir</button>` : ""}<button class="btn primary grow">Salvar</button></div></form>`);
};
actions.saveShop = d => {
  const custo = Math.round(num(d.custo) ?? -1);
  if (custo < 0) return toast("Informe o custo.");
  const i = S.shop.find(x => x.id === d.id);
  if (i) Object.assign(i, { nome: d.nome.trim(), icone: d.icone || "🍩", custo });
  else S.shop.push({ id: uid(), nome: d.nome.trim(), icone: d.icone || "🍩", custo });
  save(); closeModal(); refresh();
};
actions.delShop = ({ id }) => { S.shop = S.shop.filter(x => x.id !== id); save(); closeModal(); refresh(); };

export { monthDebt };
