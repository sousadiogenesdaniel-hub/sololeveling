// Perfil: despertar (cadastro), status, ajustes, casa, trilha e backup
import { nativo, saveFile, copyText } from "../native.js";
import { views, actions, refresh, go } from "../core.js";
import { S, save, resetAll, replaceState } from "../store.js";
import { today, addDays, esc, fmt, num, fmtDate, WEEKDAYS, getPreciseFix, $ } from "../util.js";
import { header, panel, toast, sysMessage, confirmBox, modal, closeModal } from "../ui.js";
import { levelInfo, nextRank, tmb, weightOn, applyAutoKcal, KCAL_AUTO, pendingDebts, revalidateDebts, grant, MULTA_MIN, rankDe } from "../game.js";
import { janelaStatus } from "./titulos.js";
import { currentTrack, TRACKS, trackById, ativas, multi, setFoco, progress } from "../tracks.js";

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
      ${f("metaMargem", "Margem da meta (± kg)", 'inputmode="decimal"', p.metaMargem ?? "")}
      ${f("metaAbdomen", "Meta de abdômen (cm)", 'inputmode="decimal"')}
      ${f("metaKcal", "Meta de calorias por dia", `inputmode="numeric" ${p.kcalAuto ? "readonly" : ""}`)}
      <div class="field"><label for="pf-rest">Dia de descanso</label><select id="pf-rest" name="restDay">
        ${WEEKDAYS.map((d, i) => `<option value="${i}" ${(p.restDay ?? 0) === i ? "selected" : ""}>${d}</option>`).join("")}</select></div>
      ${f("multa", `Multa por falta (R$ por pessoa, mín. ${MULTA_MIN})`, 'inputmode="numeric"', Math.max(MULTA_MIN, p.multa ?? 10))}
      ${first ? "" : f("minDist", "Distância mínima de casa (m, mín. 1000)", 'inputmode="numeric"', Math.max(1000, p.minDist ?? 1000))}
      ${first ? "" : f("minMin", "Tempo mínimo de treino (min, mín. 30)", 'inputmode="numeric"', Math.max(30, p.minMin ?? 30))}
    </div>
    ${first ? "" : `<div class="tile" style="margin-bottom:12px">
      <label class="row" style="text-transform:none;letter-spacing:0;font-size:1rem;color:var(--text);margin:0">
        <input type="checkbox" name="kcalAuto" ${p.kcalAuto ? "checked" : ""}> Ajustar a meta de calorias automaticamente</label>
      <div class="grid2" style="margin-top:10px">
        ${f("kcalDeficit", "Déficit diário (kcal)", 'inputmode="numeric"', p.kcalDeficit ?? KCAL_AUTO.deficit)}
        ${f("kcalPiso", "Nunca abaixo de (kcal)", 'inputmode="numeric"', p.kcalPiso ?? KCAL_AUTO.piso)}</div>
      <p class="small muted" style="margin:0">Recalcula toda semana pelo seu peso e, depois de ~5 semanas, também pelo quanto você realmente emagreceu comendo o que registrou.</p></div>`}
    ${first ? "" : `<label class="row" style="text-transform:none;letter-spacing:0;font-size:1rem;color:var(--text);margin:0 0 12px">
      <input type="checkbox" name="som" ${p.som !== false ? "checked" : ""}> Sons nas comemorações de nível e rank</label>`}
    <button class="btn primary block">${first ? "Despertar" : "Salvar perfil"}</button></form>`;
}

export function onboarding() {
  return `<div class="stack" style="margin-top:24px">
    <div class="center"><div class="rank" style="margin:10px auto 22px"><span>E</span></div>
      <h1 class="glow">O Sistema</h1><p class="muted">Você foi escolhido como Jogador. Preencha seus dados para despertar.</p></div>
    ${panel("Despertar", profileForm({}, true))}
    ${panel("Já tenho um backup", `<p class="small muted" style="margin-top:0">Vindo do navegador ou de outro celular? Continue de onde parou:</p>
      <p class="small" style="margin:0 0 6px"><b>Pela área de transferência</b> (mais fácil): no app antigo, Perfil → <b>Copiar backup</b>; aqui, toque em Colar backup.</p>
      <button class="btn primary block" data-act="pasteBackup">Colar backup</button>
      <p class="small" style="margin:12px 0 6px"><b>Pelo arquivo</b>: no app antigo, Perfil → Baixar backup; aqui, escolha o arquivo.</p>
      <label class="btn block">Restaurar do arquivo<input type="file" accept="application/json,.json,text/plain,*/*" class="hidden" data-chg="importData"></label>`)}</div>`;
}

actions.saveProfile = d => {
  const first = !S.profile, p = { ...(S.profile || {}) };
  p.nome = d.nome.trim(); p.nasc = d.nasc; p.sexo = d.sexo;
  for (const k of ["altura", "pesoInicial", "metaPeso", "metaMargem", "metaAbdomen", "metaKcal", "pessoas", "multa", "minDist", "minMin"]) {
    if (k in d) p[k] = num(d[k]);
  }
  if (!(p.altura > 100 && p.altura < 250)) return toast("Altura inválida (em cm).");
  if (!(p.pesoInicial > 20 && p.pesoInicial < 400)) return toast("Peso inválido.");
  p.restDay = +d.restDay;
  const autoAntes = !!p.kcalAuto, ajusteAntes = `${p.kcalDeficit}|${p.kcalPiso}`;
  if (!first) {
    p.kcalAuto = d.kcalAuto === "on";
    p.som = d.som === "on";
    p.kcalDeficit = Math.min(1000, Math.max(0, Math.round(num(d.kcalDeficit) ?? KCAL_AUTO.deficit)));
    p.kcalPiso = Math.max(1200, Math.round(num(d.kcalPiso) ?? KCAL_AUTO.piso));
  }
  p.pessoas = Math.max(1, Math.round(p.pessoas ?? 3)); const multaDigitada = Math.round(p.multa ?? 10); p.multa = Math.max(MULTA_MIN, multaDigitada);
  p.minDist = Math.max(1000, Math.round(p.minDist ?? 1000)); p.minMin = Math.max(30, Math.round(p.minMin ?? 30));
  // multa mudou com penalidade pendente: vale para as pendentes, e fica registrado
  const multaAntes = S.profile?.multa ?? 10;
  if (!first && p.multa !== multaAntes && pendingDebts().length) grant(0, 0, `Multa alterada de R$ ${multaAntes} para R$ ${p.multa} com penalidade pendente`);
  S.profile = p;
  revalidateDebts();
  // ligou o automático ou mudou déficit/piso: aplica na hora, sem limite de passo
  const auto = p.kcalAuto && (!autoAntes || ajusteAntes !== `${p.kcalDeficit}|${p.kcalPiso}`) ? applyAutoKcal(true) : null;
  if (first) { S.game.lastProcessed = addDays(today(), -1); S.profile.criado = today(); }
  save();
  if (first) {
    go("treino");
    sysMessage("Você despertou", `<p class="mid glow">Bem-vindo, ${esc(p.nome)}.</p>
      <p>Rank <b>E</b> · Nível 1. Escolha uma trilha, cumpra as missões diárias e evolua.</p>
      <p class="small muted">Próximos passos: escolher a trilha, montar a Dieta padrão em Comida e cadastrar sua casa no Perfil.</p>`);
  } else {
    toast(multaDigitada < MULTA_MIN ? `Perfil salvo. A multa mínima é R$ ${MULTA_MIN}.` : auto ? `Perfil salvo. Meta de calorias: ${auto.nova} kcal.` : "Perfil salvo.", 4000);
    refresh();
  }
};

function kcalPanel(c, em) {
  const fase = { emagrecer: "Emagrecendo", faixa: "Na faixa da meta: déficit pela metade", manter: "No alvo: manutenção" }[c.fase];
  return panel("Meta de calorias automática", `<p class="mid glow num" style="margin:0">${fmt(S.profile.metaKcal)} kcal/dia</p>
    <p class="small muted" style="margin-top:2px">${fase} · próxima revisão em ${fmtDate(addDays(em, KCAL_AUTO.intervalo))}</p>
    <table class="t">
      <tr><td>Peso de tendência</td><td class="num">${fmt(c.peso, 1)} kg</td></tr>
      <tr><td>Gasto pela fórmula</td><td class="num">${fmt(c.formula)} kcal</td></tr>
      <tr><td>Gasto pelos seus dados</td><td class="num">${c.real ? fmt(c.real) + " kcal" : "<span class='muted'>ainda sem dados</span>"}</td></tr>
      <tr><td>Gasto usado</td><td class="num">${fmt(c.gasto)} kcal</td></tr>
      <tr><td>Déficit</td><td class="num">−${fmt(c.deficit)} kcal</td></tr></table>
    <p class="small muted">${c.real ? `Últimos ${c.base.dias} dias: comeu em média ${fmt(c.base.media)} kcal e o peso variou ${fmt(c.base.porSemana, 2)} kg/semana.`
      : "Os dados reais entram depois de umas 5 semanas de pesagens e alimentação registradas (as 2 primeiras são ignoradas por causa da perda de água)."}
      Cada ajuste muda no máximo ${KCAL_AUTO.passoMax} kcal, e a meta nunca fica abaixo de ${fmt(c.piso)} kcal.</p>`);
}

views.perfil = () => {
  const p = S.profile, li = levelInfo(), nr = nextRank(li), t = currentTrack();
  const done = Object.values(S.days).filter(d => d.workout?.done);
  const stat = (n, v) => `<div class="tile"><div class="lbl">${n}</div><div class="val num">${v}</div></div>`;
  return `${header()}<div class="stack">
    ${panel("Janela de Status", `${janelaStatus()}<div class="grid3" style="margin-top:10px">
      ${stat("Rank", li.rank)}${stat("Nível", li.level)}${stat("XP total", fmt(S.game.xp))}</div>
      ${multi() ? `<div class="tile" style="margin-top:8px"><div class="lbl">Rank por trilha</div>
        <div class="small">${ativas().map(id => `${trackById(id).icone} ${trackById(id).nome}: <b class="glow">${rankDe(id)}</b>`).join(" · ")}</div></div>` : ""}
      ${nr ? `<div class="tile" style="margin-top:8px"><div class="lbl">Para o rank ${nr.rank}</div>
        <div class="small">○ Passar no Teste do rank ${nr.rank}${multi() ? " (em qualquer trilha)" : ""}</div></div>` : `<p class="glow">Rank máximo alcançado.</p>`}
      <p class="small muted">O rank vem do Teste de Rank: passou, sobe na hora, em qualquer nível${multi() ? " (o seu rank é o melhor entre as trilhas)" : ""}. O nível mede a sua constância.
      <br>Metabolismo de repouso estimado: ${fmt(tmb())} kcal/dia (peso ${fmt(weightOn(), 1)} kg).</p>`)}
    ${panel("Casa (para o ponto)", `<p>${p.home?.acc ? `Casa cadastrada <span class="ok">✔</span> <span class="small muted num">(precisão ±${p.home.acc} m)</span>`
      : p.home ? `<span class="warn">Recadastre a casa: o cadastro antigo não tinha checagem de precisão do GPS.</span>` : `<span class="warn">Casa ainda não cadastrada.</span>`}</p>
      <p class="small muted">Esteja dentro de casa ao tocar no botão. O ponto de treino só vale a mais de ${fmt(Math.max(1000, p.minDist ?? 1000) / 1000, 1)} km daqui. O GPS precisa estar preciso (Android: Chrome com "Usar local preciso" ligado). A localização fica guardada só neste aparelho.</p>
      <button class="btn block" data-act="setHome">${p.home?.acc ? "Atualizar: estou em casa agora" : "Definir: estou em casa agora"}</button>`)}
    ${trilhaPanel(t)}
    ${p.kcalAuto && p.kcalAutoCalc ? kcalPanel(p.kcalAutoCalc, p.kcalAutoEm) : ""}
    ${panel("Dados do jogador", profileForm(p))}
    ${panel("Backup", `<p class="small muted" style="margin-top:0">Seus dados ficam só neste aparelho. Baixe um backup de vez em quando (as fotos não entram no arquivo).</p>
      <div class="row"><button class="btn grow" data-act="exportData">Baixar backup</button>
      <button class="btn grow" data-act="copyBackup">Copiar backup</button></div>
      <div class="row" style="margin-top:8px"><label class="btn ghost grow">Restaurar do arquivo<input type="file" accept="application/json,.json,text/plain,*/*" class="hidden" data-chg="importData"></label>
      <button class="btn ghost grow" data-act="pasteBackup">Colar backup</button></div>
      <button class="btn danger block sm" style="margin-top:10px" data-act="wipe">Apagar tudo e recomeçar</button>`)}</div>`;
};

actions.setHome = async () => {
  toast("Verificando sua localização pelo GPS…", 30000);
  try {
    const pos = await getPreciseFix({ onUpdate: b => { const t = $("#toast"); if (t) t.textContent = `Verificando sua localização… precisão ±${b.acc} m`; } });
    S.profile.home = { lat: pos.lat, lon: pos.lon, acc: pos.acc, em: today() };
    save(); refresh(); $("#toast")?.remove();
    sysMessage("Casa cadastrada", `<p>Precisão do GPS: <b>±${pos.acc} m</b>.</p><p class="small muted">O ponto de treino só vale a mais de ${fmt(Math.max(1000, S.profile.minDist ?? 1000) / 1000, 1)} km daqui.</p>`);
  } catch (e) { $("#toast")?.remove(); sysMessage("Casa não cadastrada", `<p>${esc(e.message)}</p>`); }
};

// Trilhas: com uma só, "Trocar" funciona como sempre. "Iniciar outra trilha" mantém a atual e soma a nova.
function trilhaPanel(t) {
  const outras = TRACKS.filter(x => !x.building && !ativas().includes(x.id));
  if (!multi()) {
    return panel("Trilha", `<p>${t ? `${t.icone} <b>${t.nome}</b>` : "Nenhuma trilha escolhida."}</p>
      <button class="btn ghost block" data-act="changeTrack">${t ? "Trocar de trilha" : "Escolher trilha"}</button>
      ${t && outras.length ? `<button class="btn block" style="margin-top:8px" data-act="novaTrilha">+ Iniciar outra trilha</button>` : ""}
      <p class="small muted">Trocar de trilha não mexe em XP, nível, rank, Ouro nem sequência, e o progresso de cada trilha fica guardado. A missão diária continua sendo cobrada enquanto você escolhe a nova.
      ${t && outras.length ? "<br>Iniciar outra trilha mantém a atual: a cada dia você escolhe qual treinar, e qualquer uma vale a missão." : ""}</p>`);
  }
  return panel("Trilhas", `<ul class="list">${ativas().map(id => {
      const tr = trackById(id);
      return `<li><span style="font-size:1.4rem">${tr.icone}</span><span class="grow"><b>${tr.nome}</b> · rank ${rankDe(id)}</span>
        <button class="btn sm ghost" data-act="encerrarTrilha" data-id="${id}">Encerrar</button></li>`;
    }).join("")}</ul>
    ${outras.length ? `<button class="btn block" data-act="novaTrilha">+ Iniciar outra trilha</button>` : ""}
    <p class="small muted">A missão do dia é uma só: qualquer trilha vale, e a Missão sugere a que está há mais tempo sem treino.
      Encerrar tira a trilha da lista; o progresso e o rank dela ficam guardados e voltam se você a iniciar de novo.</p>`);
}

actions.changeTrack = async () => {
  if (S.track && !await confirmBox("Trocar de trilha", "Você voltará para a tela de escolha de trilha. O treino de hoje continua sendo cobrado.", "Trocar")) return;
  S.track = null; S.ativas = []; save(); go("treino");
};

actions.novaTrilha = () => {
  const outras = TRACKS.filter(x => !x.building && !ativas().includes(x.id));
  modal(`<div class="ptitle"><h2>Iniciar outra trilha</h2><button class="btn sm ghost" data-close aria-label="Fechar">✕</button></div>
    <p class="small muted">A trilha atual continua. A cada dia você escolhe qual treinar; qualquer uma vale a missão. XP, nível, Ouro e penalidade continuam os mesmos.</p>
    <ul class="list">${outras.map(x => `<li><span style="font-size:1.6rem">${x.icone}</span>
      <span class="grow"><b>${x.nome}</b><br><span class="small muted">${x.resumo}</span></span>
      <button class="btn sm primary" data-act="iniciarTrilha" data-id="${x.id}">Iniciar</button></li>`).join("")}</ul>`);
};

actions.iniciarTrilha = ({ id }) => {
  const nova = !S.progress[id] || !Object.values(S.days).some(d => d.workout?.done && d.workout.trackId === id);
  const p = progress(id);
  p.inicio ??= today();
  if (nova && !p.phase) p.nivelamento = true; // nunca treinou nela: pode provar o nível antes de começar
  S.ativas = [...new Set([...ativas(), id])];
  const w = S.days[today()]?.workout;
  if (!w?.in && !w?.done) { S.focoDia = { d: today(), id }; setFoco(id); if (S.days[today()]?.modo) delete S.days[today()].modo; }
  save(); closeModal();
  const tr = trackById(id), ph = tr.phases[Math.min(p.phase, tr.phases.length - 1)];
  sysMessage("Trilha iniciada", `<p class="mid glow">${tr.icone} ${tr.nome}</p>
    <p>Fase <b>${ph.nome}</b>, rumo ao rank ${ph.rank}. Sua outra trilha continua de onde está.</p>
    ${p.nivelamento ? `<p class="small">Já tem condicionamento nela? Faça o <b>Nivelamento</b> na Missão: o teste do rank ${ph.rank} pela média de 2 tentativas. Passando, pula de fase (e pode nivelar de novo). Vale até o seu primeiro treino normal desta trilha.</p>` : ""}
    <p class="small muted">${w?.in || w?.done ? "O treino de hoje já foi de outra trilha; a nova entra na escolha a partir de amanhã." : "Ela já é a trilha de hoje; dá para trocar na Missão."}</p>`, { onClose: () => go("treino") });
};

actions.encerrarTrilha = async ({ id }) => {
  const tr = trackById(id);
  if (!await confirmBox(`Encerrar ${tr.nome}`, "A trilha sai da sua lista. O progresso e o rank dela ficam guardados e voltam se você a iniciar de novo.", "Encerrar")) return;
  S.ativas = ativas().filter(x => x !== id);
  if (S.focoDia?.id === id) delete S.focoDia;
  const w = S.days[today()]?.workout;
  if (S.track?.id === id && !(w?.in && w.trackId === id)) setFoco(S.ativas[0]);
  save(); refresh();
};

actions.exportData = () => {
  const ok = saveFile(`sistema-backup-${today()}.json`, JSON.stringify(S));
  if (nativo) toast(ok ? "Backup salvo na pasta Downloads." : "Não consegui salvar o backup.", 4000);
};

// Restaura a partir do texto do backup (arquivo ou área de transferência)
async function restoreFromText(text) {
  let obj;
  try { obj = JSON.parse(String(text).trim()); } catch { return sysMessage("Backup inválido", "<p>O conteúdo não é um backup do Sistema (não consegui ler o JSON). Copie ou baixe o backup de novo.</p>"); }
  if (!obj?.profile || !obj?.game) return sysMessage("Backup inválido", "<p>O conteúdo não tem os dados do jogador. Confira se é o backup do Sistema.</p>");
  if (S.profile && !await confirmBox("Restaurar backup", "Os dados atuais deste aparelho serão substituídos pelos do backup.", "Restaurar")) return;
  toast("Restaurando…");
  await replaceState(obj);
  location.hash = "#/inicio"; location.reload(); // reabre do zero: fecha os dias que passaram desde o backup
}

actions.importData = async (_, el) => {
  const file = el.files?.[0]; el.value = "";
  if (!file) return toast("Nenhum arquivo chegou do seletor. Tente “Colar backup”.", 5000);
  toast(`Lendo ${file.name}…`);
  let text;
  try { text = await file.text(); } catch { return sysMessage("Não consegui abrir o arquivo", `<p>${esc(file.name)} não pôde ser lido. Tente “Colar backup”.</p>`); }
  restoreFromText(text);
};

actions.copyBackup = async () => {
  const ok = await copyText(JSON.stringify(S));
  ok ? sysMessage("Backup copiado", `<p>O backup está na área de transferência.</p><p class="small muted">Agora abra o outro app (ex.: o app Android), toque em <b>Colar backup</b> e cole.</p>`)
    : toast("Não consegui copiar. Use “Baixar backup”.", 5000);
};

actions.pasteBackup = () => {
  const o = modal(`<div class="ptitle"><h2>Colar backup</h2><button class="btn sm ghost" data-close aria-label="Fechar">✕</button></div>
    <p class="small muted" style="margin-top:0">Toque e segure dentro do campo e escolha <b>Colar</b>.</p>
    <textarea id="bk-txt" rows="6" placeholder='{"v":1,"profile":…' style="font-size:.8rem"></textarea>
    <button class="btn primary block" style="margin-top:10px" id="bk-ok">Restaurar</button>`);
  $("#bk-ok", o).onclick = () => { const t = $("#bk-txt", o).value; if (!t.trim()) return toast("Cole o backup no campo."); closeModal(); restoreFromText(t); };
};

actions.wipe = async () => {
  if (!await confirmBox("Apagar tudo", "Todos os dados e fotos deste aparelho serão apagados. Isso não pode ser desfeito.", "Apagar tudo")) return;
  await resetAll(); location.hash = ""; location.reload();
};
