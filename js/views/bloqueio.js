// Bloqueio de apps (só no app Android) e página de download do app Android (no navegador)
import { views, actions, refresh } from "../core.js";
import { S, save } from "../store.js";
import { esc, fmtTime, fmtDate, iso } from "../util.js";
import { header, panel, toast, confirmBox, sysMessage } from "../ui.js";
import { inPenalty, grant } from "../game.js";
import { nativo, nativeStatus, syncNative, ultimoSync, testeBloqueio } from "../native.js";

export const EMERG = { xp: 100, ouro: 100, min: 15, espera: 10 };
// Versão do app Android com a emergência nova (espera de 10 min, 1 por dia) e a lista ampliada de apps
const appNovo = () => typeof nativo?.emergencyRequest === "function";
const versaoAtual = st => parseFloat(st.version) >= 1.2; // lista fixa + Spotify
const APK = "download/o-sistema.apk";

function instalar() {
  return `${header()}<div class="stack">
    ${panel("App Android", `<p style="margin-top:0">O app Android é o mesmo Sistema, com três coisas a mais:</p>
      <ul><li><b>Zona de Penalidade fora do app:</b> WhatsApp e Gmail ficam bloqueados enquanto houver penalidade. Bancos e telefone continuam liberados.</li>
      <li><b>Lembrete</b> à noite quando a missão do dia ainda não foi feita.</li>
      <li>Seus dados ficam a salvo de "limpar dados do navegador".</li></ul>
      <a class="btn primary block" href="${APK}" download>Baixar o app Android</a>
      <p class="small muted">Tamanho: menos de 1 MB. Não é da Play Store: o Android vai pedir para permitir instalar apps desta fonte. Permita só para o navegador, instale e depois pode desligar de novo.</p>`)}
    ${panel("Antes de instalar: leve seus dados", `<ol class="small" style="padding-left:18px;margin:0">
      <li>Aqui no navegador: <b>Perfil → Baixar backup</b>.</li>
      <li>No app Android: <b>Perfil → Restaurar</b> e escolha o arquivo baixado.</li></ol>
      <p class="small muted" style="margin-bottom:0">O app Android guarda os dados separado do navegador. As fotos não vão no backup: adicione de novo as que quiser manter.</p>`)}
    ${panel("O que o app pode e não pode fazer", `<ul class="small" style="padding-left:18px;margin:0">
      <li><b>Acesso ao uso:</b> sabe <i>qual</i> app está aberto, para cobrir WhatsApp e Gmail. Não vê o conteúdo de nenhum app.</li>
      <li><b>Sobrepor a outros apps:</b> desenha a tela da Zona de Penalidade por cima dos apps bloqueados. Nunca por cima de banco.</li>
      <li><b>Não pede:</b> Acessibilidade (ler a tela), acesso a notificações, SMS, contatos ou microfone.</li>
      <li>Nada é enviado para servidor nenhum: não existe servidor.</li></ul>`)}</div>`;
}

const perm = (ok, nome, desc, which, obrigatoria) => `<li>
  <span style="font-size:1.2rem">${ok ? "✅" : obrigatoria ? "⛔" : "⚠️"}</span>
  <span class="grow"><b>${nome}</b><br><span class="small muted">${desc}</span></span>
  ${ok ? "" : `<button class="btn sm ${obrigatoria ? "primary" : ""}" data-act="nativeSettings" data-which="${which}">Permitir</button>`}</li>`;

function emergenciaPanel(st) {
  const now = Date.now();
  if (!appNovo()) return panel("Emergência", `<p style="margin-top:0" class="warn">A emergência mudou: agora tem espera de ${EMERG.espera} min antes de liberar e vale 1 vez por dia. Para usar, instale a versão 1.1 do app Android.</p>
    <a class="btn block" href="download/o-sistema.apk">Baixar a versão 1.1</a>`);
  if (st.unlockFrom > now) return panel("Emergência", `<p style="margin-top:0">Os apps serão liberados em</p>
    <div class="timer num warn" id="emerg-timer" data-ate="${st.unlockFrom}">--:--</div>
    <p class="small muted center">às ${fmtTime(st.unlockFrom)}, por ${EMERG.min} minutos. Mudou de ideia? Desistindo agora, o XP e o Ouro voltam.</p>
    <button class="btn block" data-act="nativeEmergencyCancel">Desistir</button>`, "alert");
  if (st.unlockUntil > now) return panel("Emergência", `<p class="mid warn" style="margin-top:0">Apps liberados até ${fmtTime(st.unlockUntil)}</p>
    <p class="small muted" style="margin-bottom:0">Depois disso o bloqueio volta sozinho.</p>`);
  return panel("Emergência", `<p style="margin-top:0">Para uma emergência de verdade. Depois de pedir, há uma <b>espera de ${EMERG.espera} minutos</b> e então os apps ficam liberados por <b>${EMERG.min} minutos</b>.
    Custa <b class="bad">−${EMERG.xp} XP e −${EMERG.ouro} Ouro</b> (devolvidos se você desistir durante a espera). <b>${st.emergencyLeft ? "1 por dia" : "Já usada hoje"}</b>.</p>
    <button class="btn danger block" data-act="nativeEmergency" ${st.emergencyLeft && st.blockingNow ? "" : "disabled"}>Pedir liberação</button>`);
}

function painel(st) {
  const cfg = S.nativeCfg || {}, pen = inPenalty();
  const faltando = !st.usageAccess || !st.overlay;
  const situacao = !st.blockingEnabled ? `<p class="mid warn">Bloqueio desligado</p>`
    : faltando ? `<p class="mid bad">Bloqueio sem permissão</p><p class="small">Sem as permissões obrigatórias, o bloqueio não funciona.</p>`
    : (st.unlockFrom || 0) <= Date.now() && st.unlockUntil > Date.now() ? `<p class="mid warn">Desbloqueio de emergência até ${fmtTime(st.unlockUntil)}</p>`
    : st.blockingNow ? `<p class="mid bad">Apps bloqueados agora</p><p class="small muted">Zona de Penalidade ativa.</p>`
    : `<p class="mid ok">Armado</p><p class="small muted">Se você entrar na Zona de Penalidade, os apps escolhidos são bloqueados na hora, mesmo que você não abra O Sistema.</p>`;
  // mostra os apps instalados; os outros da lista aparecem num resumo (são bloqueados se você instalar)
  const apps = (st.apps || []).filter(a => a.instalado);
  const outros = [...new Set((st.apps || []).filter(a => !a.instalado && a.bloqueado).map(a => a.nome))];
  const desligar = !st.blockingEnabled
    ? `<button class="btn block" data-act="nativeEnable">Ligar o bloqueio de novo</button>`
    : st.disableAt ? `<p class="small warn">O bloqueio desliga em <b>${fmtDate(iso(new Date(st.disableAt)))} às ${fmtTime(st.disableAt)}</b>.</p>
        <button class="btn block" data-act="nativeCancelDisable">Cancelar o pedido</button>`
    : `<button class="btn ghost block" data-act="nativeRequestDisable">Pedir para desligar o bloqueio</button>
       <p class="small muted" style="margin-bottom:0">Desligar só vale 24 horas depois do pedido e fica no Registro do Sistema. É de propósito: protege você do você sem motivação.</p>`;
  return `${header()}<div class="stack">
    ${panel("Bloqueio de apps", situacao, st.blockingNow ? "alert" : "")}
    ${panel("Permissões", `<ul class="list">
      ${perm(st.usageAccess, "Acesso ao uso", "Saber qual app está aberto (nunca o conteúdo). Procure “O Sistema” na lista e ative.", "usage", true)}
      ${perm(st.overlay, "Sobrepor a outros apps", "Mostrar a tela da Zona de Penalidade por cima dos apps bloqueados.", "overlay", true)}
      ${perm(st.notifications, "Notificações", "Lembrete da missão e aviso da Zona de Penalidade.", "notifications", false)}
      ${perm(st.battery, "Sem restrição de bateria", "Evita que o Android desligue o bloqueio para economizar bateria.", "battery", false)}</ul>`)}
    ${panel("Apps bloqueados na Zona de Penalidade", `<ul class="list">${[...new Set(apps.map(a => a.nome))].map(n => `<li><span class="grow">${esc(n)}</span><span class="chip bad">🔒 Bloqueado</span></li>`).join("")}</ul>
      ${outros.length ? `<p class="small muted">Também bloqueados se você instalar: ${esc(outros.join(", "))}.</p>` : ""}
      ${versaoAtual(st) ? "" : `<p class="small warn">Spotify e a lista fixa precisam da versão 1.2 do app Android. <a href="download/o-sistema.apk">Baixar</a></p>`}
      <p class="small muted" style="margin-bottom:0">A lista é fixa de propósito: nenhum app pode ser tirado dela pelo O Sistema. Bancos, telefone e Ajustes nunca entram.</p>`)}
    ${st.blockingNow || st.unlockUntil > Date.now() ? emergenciaPanel(st) : ""}
    ${panel("Lembrete da missão", `<p class="small muted" style="margin-top:0">Notificação se a missão do dia ainda não foi feita.</p>
      <select data-chg="nativeReminder" aria-label="Horário do lembrete">${[-1, 17, 18, 19, 20, 21, 22].map(h => `<option value="${h}" ${(cfg.lembreteHora ?? st.reminderHour) === h ? "selected" : ""}>${h < 0 ? "Desligado" : h + ":00"}</option>`).join("")}</select>`)}
    ${panel("Desligar", desligar)}
    ${panel("Diagnóstico", `<table class="t small">
      <tr><td>App Android</td><td>${esc(st.version || "?")}</td></tr>
      <tr><td>Sistema</td><td>${esc((navigator.userAgent.match(/Android [\d.]+/) || ["?"])[0])}</td></tr>
      <tr><td>Penalidade enviada ao Android</td><td>${ultimoSync ? `${ultimoSync.penalty ? "sim" : "não"} (${ultimoSync.em}${ultimoSync.ok ? "" : ", ERRO: " + esc(ultimoSync.erro)})` : "ainda não enviada"}</td></tr>
      <tr><td>Teste do bloqueio</td><td>${testeBloqueio() ? "ligado" : "desligado"}</td></tr>
      <tr><td>Android quer bloquear agora</td><td>${st.blockingNow ? "sim" : "não"}</td></tr>
      <tr><td>Acesso ao uso / Sobrepor</td><td>${st.usageAccess ? "✔" : "✖"} / ${st.overlay ? "✔" : "✖"}</td></tr>
      <tr><td>Notificações / Bateria livre</td><td>${st.notifications ? "✔" : "✖"} / ${st.battery ? "✔" : "✖"}</td></tr>
      <tr><td>Bloqueio ligado</td><td>${st.blockingEnabled ? "sim" : "não"}${st.disableAt ? " (pedido de desligar)" : ""}</td></tr>
      <tr><td>Apps marcados</td><td>${esc((st.apps || []).filter(a => a.bloqueado).map(a => a.nome).join(", ") || "nenhum")}</td></tr></table>`)}
    <p class="small muted center">App Android ${esc(st.version || "")}</p></div>`;
}

views.bloqueio = () => {
  if (!nativo) return instalar();
  const st = nativeStatus();
  return st ? painel(st) : `${header()}<p class="muted">Não consegui ler o estado do bloqueio.</p>`;
};

actions.nativeSettings = ({ which }) => nativo?.openSettings(which);

actions.nativeReminder = (_, el) => {
  S.nativeCfg = { ...(S.nativeCfg || {}), lembreteHora: +el.value };
  save(); syncNative(); toast(+el.value < 0 ? "Lembrete desligado." : `Lembrete às ${el.value}:00.`);
};

actions.nativeEmergency = async () => {
  if (!appNovo()) return;
  if (!await confirmBox("Desbloqueio de emergência", `Os apps serão liberados daqui a ${EMERG.espera} minutos, por ${EMERG.min} minutos. Custa ${EMERG.xp} XP e ${EMERG.ouro} Ouro agora (devolvidos se você desistir na espera). Só 1 por dia, e a penalidade continua valendo.`, "Pedir")) return;
  const r = JSON.parse(nativo.emergencyRequest());
  if (!r.ok) return toast("A emergência de hoje já foi usada.");
  grant(-EMERG.xp, -EMERG.ouro, `Pediu desbloqueio de emergência (libera às ${fmtTime(r.de)})`);
  S.emergenciaCobrada = { de: r.de }; // para devolver se desistir na espera
  save(); refresh();
};

actions.nativeEmergencyCancel = () => {
  if (!nativo.emergencyCancel()) return toast("A espera já acabou: os apps estão liberados.");
  if (S.emergenciaCobrada) grant(EMERG.xp, EMERG.ouro, "Desistiu da emergência: XP e Ouro devolvidos");
  delete S.emergenciaCobrada;
  save(); refresh(); toast("Desistência registrada. Os apps continuam bloqueados.");
};

// contagem da espera da emergência
views.bloqueio.after = () => {
  const el = document.getElementById("emerg-timer"); if (!el) return;
  const ate = +el.dataset.ate;
  const tick = () => {
    if (!el.isConnected) return clearInterval(iv);
    const s = Math.max(0, Math.round((ate - Date.now()) / 1000));
    el.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    if (!s) { clearInterval(iv); setTimeout(refresh, 1500); }
  };
  const iv = setInterval(tick, 1000); tick();
};

actions.nativeRequestDisable = async () => {
  if (!await confirmBox("Desligar o bloqueio", "O bloqueio só desliga daqui a 24 horas. Até lá ele continua valendo, e você pode cancelar o pedido.", "Pedir")) return;
  const at = nativo.requestDisable();
  grant(0, 0, `Pediu para desligar o bloqueio de apps (vale em ${fmtDate(iso(new Date(at)))} ${fmtTime(at)})`);
  save(); refresh();
};
actions.nativeCancelDisable = () => { nativo.cancelDisable(); grant(0, 0, "Cancelou o pedido de desligar o bloqueio"); save(); refresh(); };
actions.nativeEnable = () => { nativo.enableBlocking(); grant(0, 0, "Ligou o bloqueio de apps"); save(); refresh(); };
