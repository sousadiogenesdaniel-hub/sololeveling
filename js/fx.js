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
