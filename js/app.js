// O Sistema — inicialização, rotas e delegação de eventos
import { $, $$, today } from "./util.js";
import { S, load, save } from "./store.js";
import { actions, views, setRender } from "./core.js";
import { processDays, inPenalty, applyAutoKcal, migrarCurva, levelInfo } from "./game.js";
import { aplicarFoco } from "./tracks.js";
import { showEvents, toast, sysMessage, aviso } from "./ui.js";
import { celebrate } from "./fx.js";
import "./views/home.js";
import "./views/treino.js";
import "./views/comida.js";
import "./views/outros.js";
import "./views/evolucao.js";
import "./views/penalidade.js";
import "./views/condicao.js";
import "./views/bloqueio.js";
import "./views/avaliacao.js";
import "./views/exercito.js";
import "./views/titulos.js";
import "./views/portao.js";
import "./views/arsenal.js";
import "./cartao.js";
import { avisosDoSistema } from "./views/recompensas-ui.js";
import { syncNative, keepScreenOn } from "./native.js";
import { startWatch } from "./views/extras.js";
import { onboarding } from "./views/perfil.js";

const TAB_OF = { inicio: "inicio", treino: "treino", comida: "comida", evolucao: "evolucao" }; // o resto fica em "Mais"

function render() {
  const app = $("#app"), nav = $("#nav");
  document.body.classList.toggle("penalty", !!S.profile && inPenalty());
  aplicarTema();
  if (!S.profile) { nav.classList.add("hidden"); app.innerHTML = onboarding(); return; }
  nav.classList.remove("hidden");
  if (aplicarFoco()) save(); // com 2+ trilhas: a trilha do treino de hoje
  const [rota = "inicio", arg] = location.hash.replace(/^#\/?/, "").split("/");
  const view = views[rota] || views.inicio;
  const y = window.scrollY, same = app.dataset.rota === rota + "/" + (arg || "");
  app.innerHTML = view(arg);
  restoreDrafts();
  app.dataset.rota = rota + "/" + (arg || "");
  window.scrollTo(0, same ? y : 0);
  const tab = views[rota] ? (TAB_OF[rota] || "mais") : "inicio";
  $$("a", nav).forEach(a => {
    const on = a.dataset.tab === tab;
    a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  view.after?.();
  syncNative(); // app Android: informa o estado da Zona de Penalidade
}
setRender(render);

// Tema: classe (clima do app) e rank (cor do losango e, no Necromante, do destaque). Ver o fim do styles.css.
function aplicarTema() {
  const b = document.body;
  [...b.classList].filter(c => /^(cl|rk)-/.test(c)).forEach(c => b.classList.remove(c));
  if (S.profile) { b.classList.add("rk-" + levelInfo().rank); if (S.classe) b.classList.add("cl-" + S.classe); }
  const cor = getComputedStyle(b).getPropertyValue("--bg").trim() || "#04070f";
  document.querySelector('meta[name="theme-color"]').content = cor;
}

document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (!el || el.tagName === "FORM" || el.disabled) return;
  e.preventDefault();
  actions[el.dataset.act]?.({ ...el.dataset }, el, e);
});
document.addEventListener("submit", e => {
  const form = e.target.closest("form[data-act]");
  if (!form) return;
  e.preventDefault();
  actions[form.dataset.act]?.(Object.fromEntries(new FormData(form)), form, e);
});
document.addEventListener("change", e => {
  const el = e.target.closest("[data-chg]");
  if (el) actions[el.dataset.chg]?.({ ...el.dataset }, el, e);
});
window.addEventListener("hashchange", render);

// Fecha os dias pendentes e mostra o relatório do Sistema
function closeDays() {
  const report = processDays();
  const kcal = applyAutoKcal();
  if (kcal) setTimeout(() => toast(`Meta de calorias ajustada: ${kcal.antes} → ${kcal.nova} kcal`, 5000), report.length ? 800 : 0);
  if (!report.length) return !!kcal;
  const falhou = report.some(r => r.falta);
  return showEvents(falhou ? "Missão diária falhou" : "Relatório do Sistema", report,
    falhou ? `<p class="bad">Você entrou na <b>Zona de Penalidade</b>.</p><a class="btn primary block" href="#/penalidade" data-close>Resolver agora</a>` : ""); // Promise
}

// Ao abrir ou voltar para o app: fecha os dias e mostra, em sequência, o relatório do dia e os avisos do Sistema
// (Portão, relatório semanal, mudança de classe). Só redesenha se algo mudou (ou se pedido).
let avisando = false;
async function aoAbrir(sempre = false) {
  if (!S.profile) { if (sempre) render(); return; }
  if (avisando) return;
  avisando = true;
  try {
    const r = closeDays();
    if (r || sempre) render();
    if (r instanceof Promise) await r;
    if (await avisosDoSistema()) render();
  } finally { avisando = false; }
}

// Faixa atrás da barra de status (criada aqui também, caso o index.html em cache seja de uma versão antiga)
if (!document.getElementById("statusbar")) {
  const sb = document.createElement("div"); sb.id = "statusbar"; document.body.prepend(sb);
}

// Rascunhos: formulários com data-rascunho guardam o que foi digitado (no dia) e preenchem de volta ao redesenhar
let rascunhoT = null;
document.addEventListener("input", e => {
  const f = e.target.closest?.("form[data-rascunho]"); if (!f) return;
  const v = {};
  for (const el of f.elements) if (el.name && el.type !== "hidden" && el.value !== "") v[el.name] = el.value;
  (S.rascunhos ||= {})[f.dataset.rascunho] = { d: today(), v };
  clearTimeout(rascunhoT); rascunhoT = setTimeout(save, 400);
});
function restoreDrafts() {
  for (const f of document.querySelectorAll("form[data-rascunho]")) {
    const r = S.rascunhos?.[f.dataset.rascunho];
    if (!r || r.d !== today()) continue;
    for (const [n, val] of Object.entries(r.v)) { const el = f.elements[n]; if (el && !el.value) el.value = val; }
    if (Object.keys(r.v).length) f.closest("details")?.setAttribute("open", "");
  }
}

// Marca quando o usuário abre o seletor de arquivos (no app Android ele sai do app e volta)
let escolhendoArquivo = false;
document.addEventListener("click", e => {
  const t = e.target;
  if (t.matches?.("input[type=file]") || t.closest?.("label")?.querySelector("input[type=file]")) escolhendoArquivo = true;
}, true);

async function boot() {
  await load();
  const mig = S.profile ? migrarCurva() : null; // curva de 100 níveis: avisa uma vez, antes do relatório do dia
  if (mig) save();
  render();
  if (mig) {
    await celebrate([mig]);
    await aviso("O Sistema evoluiu", `<p>Agora são <b>100 níveis</b>, e eles sobem mais rápido no começo.
      Seu XP continua o mesmo (${S.game.xp.toLocaleString("pt-BR")} XP); o nível foi recalculado: <b>${mig.levelFrom} → <span class="glow">${mig.levelTo}</span></b>.</p>
      <p><b>Rank e nível agora são separados.</b> O rank vem só do Teste de Rank: passou, sobe na hora, em qualquer nível. O nível mede a sua constância.</p>
      <p class="small muted">O teste antecipado (a partir da metade da fase) passa a valer pela média de 2 tentativas em dias diferentes. No fim da fase, uma tentativa basta.</p>`);
  }
  aoAbrir();
  if (S.tracking && !S.tracking.nativo) { startWatch(); keepScreenOn(true); } // no app Android 1.5+, quem rastreia é o Android
  // app Android: ao voltar dos Ajustes (permissões), fecha dias e atualiza a tela
  window.__nativeResume = () => {
    // voltou do seletor de arquivos: NÃO redesenhar, senão o campo que está recebendo o arquivo é trocado
    // e o arquivo escolhido se perde (backup, foto, comprovante PIX)
    if (escolhendoArquivo) { escolhendoArquivo = false; return; }
    aoAbrir(true);
  };
  // virou o dia com o app aberto (ou voltou para o app): fecha o dia e atualiza
  document.addEventListener("visibilitychange", () => { if (!document.hidden) aoAbrir(); });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    // Versão nova instalada: recarrega UMA vez para já abrir atualizado (sem precisar abrir o app duas vezes)
    const eraAtualizacao = !!navigator.serviceWorker.controller;
    let recarregou = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (eraAtualizacao && !recarregou) { recarregou = true; location.reload(); }
    });
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  navigator.storage?.persist?.();
}
boot();
