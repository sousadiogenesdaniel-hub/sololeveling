// Ritual do dia: na primeira abertura do dia, antes de qualquer aviso, o Sistema lembra por que você começou.
// Três fotos de frente (Antes, que você sobe; Agora, a foto de frente mais recente de Fotos; Meta, que você sobe),
// a linha do que falta e do próximo passo, uma mensagem sua escolhida pelo contexto do dia e o botão "Eu lembro",
// que só ativa depois de 5 s e precisa ser segurado. As mensagens e as fotos ficam só neste aparelho.
import { S, save, photos } from "./store.js";
import { today, addDays, daysBetween, esc, fmt, fmtDate } from "./util.js";
import { inPenalty, isObligated, isRestDay, levelInfo, weightOn, weekStart } from "./game.js";
import { workoutFor } from "./tracks.js";
import { portaoAberto, nomeados } from "./portoes.js";

export const CONTEXTOS = {
  geral: { nome: "Geral", desc: "Sorteada no dia a dia." },
  falta: { nome: "Depois de uma falta", desc: "No dia seguinte a uma missão perdida." },
  penalidade: { nome: "Zona de Penalidade", desc: "Enquanto estiver na Zona. As de até 90 caracteres também vão para a tela de bloqueio." },
  perfeita: { nome: "Semana perfeita", desc: "No primeiro dia depois de uma semana sem falta." },
  teste: { nome: "Dia de Teste de Rank ou Dungeon", desc: "Com Dungeon aberta, Dungeon nomeada marcada ou Dia de Teste." },
  noite: { nome: "Noite / toque de recolher", desc: "Ritual à noite. As de até 90 caracteres também vão para a tela do toque de recolher." },
};
export const CURTA = 90, ESPERA_S = 5, SEGURAR_MS = 1500;
export const ritual = () => (S.ritual ||= { msgs: [], ultimas: [] });
export const curtas = ctx => ritual().msgs.filter(m => m.ctx === ctx && m.txt.length <= CURTA).map(m => m.txt);

// Contextos que valem hoje, do mais forte para o mais fraco
export function contextosHoje(t = today(), hora = new Date().getHours()) {
  const ctx = [], ontem = addDays(t, -1);
  if (inPenalty()) ctx.push("penalidade");
  if (isObligated(ontem) && !S.days[ontem]?.workout?.done) ctx.push("falta");
  const nm = Object.values(nomeados()).some(g => (g.status === "marcado" || g.status === "ativo") && g.dia === t);
  if (portaoAberto() || nm || S.days[t]?.modo === "teste") ctx.push("teste");
  const ws = weekStart(t), pws = addDays(ws, -7), pwe = addDays(ws, -1);
  const desde = S.trackSince || S.track?.startDate;
  if (t === ws && desde && desde <= pws && !S.debts.some(d => d.date >= pws && d.date <= pwe)) ctx.push("perfeita");
  if (hora >= 20 || hora < 5) ctx.push("noite");
  return [...new Set(ctx)];
}

// Mensagem do dia: a do contexto mais forte que tiver alguma; sem nenhuma, uma Geral. Evita as últimas 3.
export function mensagemDoDia(t = today()) {
  const r = ritual(), ctxs = [...contextosHoje(t), "geral"];
  for (const c of ctxs) {
    const lista = r.msgs.filter(m => m.ctx === c); if (!lista.length) continue;
    const novas = lista.filter(m => !r.ultimas.includes(m.id));
    const pool = novas.length ? novas : lista;
    return { msg: pool[Math.floor(Math.random() * pool.length)], ctx: c };
  }
  return null;
}

// Fotos: Antes e Meta você sobe (tipo "ritual-antes" / "ritual-meta"); Agora é a de frente mais recente de Fotos
export async function fotosRitual() {
  const todas = await photos.all();
  const antes = todas.find(p => p.tipo === "ritual-antes") || null, meta = todas.find(p => p.tipo === "ritual-meta") || null;
  const agora = todas.filter(p => p.tipo === "progresso" && p.angulo === "frente").sort((a, b) => b.date.localeCompare(a.date) || b.criado - a.criado)[0] || null;
  return { antes, agora, meta };
}
export const configurado = () => ritual().msgs.length > 0 || !!ritual().temFoto;

// Linha do que falta e do próximo passo (o contraste: onde você está, para onde vai, o que fazer hoje)
function linhaContraste(t) {
  const p = S.profile || {}, li = levelInfo(), partes = [];
  const desde = S.trackSince || S.track?.startDate || p.criado;
  if (desde && desde <= t) partes.push(`Dia ${daysBetween(desde, t) + 1} da jornada`);
  const missoes = Object.values(S.days).filter(d => d.workout?.done).length;
  if (missoes) partes.push(`${missoes} missõe${missoes > 1 ? "s" : ""}`);
  if (p.metaPeso) { const falta = weightOn(t) - p.metaPeso; if (falta > 0.05) partes.push(`faltam ${fmt(falta, 1)} kg`); }
  partes.push(li.rank === "S" ? "rank S" : `rank ${li.rank} → S`);
  const plano = !S.track ? null : isRestDay(t) ? "descanso" : workoutFor(t)?.titulo;
  return { dados: partes.join(" · "), hoje: plano ? `Hoje: ${plano === "descanso" ? "dia de descanso" : esc(plano)}` : "Hoje: escolha a sua trilha" };
}

const legenda = (rot, foto, extra) => `<figcaption><b>${rot}</b>${foto?.date ? ` · ${fmtDate(foto.date, { month: "short", year: "numeric" }).replace(".", "")}` : ""}${extra ? ` · ${extra}` : ""}</figcaption>`;

// Mostra o ritual (ou a prévia, em Meu porquê). Resolve quando o jogador segura "Eu lembro".
export async function mostrarRitual({ previa = false } = {}) {
  const t = today(), r = ritual(), f = await fotosRitual();
  const m = mensagemDoDia(t), c = linhaContraste(t), p = S.profile || {};
  const urls = [];
  const img = (foto, alt) => { if (!foto?.blob) return `<div class="rt-vazio">sem foto</div>`; const u = URL.createObjectURL(foto.blob); urls.push(u); return `<img src="${u}" alt="${alt}">`; };
  const pesoDe = foto => foto?.peso ? `${fmt(foto.peso, 1)} kg` : foto?.date && S.days[foto.date]?.peso ? `${fmt(S.days[foto.date].peso, 1)} kg` : "";
  const temFotos = f.antes || f.agora || f.meta;
  const o = document.createElement("div");
  o.className = "ritual"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-label", "Ritual do dia");
  o.innerHTML = `<div class="rt-in">
    <p class="rt-sys">[ O SISTEMA ]</p><h2 class="rt-tit">Lembre por que você começou.</h2>
    ${temFotos ? `<div class="rt-fotos">
      <figure>${img(f.antes, "Antes")}${legenda("Antes", f.antes, pesoDe(f.antes))}</figure>
      <figure>${img(f.agora, "Agora")}${legenda("Agora", f.agora, pesoDe(f.agora))}</figure>
      <figure class="meta">${img(f.meta, "Meta")}<figcaption><b>Meta</b> · rank S${p.metaPeso ? ` · ${fmt(p.metaPeso, 0)} kg` : ""}</figcaption></figure></div>` : ""}
    <p class="rt-dados">${c.dados}<br><b>${c.hoje}</b></p>
    <blockquote class="rt-msg">${m ? esc(m.msg.txt) : `Escreva o seu porquê em <b>Perfil → Meu porquê</b>. Ele aparece aqui todo dia.`}</blockquote>
    <button type="button" class="btn primary block rt-botao" id="rt-ok" disabled aria-label="Eu lembro: segure o botão">
      <span class="rt-fill"></span><span class="rt-txt">Leia com calma… ${ESPERA_S}</span></button>
    ${previa ? `<button type="button" class="btn ghost sm block" id="rt-sair" style="margin-top:8px">Fechar a prévia</button>` : ""}</div>`;
  document.body.append(o);
  o.querySelector(".rt-in").focus?.();
  const btn = o.querySelector("#rt-ok"), txt = o.querySelector(".rt-txt"), fill = o.querySelector(".rt-fill");
  return new Promise(resolve => {
    const fim = () => { urls.forEach(URL.revokeObjectURL); o.classList.add("out"); setTimeout(() => o.remove(), 250); resolve(true); };
    o.querySelector("#rt-sair")?.addEventListener("click", fim);
    let falta = ESPERA_S;
    const tick = setInterval(() => {
      falta--;
      if (falta > 0) { txt.textContent = `Leia com calma… ${falta}`; return; }
      clearInterval(tick); btn.disabled = false; txt.textContent = "Segure: Eu lembro";
    }, 1000);
    let ini = 0, raf = 0;
    const solta = () => { cancelAnimationFrame(raf); ini = 0; fill.style.width = "0%"; };
    const passo = () => {
      const k = Math.min(1, (performance.now() - ini) / SEGURAR_MS);
      fill.style.width = `${k * 100}%`;
      if (k < 1) { raf = requestAnimationFrame(passo); return; }
      navigator.vibrate?.([30, 40, 120]);
      if (!previa) {
        r.dia = t;
        if (m) { r.ultimas = [m.msg.id, ...r.ultimas.filter(id => id !== m.msg.id)].slice(0, 3); }
        save();
      }
      fim();
    };
    const segura = e => { if (btn.disabled || ini) return; e.preventDefault(); ini = performance.now(); raf = requestAnimationFrame(passo); };
    btn.addEventListener("pointerdown", segura);
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => btn.addEventListener(ev, solta));
    btn.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) segura(e); });
    btn.addEventListener("keyup", e => { if (e.key === "Enter" || e.key === " ") solta(); });
    btn.addEventListener("contextmenu", e => e.preventDefault());
  });
}

// Na primeira abertura do dia (com algo configurado): o ritual vem antes de qualquer outro aviso
export async function ritualDoDia() {
  if (!S.profile || ritual().dia === today() || !configurado()) return false;
  await mostrarRitual();
  return true;
}
