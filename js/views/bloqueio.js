// Bloqueio de apps (só no app Android) e página de download do app Android (no navegador)
import { views, actions, refresh } from "../core.js";
import { S, save } from "../store.js";
import { esc, fmtTime, fmtDate, iso } from "../util.js";
import { header, panel, toast, confirmBox, sysMessage } from "../ui.js";
import { inPenalty, grant } from "../game.js";
import { nativo, nativeStatus, syncNative } from "../native.js";

export const EMERG = { xp: 30, ouro: 30, min: 15 };
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

function painel(st) {
  const cfg = S.nativeCfg || {}, pen = inPenalty();
  const faltando = !st.usageAccess || !st.overlay;
  const situacao = !st.blockingEnabled ? `<p class="mid warn">Bloqueio desligado</p>`
    : faltando ? `<p class="mid bad">Bloqueio sem permissão</p><p class="small">Sem as permissões obrigatórias, o bloqueio não funciona.</p>`
    : st.unlockUntil > Date.now() ? `<p class="mid warn">Desbloqueio de emergência até ${fmtTime(st.unlockUntil)}</p>`
    : st.blockingNow ? `<p class="mid bad">Apps bloqueados agora</p><p class="small muted">Zona de Penalidade ativa.</p>`
    : `<p class="mid ok">Armado</p><p class="small muted">Se você entrar na Zona de Penalidade, os apps escolhidos são bloqueados na hora, mesmo que você não abra O Sistema.</p>`;
  const apps = (st.apps || []).filter(a => a.instalado || a.bloqueado);
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
    ${panel("Apps bloqueados na Zona de Penalidade", `<ul class="list">${apps.map(a => `<li><span class="grow">${esc(a.nome)}${a.instalado ? "" : ` <span class="small muted">(não instalado)</span>`}</span>
      <button class="btn sm ${a.bloqueado ? "danger" : "ghost"}" data-act="nativeToggleApp" data-pkg="${a.pkg}" ${pen && a.bloqueado ? "disabled" : ""}>${a.bloqueado ? "Bloqueado ✔" : "Não bloqueado"}</button></li>`).join("")}</ul>
      <p class="small muted" style="margin-bottom:0">Bancos, telefone e Ajustes nunca entram na lista.${pen ? " Durante a Zona de Penalidade dá para adicionar apps, mas não tirar." : ""}</p>`)}
    ${st.blockingNow || st.unlockUntil > Date.now() ? panel("Emergência", `<p style="margin-top:0">Libera os apps por <b>${EMERG.min} minutos</b>. Custa <b class="bad">−${EMERG.xp} XP e −${EMERG.ouro} Ouro</b>. Restam <b>${st.emergencyLeft}</b> hoje.</p>
      <button class="btn danger block" data-act="nativeEmergency" ${st.emergencyLeft && st.blockingNow ? "" : "disabled"}>Desbloquear ${EMERG.min} min</button>`) : ""}
    ${panel("Lembrete da missão", `<p class="small muted" style="margin-top:0">Notificação se a missão do dia ainda não foi feita.</p>
      <select data-chg="nativeReminder" aria-label="Horário do lembrete">${[-1, 17, 18, 19, 20, 21, 22].map(h => `<option value="${h}" ${(cfg.lembreteHora ?? st.reminderHour) === h ? "selected" : ""}>${h < 0 ? "Desligado" : h + ":00"}</option>`).join("")}</select>`)}
    ${panel("Desligar", desligar)}
    <p class="small muted center">App Android ${esc(st.version || "")}</p></div>`;
}

views.bloqueio = () => {
  if (!nativo) return instalar();
  const st = nativeStatus();
  return st ? painel(st) : `${header()}<p class="muted">Não consegui ler o estado do bloqueio.</p>`;
};

actions.nativeSettings = ({ which }) => nativo?.openSettings(which);

actions.nativeToggleApp = ({ pkg }) => {
  const st = nativeStatus(); if (!st) return;
  const atual = new Set(st.apps.filter(a => a.bloqueado).map(a => a.pkg));
  if (atual.has(pkg)) { if (inPenalty()) return toast("Durante a Zona de Penalidade não dá para tirar apps do bloqueio."); atual.delete(pkg); }
  else atual.add(pkg);
  S.nativeCfg = { ...(S.nativeCfg || {}), blocked: [...atual] };
  save(); syncNative(); refresh();
};

actions.nativeReminder = (_, el) => {
  S.nativeCfg = { ...(S.nativeCfg || {}), lembreteHora: +el.value };
  save(); syncNative(); toast(+el.value < 0 ? "Lembrete desligado." : `Lembrete às ${el.value}:00.`);
};

actions.nativeEmergency = async () => {
  if (!await confirmBox("Desbloqueio de emergência", `Liberar os apps por ${EMERG.min} minutos custa ${EMERG.xp} XP e ${EMERG.ouro} Ouro. A penalidade continua valendo.`, "Desbloquear")) return;
  const r = JSON.parse(nativo.emergency());
  if (!r.ok) return toast("Limite de desbloqueios de hoje atingido.");
  grant(-EMERG.xp, -EMERG.ouro, `Desbloqueio de emergência (${EMERG.min} min)`);
  save(); refresh();
  sysMessage("Apps liberados", `<p>Até <b>${fmtTime(r.ate)}</b>. Depois disso o bloqueio volta sozinho.</p><p class="small muted">Restam ${r.restantes} hoje.</p>`);
};

actions.nativeRequestDisable = async () => {
  if (!await confirmBox("Desligar o bloqueio", "O bloqueio só desliga daqui a 24 horas. Até lá ele continua valendo, e você pode cancelar o pedido.", "Pedir")) return;
  const at = nativo.requestDisable();
  grant(0, 0, `Pediu para desligar o bloqueio de apps (vale em ${fmtDate(iso(new Date(at)))} ${fmtTime(at)})`);
  save(); refresh();
};
actions.nativeCancelDisable = () => { nativo.cancelDisable(); grant(0, 0, "Cancelou o pedido de desligar o bloqueio"); save(); refresh(); };
actions.nativeEnable = () => { nativo.enableBlocking(); grant(0, 0, "Ligou o bloqueio de apps"); save(); refresh(); };
