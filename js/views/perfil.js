// Perfil: despertar (cadastro), status, ajustes, casa, trilha e backup
import { views, actions, refresh, go } from "../core.js";
import { S, save, resetAll, replaceState } from "../store.js";
import { today, addDays, esc, fmt, num, WEEKDAYS, getPosition, $ } from "../util.js";
import { header, panel, toast, sysMessage, confirmBox } from "../ui.js";
import { levelInfo, nextRank, tmb, weightOn } from "../game.js";
import { currentTrack } from "../tracks.js";

function profileForm(p = {}, first = false) {
  const f = (name, label, attrs = "", val = p[name]) => `<div class="field"><label for="pf-${name}">${label}</label>
    <input id="pf-${name}" name="${name}" value="${esc(val ?? "")}" ${attrs}></div>`;
  return `<form data-act="saveProfile">
    ${f("nome", "Nome do jogador", "required maxlength=40")}
    <div class="grid2">
      ${f("nasc", "Nascimento", 'type="date" required')}
      <div class="field"><label for="pf-sexo">Sexo</label><select id="pf-sexo" name="sexo">
        ${["masculino", "feminino"].map(s => `<option ${p.sexo === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
      ${f("altura", "Altura (cm)", 'inputmode="decimal" required')}
      ${f("pesoInicial", "Peso inicial (kg)", 'inputmode="decimal" required')}
      ${f("metaPeso", "Meta de peso (kg)", 'inputmode="decimal"')}
      ${f("metaAbdomen", "Meta de abdômen (cm)", 'inputmode="decimal"')}
      ${f("metaKcal", "Meta de calorias por dia", 'inputmode="numeric"')}
      <div class="field"><label for="pf-rest">Dia de descanso</label><select id="pf-rest" name="restDay">
        ${WEEKDAYS.map((d, i) => `<option value="${i}" ${(p.restDay ?? 0) === i ? "selected" : ""}>${d}</option>`).join("")}</select></div>
      ${f("pessoas", "Pessoas no grupo do WhatsApp", 'inputmode="numeric"', p.pessoas ?? 3)}
      ${f("multa", "Multa por falta (R$ por pessoa)", 'inputmode="numeric"', p.multa ?? 10)}
      ${first ? "" : f("minDist", "Distância mínima de casa (m)", 'inputmode="numeric"', p.minDist ?? 300)}
      ${first ? "" : f("minMin", "Tempo mínimo de treino (min)", 'inputmode="numeric"', p.minMin ?? 30)}
    </div>
    <button class="btn primary block">${first ? "Despertar" : "Salvar perfil"}</button></form>`;
}

export function onboarding() {
  return `<div class="stack" style="margin-top:24px">
    <div class="center"><div class="rank" style="margin:10px auto 22px"><span>E</span></div>
      <h1 class="glow">O Sistema</h1><p class="muted">Você foi escolhido como Jogador. Preencha seus dados para despertar.</p></div>
    ${panel("Despertar", profileForm({}, true))}</div>`;
}

actions.saveProfile = d => {
  const first = !S.profile, p = { ...(S.profile || {}) };
  p.nome = d.nome.trim(); p.nasc = d.nasc; p.sexo = d.sexo;
  for (const k of ["altura", "pesoInicial", "metaPeso", "metaAbdomen", "metaKcal", "pessoas", "multa", "minDist", "minMin"]) {
    if (k in d) p[k] = num(d[k]);
  }
  if (!(p.altura > 100 && p.altura < 250)) return toast("Altura inválida (em cm).");
  if (!(p.pesoInicial > 20 && p.pesoInicial < 400)) return toast("Peso inválido.");
  p.restDay = +d.restDay;
  p.pessoas = Math.max(1, Math.round(p.pessoas ?? 3)); p.multa = Math.max(0, Math.round(p.multa ?? 10));
  p.minDist = Math.max(100, Math.round(p.minDist ?? 300)); p.minMin = Math.max(10, Math.round(p.minMin ?? 30));
  S.profile = p;
  if (first) { S.game.lastProcessed = addDays(today(), -1); S.profile.criado = today(); }
  save();
  if (first) {
    go("treino");
    sysMessage("Você despertou", `<p class="mid glow">Bem-vindo, ${esc(p.nome)}.</p>
      <p>Rank <b>E</b> · Nível 1. Escolha uma trilha, cumpra as missões diárias e evolua.</p>
      <p class="small muted">Próximos passos: escolher a trilha, montar a Dieta padrão em Comida e cadastrar sua casa no Perfil.</p>`);
  } else { toast("Perfil salvo."); refresh(); }
};

views.perfil = () => {
  const p = S.profile, li = levelInfo(), nr = nextRank(li.level), t = currentTrack();
  const done = Object.values(S.days).filter(d => d.workout?.done);
  const stat = (n, v) => `<div class="tile"><div class="lbl">${n}</div><div class="val num">${v}</div></div>`;
  return `${header()}<div class="stack">
    ${panel("Status", `<div class="grid3">
      ${stat("Rank", li.rank)}${stat("Nível", li.level)}${stat("XP total", fmt(S.game.xp))}
      ${stat("Força", done.filter(d => d.trackId === "calistenia").length)}
      ${stat("Agilidade", done.filter(d => d.trackId === "corrida").length)}
      ${stat("Disciplina", S.game.bestStreak)}</div>
      <p class="small muted">Força = treinos de calistenia · Agilidade = treinos de corrida · Disciplina = maior sequência.
      ${nr ? `<br>Próximo rank: <b>${nr.rank}</b> no nível ${nr.level}.` : ""}
      <br>Metabolismo de repouso estimado: ${fmt(tmb())} kcal/dia (peso ${fmt(weightOn(), 1)} kg).</p>`)}
    ${panel("Casa (para o ponto)", `<p>${p.home ? `Casa cadastrada <span class="ok">✔</span> <span class="small muted num">(${p.home.lat.toFixed(4)}, ${p.home.lon.toFixed(4)})</span>` : `<span class="warn">Casa ainda não cadastrada.</span>`}</p>
      <p class="small muted">Esteja dentro de casa ao tocar no botão. O ponto de treino só vale a mais de ${p.minDist ?? 300} m daqui. A localização fica guardada só neste aparelho.</p>
      <button class="btn block" data-act="setHome">${p.home ? "Atualizar: estou em casa agora" : "Definir: estou em casa agora"}</button>`)}
    ${panel("Trilha", `<p>${t ? `${t.icone} <b>${t.nome}</b>` : "Nenhuma trilha escolhida."}</p>
      <button class="btn ghost block" data-act="changeTrack">${t ? "Trocar de trilha" : "Escolher trilha"}</button>
      <p class="small muted">O progresso de cada trilha fica guardado se você trocar.</p>`)}
    ${panel("Dados do jogador", profileForm(p))}
    ${panel("Backup", `<p class="small muted" style="margin-top:0">Seus dados ficam só neste aparelho. Baixe um backup de vez em quando (as fotos não entram no arquivo).</p>
      <div class="row"><button class="btn grow" data-act="exportData">Baixar backup</button>
      <label class="btn ghost grow">Restaurar<input type="file" accept="application/json,.json" class="hidden" data-chg="importData"></label></div>
      <button class="btn danger block sm" style="margin-top:10px" data-act="wipe">Apagar tudo e recomeçar</button>`)}</div>`;
};

actions.setHome = async () => {
  toast("Obtendo localização…", 15000);
  try {
    const pos = await getPosition();
    S.profile.home = { lat: pos.lat, lon: pos.lon };
    save(); refresh(); toast(`Casa cadastrada (precisão de ${pos.acc} m).`);
  } catch (e) { toast(e.message, 5000); }
};

actions.changeTrack = async () => {
  if (S.track && !await confirmBox("Trocar de trilha", "Você voltará para a tela de escolha de trilha. O treino de hoje continua sendo cobrado.", "Trocar")) return;
  S.track = null; save(); go("treino");
};

actions.exportData = () => {
  const blob = new Blob([JSON.stringify(S)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `sistema-backup-${today()}.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

actions.importData = async (_, el) => {
  const file = el.files[0]; el.value = ""; if (!file) return;
  try {
    const obj = JSON.parse(await file.text());
    if (!obj.profile || !obj.game) throw new Error();
    if (!await confirmBox("Restaurar backup", "Os dados atuais deste aparelho serão substituídos pelos do arquivo.", "Restaurar")) return;
    await replaceState(obj); go("inicio"); toast("Backup restaurado.");
  } catch { toast("Arquivo de backup inválido."); }
};

actions.wipe = async () => {
  if (!await confirmBox("Apagar tudo", "Todos os dados e fotos deste aparelho serão apagados. Isso não pode ser desfeito.", "Apagar tudo")) return;
  await resetAll(); location.hash = ""; location.reload();
};
