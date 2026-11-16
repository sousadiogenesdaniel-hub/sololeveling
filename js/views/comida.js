// Comida: alimentação de hoje (herda a Dieta) e edição da Dieta padrão
import { views, actions, refresh } from "../core.js";
import { S, day, save } from "../store.js";
import { today, esc, fmt, num, uid, norm, $, fmtDate, addDays } from "../util.js";
import { header, panel, modal, closeModal, toast, confirmBox } from "../ui.js";
import { mealsOf, totals, spent } from "../game.js";

let taco = null;
async function foods() {
  if (!taco) taco = (await (await fetch("data/taco.json")).json()).alimentos;
  return [...S.foods, ...taco];
}

let viewDate = null;                     // data exibida na aba "dia"
const curDate = () => viewDate || today();
const clone = o => JSON.parse(JSON.stringify(o));

// Lista de refeições que está sendo editada. No dia, copia a Dieta na primeira edição.
function target(ctx, write = false) {
  if (ctx === "dieta") return S.diet.meals;
  const d = day(curDate());
  if (write && !d.meals) d.meals = clone(S.diet.meals);
  return d.meals || S.diet.meals;
}

function mealsHtml(ctx) {
  const meals = target(ctx);
  return meals.map(m => {
    const t = totals([m]);
    return panel(m.nome, `
      ${m.itens.length ? `<ul class="list">${m.itens.map(i => `<li>
        <button class="item" data-act="editItem" data-ctx="${ctx}" data-meal="${m.id}" data-item="${i.id}">
          <div>${esc(i.nome)}</div><div class="small muted">${esc(i.rotulo)}</div></button>
        <span class="num">${fmt(i.kcal)} kcal</span></li>`).join("")}</ul>` : `<p class="muted small">Nada aqui ainda.</p>`}
      <div class="row" style="margin-top:8px">
        <button class="btn sm grow" data-act="addFood" data-ctx="${ctx}" data-meal="${m.id}">+ Alimento</button>
        <button class="btn sm ghost" data-act="editMeal" data-ctx="${ctx}" data-meal="${m.id}" aria-label="Editar refeição ${esc(m.nome)}">✎</button>
      </div>`, "", `<span class="num small muted">${fmt(t.kcal)} kcal</span>`);
  }).join("") + `<button class="btn ghost block" data-act="addMeal" data-ctx="${ctx}">+ Nova refeição</button>`;
}

function summary(meals, date) {
  const t = totals(meals), meta = S.profile.metaKcal;
  const pct = meta ? Math.min(100, t.kcal / meta * 100) : 0;
  return `<div class="row between"><span class="mid num">${fmt(t.kcal)} kcal</span>
      <span class="small muted">${meta ? `meta ${fmt(meta)} kcal` : "sem meta"}${date ? ` · gasto ~${fmt(spent(date))}` : ""}</span></div>
    ${meta ? `<div class="bar ${t.kcal > meta ? "over" : ""}" style="margin:6px 0"><i style="width:${pct}%"></i></div>` : ""}
    <div class="small muted num">P ${fmt(t.p)} g · C ${fmt(t.c)} g · G ${fmt(t.gord)} g</div>`;
}

views.comida = arg => {
  const tab = arg === "dieta" ? "dieta" : "dia";
  const tabs = `<div class="tabs"><a class="btn sm ${tab === "dia" ? "on" : ""}" href="#/comida">Dia</a>
    <a class="btn sm ${tab === "dieta" ? "on" : ""}" href="#/comida/dieta">Dieta padrão</a></div>`;
  if (tab === "dieta") {
    return `${header()}${tabs}<div class="stack">
      ${panel("Dieta padrão", `<p class="small muted" style="margin-top:0">Esta dieta entra sozinha em todos os dias novos. Mudar aqui não altera dias que você já editou nem dias passados.</p>${summary(S.diet.meals)}`)}
      ${mealsHtml("dieta")}</div>`;
  }
  const d = curDate(), custom = !!S.days[d]?.meals, isToday = d === today();
  return `${header()}${tabs}<div class="stack">
    ${panel(isToday ? "Hoje" : fmtDate(d), `
      <div class="row between" style="margin-bottom:8px">
        <button class="btn sm ghost" data-act="foodDay" data-n="-1" aria-label="Dia anterior">◀</button>
        <span class="chip ${custom ? "warn" : ""}">${custom ? "Dia editado" : "Seguindo a dieta"}</span>
        <button class="btn sm ghost" data-act="foodDay" data-n="1" ${isToday ? "disabled" : ""} aria-label="Próximo dia">▶</button></div>
      ${summary(mealsOf(d), d)}
      ${custom && !S.days[d].closed ? `<button class="btn sm ghost block" style="margin-top:10px" data-act="resetDay">Voltar para a dieta padrão</button>` : ""}`)}
    ${mealsHtml("dia")}</div>`;
};

actions.foodDay = ({ n }) => { viewDate = addDays(curDate(), +n); if (viewDate >= today()) viewDate = null; refresh(); };
actions.resetDay = async () => {
  if (!await confirmBox("Voltar para a dieta", "As alterações feitas neste dia serão descartadas.", "Descartar")) return;
  delete day(curDate()).meals; save(); refresh();
};

// ---- refeições --------------------------------------------------------------------
actions.addMeal = ({ ctx }) => mealForm(ctx, null);
actions.editMeal = ({ ctx, meal }) => mealForm(ctx, meal);
function mealForm(ctx, mealId) {
  const m = target(ctx).find(x => x.id === mealId);
  modal(`<div class="ptitle"><h2>${m ? "Editar refeição" : "Nova refeição"}</h2></div>
    <form data-act="saveMeal"><input type="hidden" name="ctx" value="${ctx}"><input type="hidden" name="meal" value="${mealId || ""}">
      <div class="field"><label for="mn">Nome</label><input id="mn" name="nome" required value="${esc(m?.nome || "")}"></div>
      <div class="row">${m ? `<button type="button" class="btn danger" data-act="delMeal" data-ctx="${ctx}" data-meal="${mealId}">Excluir</button>` : ""}
      <button class="btn primary grow">Salvar</button></div></form>`);
}
actions.saveMeal = ({ ctx, meal, nome }) => {
  const meals = target(ctx, true), m = meals.find(x => x.id === meal);
  if (m) m.nome = nome.trim(); else meals.push({ id: uid(), nome: nome.trim(), itens: [] });
  save(); closeModal(); refresh();
};
actions.delMeal = ({ ctx, meal }) => {
  const meals = target(ctx, true);
  meals.splice(meals.findIndex(x => x.id === meal), 1);
  save(); closeModal(); refresh();
};

// ---- itens ------------------------------------------------------------------------
function makeItem(food, gramas, rotulo) {
  const k = gramas / 100, r = v => Math.round(v * k * 10) / 10;
  return { id: uid(), nome: food.nome, base: { kcal: food.kcal, p: food.p, c: food.c, g: food.g, porcao_g: food.porcao_g, porcao_nome: food.porcao_nome },
    gramas, rotulo, kcal: Math.round(food.kcal * k), p: r(food.p), c: r(food.c), gord: r(food.g) };
}

actions.addFood = async ({ ctx, meal }) => {
  const all = await foods();
  const o = modal(`<div class="ptitle"><h2>Adicionar alimento</h2><button class="btn sm ghost" data-close aria-label="Fechar">✕</button></div>
    <div class="field"><label for="fs">Buscar (tabela TACO e seus alimentos)</label><input id="fs" placeholder="ex.: arroz, frango, banana" autocomplete="off"></div>
    <ul class="list" id="fres"></ul>
    <button class="btn ghost block sm" data-act="newFood" data-ctx="${ctx}" data-meal="${meal}">+ Cadastrar alimento pelo rótulo</button>`);
  const input = $("#fs", o), res = $("#fres", o);
  const show = () => {
    const q = norm(input.value.trim()).split(/\s+/).filter(Boolean);
    const hits = q.length ? all.filter(f => { const n = norm(f.nome); return q.every(w => n.includes(w)); }).slice(0, 25) : S.foods.slice(0, 25);
    res.innerHTML = hits.map(f => `<li><button class="item" data-fid="${f.id}">
      <div>${esc(f.nome)}</div><div class="small muted">${fmt(f.kcal)} kcal / 100 g${f.porcao_nome ? ` · 1 ${esc(f.porcao_nome)} = ${f.porcao_g} g` : ""}</div></button></li>`).join("")
      || `<li class="muted small">${q.length ? "Nada encontrado." : "Digite para buscar."}</li>`;
  };
  input.oninput = show; show(); input.focus();
  res.onclick = e => {
    const b = e.target.closest("[data-fid]"); if (!b) return;
    qtyForm(ctx, meal, all.find(f => String(f.id) === b.dataset.fid), null);
  };
};

// Formulário de quantidade (para adicionar ou editar um item)
function qtyForm(ctx, mealId, food, item) {
  const hasPortion = !!food.porcao_g;
  const usingPortion = item ? item.un === "porcao" : hasPortion;
  const o = modal(`<div class="ptitle"><h2>${esc(food.nome)}</h2></div>
    <form id="qf"><div class="row">
      <div class="field grow"><label for="qq">Quantidade</label><input id="qq" name="q" inputmode="decimal" required value="${item ? item.q : hasPortion ? 1 : 100}"></div>
      <div class="field grow"><label for="qu">Unidade</label><select id="qu" name="un">
        ${hasPortion ? `<option value="porcao" ${usingPortion ? "selected" : ""}>${esc(food.porcao_nome)} (${food.porcao_g} g)</option>` : ""}
        <option value="g" ${usingPortion ? "" : "selected"}>gramas</option></select></div></div>
      <p class="center mid num glow" id="qk"></p>
      <div class="row">${item ? `<button type="button" class="btn danger" id="qdel">Remover</button>` : ""}
      <button class="btn primary grow">${item ? "Salvar" : "Adicionar"}</button></div></form>`);
  const form = $("#qf", o);
  const calc = () => {
    const q = num(form.q.value) || 0, un = form.un.value;
    const gramas = un === "porcao" ? q * food.porcao_g : q;
    const rotulo = un === "porcao" ? `${fmt(q, q % 1 ? 1 : 0)} ${food.porcao_nome} (${fmt(gramas)} g)` : `${fmt(gramas)} g`;
    return { q, un, gramas, rotulo };
  };
  const upd = () => { $("#qk", o).textContent = `${fmt(food.kcal * calc().gramas / 100)} kcal`; };
  form.oninput = upd; upd();
  form.onsubmit = e => {
    e.preventDefault();
    const { q, un, gramas, rotulo } = calc();
    if (!(gramas > 0)) return toast("Informe uma quantidade válida.");
    const meals = target(ctx, true), m = meals.find(x => x.id === mealId);
    const novo = { ...makeItem(food, gramas, rotulo), q, un };
    if (item) { novo.id = item.id; m.itens[m.itens.findIndex(x => x.id === item.id)] = novo; } else m.itens.push(novo);
    save(); closeModal(); refresh();
  };
  if (item) $("#qdel", o).onclick = () => {
    const m = target(ctx, true).find(x => x.id === mealId);
    m.itens.splice(m.itens.findIndex(x => x.id === item.id), 1);
    save(); closeModal(); refresh();
  };
}

actions.editItem = ({ ctx, meal, item }) => {
  const it = target(ctx).find(m => m.id === meal).itens.find(i => i.id === item);
  qtyForm(ctx, meal, { nome: it.nome, ...it.base }, it);
};

actions.newFood = ({ ctx, meal }) => {
  modal(`<div class="ptitle"><h2>Novo alimento</h2></div>
    <p class="small muted">Copie os valores do rótulo para uma porção. Ele fica salvo em "seus alimentos" para as próximas vezes.</p>
    <form data-act="saveFood"><input type="hidden" name="ctx" value="${ctx}"><input type="hidden" name="meal" value="${meal}">
      <div class="field"><label for="nf1">Nome</label><input id="nf1" name="nome" required></div>
      <div class="row"><div class="field grow"><label for="nf2">Porção (g ou ml)</label><input id="nf2" name="porcao" inputmode="decimal" required></div>
      <div class="field grow"><label for="nf3">Calorias (kcal)</label><input id="nf3" name="kcal" inputmode="decimal" required></div></div>
      <div class="row"><div class="field grow"><label for="nf4">Proteína (g)</label><input id="nf4" name="p" inputmode="decimal"></div>
      <div class="field grow"><label for="nf5">Carbo (g)</label><input id="nf5" name="c" inputmode="decimal"></div>
      <div class="field grow"><label for="nf6">Gordura (g)</label><input id="nf6" name="g" inputmode="decimal"></div></div>
      <button class="btn primary block">Salvar e adicionar</button></form>`);
};
actions.saveFood = d => {
  const porcao = num(d.porcao), kcal = num(d.kcal);
  if (!(porcao > 0) || kcal === null) return toast("Preencha porção e calorias.");
  const k = 100 / porcao, v = x => Math.round((num(x) || 0) * k * 10) / 10;
  const food = { id: "m" + uid(), nome: d.nome.trim(), kcal: v(d.kcal), p: v(d.p), c: v(d.c), g: v(d.g), porcao_g: porcao, porcao_nome: "porção" };
  S.foods.unshift(food);
  const m = target(d.ctx, true).find(x => x.id === d.meal);
  m.itens.push({ ...makeItem(food, porcao, `1 porção (${fmt(porcao)} g)`), q: 1, un: "porcao" });
  save(); closeModal(); refresh();
};
