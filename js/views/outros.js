// Mais, Medidas (diárias e semanais), Fotos e Loja
import { views, actions, refresh } from "../core.js";
import { S, day, save, photos } from "../store.js";
import { today, esc, fmt, num, fmtDate, fmtShort, signed, shrinkImage, uid, daysBetween, $ } from "../util.js";
import { header, panel, modal, closeModal, toast, showEvents, confirmBox, sysMessage } from "../ui.js";
import { nativo } from "../native.js";
import { weightOn } from "../game.js";
import { grant, R, inPenalty, daysToShop, pendingDebts, monthDebt, BONUS, CAMPO, bonusWeek, cleanWeek, dietWeek, weekStart, weekEnd } from "../game.js";

// ---- Mais -----------------------------------------------------------------------
views.mais = () => {
  const item = (rota, ic, nome, desc, extra = "") => `<li><span style="font-size:1.4rem">${ic}</span>
    <a class="grow" href="#/${rota}" style="text-decoration:none;color:inherit"><b>${nome}</b><br><span class="small muted">${desc}</span></a>${extra}<span class="muted">›</span></li>`;
  const pend = pendingDebts().length;
  const corpos = (S.corpos || []).length, portao = Object.values(S.portoes || {}).some(p => p.status === "aberto" || p.status === "ativo");
  return `${header()}<div class="stack">${panel("Menu", `<ul class="list">
    ${item("exercito", "🗡️", "Exército das Sombras", S.classe ? "Sombras, corpos e invocação" : "Classe e corpos guardados", corpos ? `<span class="chip">${corpos}</span>` : "")}
    ${item("arsenal", "⚔️", "Arsenal", "Armas, livros, anéis e o Manto (HP e folga)", typeof S.hp === "number" && S.hp >= 100 ? `<span class="chip hpv">Folga</span>` : "")}
    ${item("titulos", "🏆", "Sala dos Títulos", "Títulos por raridade, do Comum ao Mítico")}
    ${item("portao", "🌀", "Dungeons", "Uma por semana, sem aviso; e as do Inferno e do Trono", portao ? `<span class="chip warn">Aberta</span>` : "")}
    ${item("dungeons", "🗂️", "Registro de Dungeons", "A coleção das dungeons vencidas", (S.dungeons || []).length ? `<span class="chip">${S.dungeons.length}</span>` : "")}
    ${item("impulso", "⚡", "Impulso", "Bateu a vontade? Um desafio na hora")}
    ${item("contadores", "🔢", "Contadores", "Quantas flexões, agachamentos… você já fez")}
    ${item("relatorio", "📊", "Relatório semanal", "A sua semana comparada com a anterior")}
    ${item("extras", "🚶", "Atividades extras", "Caminhada, bike, esporte... somam no gasto do dia", S.tracking ? `<span class="chip warn">Ao vivo</span>` : "")}
    ${item("porque", "🔥", "Meu porquê", "As fotos e as mensagens do ritual do dia")}
    ${item("condicao", "🌙", "Condição", "Sono, foco, energia e celular na cama")}
    ${item("medidas", "📏", "Medidas", "Peso e abdômen diários, medidas semanais")}
    ${item("fotos", "📸", "Fotos", "Registro semanal e antes × depois")}
    ${item("loja", "🛒", "Loja", "Sexta a domingo: troque Ouro pelo direito de comer besteira")}
    ${item("penalidade", "⚠️", "Penalidades", "Multas por PIX e pessoas do grupo", pend ? `<span class="chip bad">${pend}</span>` : "")}
    ${item("historico", "📜", "Registro do Sistema", "Histórico de XP e Ouro")}
    ${item("bloqueio", "🔒", nativo ? "Bloqueio de apps" : "App Android", nativo ? "Zona de Penalidade e toque de recolher (20h às 8h)" : "Bloqueio de apps na Zona de Penalidade e lembretes")}
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
        <p class="small muted">Meça sempre no mesmo horário, de preferência ao acordar. Registrar os dois hoje vale +${R.medidasXp} XP (e a Condição de ontem, mais +${R.condicaoXp}).</p>`)}
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
  photoCache = (await photos.all()).filter(p => p.tipo !== "prova" && !String(p.tipo || "").startsWith("ritual")).sort((a, b) => b.date.localeCompare(a.date) || a.angulo.localeCompare(b.angulo));
  const area = $("#photo-area"); if (!area) return;
  const dates = [...new Set(photoCache.map(p => p.date))];
  // Antes × depois: escolha qualquer foto de cada lado (sempre visível)
  const rotulo = p => `${fmtDate(p.date, { day: "2-digit", month: "2-digit", year: "2-digit" })} · ${p.angulo}`;
  const antiga = [...photoCache].reverse().find(p => p.angulo === "frente") || photoCache[photoCache.length - 1];
  const nova = antiga && (photoCache.find(p => p.angulo === antiga.angulo && p.date !== antiga.date) || photoCache.find(p => p !== antiga));
  const opts = sel => photoCache.map(p => `<option value="${p.id}" ${p === sel ? "selected" : ""}>${esc(rotulo(p))}</option>`).join("");
  const compare = panel("Antes × depois", dates.length > 1
    ? `<div class="grid2"><select id="cA" aria-label="Foto da esquerda (antes)">${opts(antiga)}</select><select id="cB" aria-label="Foto da direita (depois)">${opts(nova)}</select></div>
       <div class="compare" id="cmp" style="margin-top:8px"></div><p class="small center" id="cmp-dif" style="margin-bottom:0"></p>
       <p class="small muted center" style="margin:4px 0 0">Toque numa foto para ampliar.</p>`
    : `<p class="muted small" style="margin:0">Compare duas fotos lado a lado, com o peso de cada data. Adicione fotos em pelo menos <b>duas datas diferentes</b> para usar.
       ${nativo ? "<br>As fotos não vêm no backup: adicione aqui as que quiser manter." : ""}</p>`);
  area.innerHTML = `<div class="stack">${compare}${dates.length ? dates.map(d => panel(fmtDate(d), `<div class="photos">
    ${photoCache.filter(p => p.date === d).map(p => `<figure><img src="${urlOf(p.blob)}" alt="Foto de ${p.angulo} em ${fmtDate(d)}" loading="lazy" data-act="zoomPhoto" data-id="${p.id}">
      <figcaption class="row between"><span>${esc(p.angulo)}</span><button class="btn sm danger" style="min-height:0;padding:0 6px" data-act="delPhoto" data-id="${p.id}" aria-label="Excluir foto">✕</button></figcaption></figure>`).join("")}</div>`,
    "", S.days[d]?.peso ? `<span class="small muted num">${fmt(S.days[d].peso, 1)} kg</span>` : "")).join("") : `<p class="muted center">Nenhuma foto ainda.</p>`}</div>`;
  const cmp = $("#cmp");
  if (!cmp) return;
  const pesoTxt = d => S.days[d]?.peso ? `${fmt(S.days[d].peso, 1)} kg` : `≈ ${fmt(weightOn(d), 1)} kg`;
  const draw = () => {
    const [pa, pb] = [$("#cA").value, $("#cB").value].map(id => photoCache.find(x => x.id === id));
    cmp.innerHTML = [pa, pb].map(p => `<div style="display:block;position:relative">
      <img src="${urlOf(p.blob)}" alt="Foto de ${p.angulo} em ${fmtDate(p.date)}" data-act="zoomPhoto" data-id="${p.id}" style="cursor:zoom-in">
      <span class="small" style="position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);padding:3px 6px">${fmtDate(p.date)} · ${esc(p.angulo)}<br><b class="num">${pesoTxt(p.date)}</b></span></div>`).join("");
    const [x, y] = pa.date <= pb.date ? [pa, pb] : [pb, pa];
    const dias = daysBetween(x.date, y.date), dp = weightOn(y.date) - weightOn(x.date);
    const ab = d => Object.keys(S.days).filter(k => k <= d && S.days[k].abdomen).sort().pop();
    const a1 = ab(x.date), a2 = ab(y.date), dab = a1 && a2 && a1 !== a2 ? S.days[a2].abdomen - S.days[a1].abdomen : null;
    $("#cmp-dif").innerHTML = dias ? `<b>${dias} dias</b> entre as fotos · peso <b class="${dp <= 0 ? "ok" : "warn"}">${signed(dp)} kg</b>${dab != null ? ` · abdômen <b class="${dab <= 0 ? "ok" : "warn"}">${signed(dab)} cm</b>` : ""}` : "Mesma data";
  };
  ["cA", "cB"].forEach(id => { $("#" + id).onchange = draw; });
  draw();
};

actions.zoomPhoto = ({ id }) => {
  const p = photoCache.find(x => x.id === id); if (!p) return;
  modal(`<div class="ptitle"><h2>${fmtDate(p.date)} · ${esc(p.angulo)}</h2><button class="btn sm ghost" data-close aria-label="Fechar">✕</button></div>
    <img src="${urlOf(p.blob)}" alt="Foto de ${p.angulo} em ${fmtDate(p.date)}" style="width:100%;display:block" data-close>`);
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
  const dias = daysToShop(), aberta = dias === 0, pen = inPenalty(), g = S.game.gold;
  const status = pen ? `<p class="bad">Loja trancada: você está na Zona de Penalidade.</p>`
    : aberta ? `<p class="ok">A Loja está aberta hoje.</p>`
      : `<p class="muted">A Loja abre de sexta a domingo (próxima abertura em ${dias} ${dias === 1 ? "dia" : "dias"}).</p>`;
  const compras = [...S.purchases].reverse().slice(0, 10);
  return `${header()}<div class="stack">
    ${panel("Loja", `${status}<p class="small muted">Cada treino rende ${R.treinoOuro} de Ouro. Uma semana perfeita (6 treinos) paga exatamente uma pizza.
      Cada compra libera uma cota de ${R.cotaPorOuro} kcal por Ouro gasto naquele dia (pizza = ${fmt(600 * R.cotaPorOuro)} kcal), sem penalidade na dieta.</p>
      <ul class="list">${S.shop.map(i => `<li><span style="font-size:1.5rem">${i.icone}</span>
        <button class="item" data-act="editShop" data-id="${i.id}"><b>${esc(i.nome)}</b><br><span class="small gold num">◆ ${fmt(i.custo)}</span></button>
        <button class="btn sm primary" data-act="buy" data-id="${i.id}" ${!aberta || pen || g < i.custo ? "disabled" : ""}>Comprar</button></li>`).join("")}</ul>
      <button class="btn ghost sm block" data-act="editShop" data-id="">+ Novo item</button>`, "", `<span class="gold num">◆ ${fmt(g)}</span>`)}
    ${panel("Bônus de Ouro", (() => {
      const dw = dietWeek(), feitos = dw.filter(Boolean).length, passados = dw.filter(x => x !== null).length, limpa = cleanWeek();
      return `<p class="small muted" style="margin-top:0">Ouro extra para quem já está cumprindo as missões. Semana do jogo: ${fmtDate(weekStart(), { day: "2-digit", month: "2-digit" })} a ${fmtDate(weekEnd(), { day: "2-digit", month: "2-digit" })}. Fora da Zona de Penalidade, até ${BONUS.teto} de Ouro por semana.</p>
      <ul class="list small">
        <li><span class="grow">Dungeon de Campo: ${CAMPO.corrida.km} km correndo, ${CAMPO.andando.km} km andando ou ${CAMPO.bike.km} km de bike no dia, pelo GPS, depois da missão <span class="muted">(semana com falta: +${BONUS.gpsOuroSeq} depois de ${BONUS.seguidos} missões seguidas)</span></span><b class="gold">+${BONUS.gpsOuro}</b></li>
        <li><span class="grow">Semana inteira dentro da meta de calorias <span class="muted">(${passados ? `${feitos} de ${passados} dia${passados > 1 ? "s" : ""} fechado${passados > 1 ? "s" : ""}${feitos < passados ? ": esta semana já não vale" : ""}` : "começa a contar amanhã"})</span></span><b class="gold">+${BONUS.dietaOuro}</b></li></ul>
      <div class="row between small"><span class="${limpa ? "ok" : "bad"}">${limpa ? "Semana limpa ✔" : "Semana com falta: só a Dungeon de Campo, com valor reduzido"}</span><b class="gold num">${bonusWeek()}/${BONUS.teto}</b></div>
      <a class="btn sm ghost block" style="margin-top:8px" href="#/extras">Rastrear atividade</a>`;
    })())}
    ${panel("Compras", compras.length ? `<ul class="list small">${compras.map(c => `<li><span class="muted num">${fmtShort(c.date)}</span>
      <span class="grow">${c.icone} ${esc(c.nome)}</span><span class="gold num">−${fmt(c.custo)} ◆</span></li>`).join("")}</ul>` : `<p class="muted">Nenhuma compra ainda.</p>`)}</div>`;
};

actions.buy = async ({ id }) => {
  const i = S.shop.find(x => x.id === id);
  if (daysToShop() !== 0 || inPenalty() || S.game.gold < i.custo) return;
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
