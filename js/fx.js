// Comemorações do Sistema: subir de nível (curta) e subir de rank (cinematográfica), com som e vibração.
// Tudo em CSS + JS puro, sem arquivos de áudio (os sons são sintetizados).
import { S } from "./store.js";

export const RANK_COLORS = { E: "#9aa7b8", D: "#3dffb5", C: "#3fb8ff", B: "#a26bff", A: "#ffc94d", S: "#ff2e4d" };
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const soundOn = () => S.profile?.som !== false;

// ---- som ---------------------------------------------------------------------------
let ac = null;
function audio() {
  try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); ac.resume?.(); return ac; } catch { return null; }
}
function tone(ctx, { f, t = 0, d = .3, type = "triangle", v = .18, slide }) {
  const o = ctx.createOscillator(), g = ctx.createGain(), at = ctx.currentTime + t;
  o.type = type; o.frequency.setValueAtTime(f, at);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, at + d);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(v, at + .015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + d);
  o.connect(g).connect(ctx.destination); o.start(at); o.stop(at + d + .05);
}
function noise(ctx, t, d, v) {
  const n = ctx.createBufferSource(), buf = ctx.createBuffer(1, ctx.sampleRate * d, ctx.sampleRate), x = buf.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length) ** 2;
  const f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = "lowpass"; f.frequency.value = 900; g.gain.value = v;
  n.buffer = buf; n.connect(f).connect(g).connect(ctx.destination); n.start(ctx.currentTime + t);
}
export function playLevel() {
  const ctx = soundOn() && audio(); if (!ctx) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ctx, { f, t: i * .09, d: .35 }));
  tone(ctx, { f: 2093, t: .36, d: .6, type: "sine", v: .08 });
}
export function playRank() {
  const ctx = soundOn() && audio(); if (!ctx) return;
  tone(ctx, { f: 220, t: 0, d: 1.1, type: "sawtooth", v: .05, slide: 880 });    // energia subindo
  tone(ctx, { f: 70, t: 1.25, d: 1.2, type: "sine", v: .35, slide: 38 });        // impacto grave
  noise(ctx, 1.25, .9, .35);                                                      // estalo do losango quebrando
  [261.63, 329.63, 392, 523.25, 659.25].forEach(f => tone(ctx, { f, t: 1.5, d: 2.2, v: .07 })); // acorde
  [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(ctx, { f, t: 1.7 + i * .12, d: .7, type: "sine", v: .05 })); // brilho
}

// ---- animações ---------------------------------------------------------------------
function overlay(cls, html, ms) {
  return new Promise(resolve => {
    const o = document.createElement("div");
    o.className = `fx ${cls}`; o.setAttribute("role", "status"); o.innerHTML = html;
    let done = false;
    const end = () => { if (done) return; done = true; o.classList.add("out"); setTimeout(() => { o.remove(); resolve(); }, 250); };
    o.addEventListener("click", end);
    document.body.append(o);
    setTimeout(end, reduced() ? 1400 : ms);
  });
}
const particles = (n, color) => Array.from({ length: n }, () => {
  const x = Math.random() * 100, dl = Math.random() * .8, dur = 1 + Math.random() * 1.2, s = 2 + Math.random() * 4;
  return `<i class="pt" style="left:${x}%;width:${s}px;height:${s}px;background:${color};animation-delay:${dl}s;animation-duration:${dur}s"></i>`;
}).join("");

export function levelUpFx(from, to) {
  navigator.vibrate?.([60, 40, 90]);
  playLevel();
  const nums = Array.from({ length: to - from + 1 }, (_, i) => `<span>${from + i}</span>`).join("");
  return overlay("fx-level", `${particles(28, "var(--glow)")}
    <div class="fx-flash"></div>
    <div class="fx-box"><div class="fx-title">LEVEL UP</div>
      <div class="fx-roll"><div class="fx-roll-in" style="--n:${to - from}">${nums}</div></div>
      <div class="fx-sub">NÍVEL</div></div>`, 2100);
}

// Texto "digitando": letra por letra, mas quebrando a linha entre palavras
function typing(msg) {
  let i = 0;
  return msg.split(" ").map(w => `<span class="w">${[...w].map(ch => `<span style="animation-delay:${(i++ * 0.022).toFixed(3)}s">${ch}</span>`).join("")}</span>`).join(" ");
}

export function rankUpFx(from, to, level) {
  navigator.vibrate?.([80, 60, 80, 60, 120, 200, 400]);
  playRank();
  const c1 = RANK_COLORS[from] || "#9aa7b8", c2 = RANK_COLORS[to] || "#3fb8ff";
  const msg = "[ AVISO DO SISTEMA ] Reavaliação de rank concluída.";
  return overlay("fx-rank", `<div class="fx-dark"></div>
    <div class="fx-type">${typing(msg)}</div>
    <div class="fx-stage">
      <div class="fx-old" style="--c:${c1}"><div class="half l"><span>${from}</span></div><div class="half r"><span>${from}</span></div></div>
      <div class="fx-wave" style="--c:${c2}"></div><div class="fx-wave w2" style="--c:${c2}"></div>
      <div class="fx-new" style="--c:${c2}"><span>${to}</span></div>
    </div>
    <div class="fx-burst">${particles(40, c2)}</div>
    <div class="fx-name" style="--c:${c2}">RANK ${to}</div>
    <div class="fx-lvl">Nível ${level} · toque para continuar</div>`, 5200);
}

// Decide a comemoração a partir dos eventos do jogo (rank tem prioridade sobre nível)
export function celebrate(events) {
  const rUp = events.filter(e => e.rankUp).pop();
  if (rUp) return rankUpFx(rUp.rankFrom, rUp.rankUp, rUp.levelTo);
  const ups = events.filter(e => e.levelUp);
  if (ups.length) return levelUpFx(ups[0].levelFrom, ups[ups.length - 1].levelUp);
  return Promise.resolve();
}

// ---- recompensas: baú, recorde, título, extração de sombra, invocação, portão ---------------------
function playBau(rar) {
  const ctx = soundOn() && audio(); if (!ctx) return;
  [0, .18, .36, .54].forEach(t => tone(ctx, { f: 140, t, d: .09, type: "square", v: .05 })); // chacoalhar
  const acorde = { comum: [523.25, 659.25], raro: [523.25, 659.25, 783.99], epico: [392, 523.25, 659.25, 783.99, 1046.5],
    lendario: [261.63, 392, 523.25, 659.25, 783.99, 1046.5, 1318.5] }[rar] || [523.25];
  acorde.forEach((f, i) => tone(ctx, { f, t: 1.45 + i * .07, d: 1.2, v: .07 }));
  if (rar === "lendario" || rar === "epico") tone(ctx, { f: 2093, t: 1.9, d: 1, type: "sine", v: .05 });
}
function playArise() {
  const ctx = soundOn() && audio(); if (!ctx) return;
  tone(ctx, { f: 55, t: 0, d: 2.2, type: "sawtooth", v: .06, slide: 110 });
  noise(ctx, .2, 1.6, .18);
  tone(ctx, { f: 110, t: 1.6, d: 1.4, type: "sine", v: .3, slide: 55 });
  [196, 233.08, 293.66].forEach(f => tone(ctx, { f, t: 1.8, d: 1.8, v: .05 }));
}
function playPortao() {
  const ctx = soundOn() && audio(); if (!ctx) return;
  tone(ctx, { f: 80, t: 0, d: 2, type: "sawtooth", v: .05, slide: 320 });
  noise(ctx, 0, 2, .12);
  tone(ctx, { f: 659.25, t: 1.6, d: 1, type: "sine", v: .06 });
}
const premiosHtml = l => `<ul class="fx-premios">${l.map((p, i) => `<li style="animation-delay:${(2 + i * .25).toFixed(2)}s">${p}</li>`).join("")}</ul>`;

export function bauFx(rar, nomeRar, cor, premios) {
  navigator.vibrate?.(rar === "lendario" ? [40, 40, 40, 40, 200, 80, 300] : [30, 30, 30, 30, 120]);
  playBau(rar);
  return overlay(`fx-bau r-${rar}`, `<div class="fx-dark"></div>
    <div class="fx-bau-stage" style="--c:${cor}">
      <div class="bau-luz"></div>
      <svg class="bau" viewBox="0 0 120 100" aria-hidden="true">
        <g class="bau-tampa"><path d="M12 46 Q12 16 60 16 Q108 16 108 46 Z" fill="#0b1426" stroke="${cor}" stroke-width="3"/>
          <path d="M30 46 Q30 22 60 22 Q90 22 90 46" fill="none" stroke="${cor}" stroke-opacity=".5" stroke-width="2"/></g>
        <rect x="12" y="46" width="96" height="46" fill="#0b1426" stroke="${cor}" stroke-width="3"/>
        <rect x="12" y="58" width="96" height="5" fill="${cor}" fill-opacity=".35"/>
        <rect x="52" y="48" width="16" height="20" rx="2" fill="${cor}"/><circle cx="60" cy="58" r="3" fill="#04070f"/>
      </svg>
    </div>
    <div class="fx-bau-rar" style="--c:${cor}">${nomeRar.toUpperCase()}</div>
    <div class="fx-burst">${particles(rar === "comum" ? 12 : rar === "raro" ? 24 : 44, cor)}</div>
    ${premiosHtml(premios)}
    <div class="fx-lvl fx-continua">toque para continuar</div>`, 60000);
}

export function recordeFx(nome, de, para) {
  navigator.vibrate?.([50, 40, 120]);
  playLevel();
  return overlay("fx-rec", `${particles(26, "var(--gold)")}<div class="fx-flash" style="background:rgba(255,209,102,.4)"></div>
    <div class="fx-box"><div class="fx-title" style="text-shadow:0 0 14px var(--gold),0 0 40px var(--gold)">NOVO RECORDE</div>
      <div class="fx-rec-nome">${nome}</div>
      <div class="fx-rec-num"><span class="de">${de}</span><span class="seta">→</span><span class="para">${para}</span></div></div>`, 2800);
}

export function tituloFx(nome, nomeRar, cor, rar) {
  const grande = rar === "lendario" || rar === "mitico";
  navigator.vibrate?.(grande ? [80, 50, 80, 50, 300] : [60, 40, 90]);
  grande ? playRank() : playLevel();
  return overlay(`fx-tit${grande ? " grande" : ""}`, `<div class="fx-dark"></div>
    <div class="fx-type">${typing("[ AVISO DO SISTEMA ] Título conquistado.")}</div>
    <div class="fx-tit-nome" style="--c:${cor}">${nome}</div>
    <div class="fx-tit-rar" style="--c:${cor}">${nomeRar.toUpperCase()}</div>
    ${grande ? `<div class="fx-burst">${particles(40, cor)}</div>` : ""}
    <div class="fx-lvl">toque para continuar</div>`, grande ? 5200 : 3600);
}

export function levantarFx(arte, nome, grau, cor, palavra = "LEVANTE-SE") {
  navigator.vibrate?.([100, 60, 100, 60, 400]);
  playArise();
  return overlay("fx-arise", `<div class="fx-dark" style="background:radial-gradient(circle at 50% 70%,#0b0f1f,#000 70%)"></div>
    <div class="fx-arise-txt" style="--c:${cor}">${palavra}</div>
    <div class="fx-arise-fumaca" style="--c:${cor}"></div>
    <div class="fx-arise-arte">${arte}</div>
    <div class="fx-arise-nome" style="--c:${cor}">${nome}</div>
    <div class="fx-arise-grau">${grau}</div>`, 5600);
}

export function falhaFx(texto, sub = "") {
  navigator.vibrate?.([200]);
  const ctx = soundOn() && audio(); if (ctx) tone(ctx, { f: 180, t: 0, d: .6, type: "sawtooth", v: .08, slide: 70 });
  return overlay("fx-falha", `<div class="fx-dark"></div><div class="fx-falha-txt">${texto}</div><div class="fx-lvl" style="top:calc(50% + 40px);opacity:1">${sub}</div>`, 2400);
}

export function portaoFx(nome, cor, linha) {
  navigator.vibrate?.([60, 60, 60, 60, 300]);
  playPortao();
  return overlay("fx-portao", `<div class="fx-dark"></div>
    <div class="fx-type">${typing("[ AVISO DO SISTEMA ] Um Portão se abriu.")}</div>
    <div class="fx-portal" style="--c:${cor}"></div>
    <div class="fx-name" style="--c:${cor};top:calc(50% + 110px);letter-spacing:.1em;font-size:1.4rem">${nome.toUpperCase()}</div>
    <div class="fx-lvl" style="top:calc(50% + 190px)">${linha}</div>`, 5000);
}
