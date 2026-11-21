// O Sistema — inicialização, rotas e delegação de eventos
import { $, $$ } from "./util.js";
import { S, load } from "./store.js";
import { actions, views, setRender } from "./core.js";
import { processDays, inPenalty, applyAutoKcal } from "./game.js";
import { showEvents, toast } from "./ui.js";
import "./views/home.js";
import "./views/treino.js";
import "./views/comida.js";
import "./views/outros.js";
import "./views/evolucao.js";
import "./views/penalidade.js";
import "./views/condicao.js";
import "./views/bloqueio.js";
import "./views/avaliacao.js";
import { syncNative, keepScreenOn } from "./native.js";
import { startWatch } from "./views/extras.js";
import { onboarding } from "./views/perfil.js";

const TAB_OF = { inicio: "inicio", treino: "treino", comida: "comida", evolucao: "evolucao" }; // o resto fica em "Mais"

function render() {
  const app = $("#app"), nav = $("#nav");
  document.body.classList.toggle("penalty", !!S.profile && inPenalty());
  document.querySelector('meta[name="theme-color"]').content = document.body.classList.contains("penalty") ? "#0c0305" : "#04070f";
  if (!S.profile) { nav.classList.add("hidden"); app.innerHTML = onboarding(); return; }
  nav.classList.remove("hidden");
  const [rota = "inicio", arg] = location.hash.replace(/^#\/?/, "").split("/");
  const view = views[rota] || views.inicio;
  const y = window.scrollY, same = app.dataset.rota === rota + "/" + (arg || "");
  app.innerHTML = view(arg);
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
  showEvents(falhou ? "Missão diária falhou" : "Relatório do Sistema", report,
    falhou ? `<p class="bad">Você entrou na <b>Zona de Penalidade</b>.</p><a class="btn primary block" href="#/penalidade" data-close>Resolver agora</a>` : "");
  return true;
}

// Faixa atrás da barra de status (criada aqui também, caso o index.html em cache seja de uma versão antiga)
if (!document.getElementById("statusbar")) {
  const sb = document.createElement("div"); sb.id = "statusbar"; document.body.prepend(sb);
}

// Marca quando o usuário abre o seletor de arquivos (no app Android ele sai do app e volta)
let escolhendoArquivo = false;
document.addEventListener("click", e => {
  const t = e.target;
  if (t.matches?.("input[type=file]") || t.closest?.("label")?.querySelector("input[type=file]")) escolhendoArquivo = true;
}, true);

async function boot() {
  await load();
  if (S.profile) closeDays();
  render();
  if (S.tracking) { startWatch(); keepScreenOn(true); }
  // app Android: ao voltar dos Ajustes (permissões), fecha dias e atualiza a tela
  window.__nativeResume = () => {
    // voltou do seletor de arquivos: NÃO redesenhar, senão o campo que está recebendo o arquivo é trocado
    // e o arquivo escolhido se perde (backup, foto, comprovante PIX)
    if (escolhendoArquivo) { escolhendoArquivo = false; return; }
    if (S.profile) closeDays();
    render();
  };
  // virou o dia com o app aberto (ou voltou para o app): fecha o dia e atualiza
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && S.profile && closeDays()) render();
  });
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
