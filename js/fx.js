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

// ---- extração de sombra por grau (quanto mais alto o grau, mais camadas e mais tempo) ----
const EX = {
  soldado: { dur: 3.4, v: { dp: .1, dc: .2, df: .3, dsd: .6, ds: 1, do: 1.6, dn: 2, dfim: 2.6 } },
  elite: { dur: 4.4, v: { dp: .1, dc: .2, dr: .3, df: .6, dsd: 1, ds: 1.2, do: 2.2, dn: 2.6, dfim: 3.4 }, part: [2.2, 22] },
  cavaleiro: { dur: 5.4, metal: 1, v: { dp: .1, dc: .2, dk: .3, dpi: .8, df: .8, dsd: 1.2, ds: 1.4, do: 2.6, dg: 2.9, dw: 2.8, dn: 3.2, dfim: 4 }, part: [2.8, 26] },
  comandante: { dur: 6.8, treme: 1, v: { dp: .1, dc: .2, dr: .4, dl: .9, dt: 1.5, df: 1.4, dsd: 1.6, ds: 1.9, do: 3.4, dw: 3.4, dn: 4, dfim: 4.8 }, part: [3.4, 40] },
  marechal: { dur: 9, treme: 1, ouro: 1, msg: "[ O SISTEMA ] Um Marechal responde ao seu chamado.",
    v: { dp: 2, dc: 2, dr: 2, dpi: 2.6, dt: 3, df: 3, dsd: 3.2, ds: 2, da: 5.2, do: 5.6, dco: 6, dcl: 6, dw: 6, dn: 6.4, dfim: 7.4 }, part: [1.8, 70] },
};
const runaSvg = c => `<svg viewBox="0 0 200 200" aria-hidden="true"><g fill="none" stroke="${c}" stroke-width="2"><circle cx="100" cy="100" r="94" stroke-opacity=".9"/><circle cx="100" cy="100" r="80" stroke-dasharray="6 6" stroke-opacity=".7"/><circle cx="100" cy="100" r="50" stroke-opacity=".6"/>
  <polygon points="100,22 168,140 32,140" stroke-opacity=".7"/><polygon points="100,178 32,60 168,60" stroke-opacity=".7"/></g>
  ${Array.from({ length: 16 }, (_, i) => { const a = i * Math.PI / 8, x = 100 + 87 * Math.cos(a), y = 100 + 87 * Math.sin(a);
    return `<rect x="${(x - 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="4" height="10" fill="${c}" transform="rotate(${i * 22.5} ${x.toFixed(1)} ${y.toFixed(1)})"/>`; }).join("")}</svg>`;
const rachSvg = c => `<svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="${c}" stroke-width="1.6" style="filter:drop-shadow(0 0 3px ${c})">
  <polyline points="100,40 70,44 52,38 20,46"/><polyline points="100,40 128,46 150,38 186,48"/><polyline points="100,40 88,54 80,60"/><polyline points="100,40 114,55 122,60"/><polyline points="100,40 60,30 40,32"/><polyline points="100,40 140,30 166,33"/></g></svg>`;
const raioSvg = c => `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="${c}" stroke-width=".9">
  <polyline points="18,0 24,18 17,26 26,44 20,58"/><polyline points="84,0 76,16 84,24 74,42 80,54"/><polyline points="50,0 54,10 47,17 53,28"/></g></svg>`;
function somExtracao(k, v) {
  const c = soundOn() && audio(); if (!c) return;
  noise(c, v.df, 1.6, .12); tone(c, { f: 60, t: v.dsd, d: 1.4, type: "sawtooth", v: .05, slide: 120 });
  tone(c, { f: 880, t: v.do, d: .5, type: "sine", v: .06 });
  if (k !== "soldado") [392, 466.16, 587.33].forEach((f, i) => tone(c, { f, t: v.dn + i * .08, d: 1.4, v: .05 }));
  if (v.dg || v.dw) tone(c, { f: 2637, t: v.dg || v.dw, d: .6, type: "sine", v: .05 });
  if (v.dt) { tone(c, { f: 70, t: v.dt, d: 1.3, type: "sine", v: .35, slide: 36 }); noise(c, v.dt, 1, .3); }
  if (k === "marechal") {
    [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((f, i) => tone(c, { f, t: v.dcl + i * .1, d: 2.4, v: .06 }));
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(c, { f, t: v.dco + i * .12, d: .8, type: "sine", v: .04 }));
  }
}
// grau: soldado | elite | cavaleiro | comandante | marechal. arte: SVG da sombra (sombras.arteSombra).
export function extracaoFx({ grau, arte, nome, sub, cor, faixa = "", palavra = "LEVANTE-SE" }) {
  const T = EX[grau] || EX.soldado, v = T.v;
  navigator.vibrate?.(grau === "marechal" ? [80, 60, 80, 60, 400] : grau === "comandante" ? [80, 60, 300] : [60]);
  somExtracao(grau, v);
  const vars = Object.entries(v).map(([a, x]) => `--${a}:${x}s`).join(";");
  const camadas = [];
  if (grau === "marechal") camadas.push(`<div class="ex-raios"></div>`);
  if (v.dpi) camadas.push(`<div class="ex-pilar"></div>`);
  if (v.dr) camadas.push(`<div class="ex-runa">${runaSvg(cor)}</div>`);
  if (grau === "comandante" || grau === "marechal") camadas.push(`<div class="ex-runa r2">${runaSvg(cor)}</div>`);
  if (v.dk) camadas.push(`<div class="ex-rach">${rachSvg(cor)}</div>`);
  if (v.dl) camadas.push(`<div class="ex-raio">${raioSvg(cor)}</div>`);
  camadas.push(`<div class="ex-chao"></div><div class="ex-fum f1"></div><div class="ex-fum f2"></div><div class="ex-fum f3"></div><div class="ex-fig">${arte}</div>`);
  if (v.dg) camadas.push(`<div class="ex-glint"></div>`);
  if (v.dw) camadas.push(`<div class="ex-onda"></div><div class="ex-onda o2"></div>`);
  const [p0, pn] = T.part || [0, 0];
  const part = Array.from({ length: pn }, () => { const sz = 2 + Math.random() * 4, d = 1.6 + Math.random() * 2.4;
    return `<i style="left:${(Math.random() * 100).toFixed(1)}%;width:${sz.toFixed(1)}px;height:${sz.toFixed(1)}px;animation-duration:${d.toFixed(2)}s;animation-delay:${(p0 + Math.random() * (grau === "marechal" ? 6 : 1.4)).toFixed(2)}s"></i>`; }).join("");
  let i = 0;
  const msg = T.msg ? `<div class="ex-msg">${[...T.msg].map(ch => `<span style="animation-delay:${(i++ * .035).toFixed(3)}s">${ch === " " ? "&nbsp;" : ch}</span>`).join("")}</div>` : "";
  return overlay(`fx-ex${T.treme ? " treme" : ""}${T.metal ? " metal" : ""}${T.ouro ? " ouro" : ""}`, `<div class="ex-cfg" style="--c:${cor};${vars}">
    <div class="ex-fundo"></div>${msg}<div class="ex-palavra">${palavra}</div><div class="ex-cena">${camadas.join("")}</div>
    <div class="ex-part">${part}</div>${v.dcl ? `<div class="ex-clarao"></div>` : ""}
    <div class="ex-placa">${faixa ? `<div class="ex-faixa">${faixa}</div>` : ""}<div class="ex-nome">${nome}</div><div class="ex-sub">${sub}</div></div>
    <div class="ex-toque">toque para continuar</div></div>`, (T.dur + 3) * 1000);
}

// ---- Arsenal -----------------------------------------------------------------------------
// Som de cada item (sintetizado): o tipo dá o timbre e a posição no catálogo dá a nota, então cada um soa diferente.
// arma = corte metálico; livro = acorde baixo com brilho; anel = sino; manto = sopro grave; Lendário = impacto + acorde.
export function playItem(it, i = 0) {
  const ctx = soundOn() && audio(); if (!ctx) return;
  const base = 196 * 2 ** ((i % 12) / 12); // uma nota diferente por item
  if (it.slot === "arma") { noise(ctx, 0, .25, .25); tone(ctx, { f: base * 4, t: .08, d: .5, type: "sine", v: .1, slide: base * 4.2 }); tone(ctx, { f: base * 6, t: .1, d: .35, type: "sine", v: .05 }); }
  if (it.slot === "livro") { [1, 1.25, 1.5].forEach((m, k) => tone(ctx, { f: base * m, t: k * .06, d: 1, v: .07 })); [4, 5, 6].forEach((m, k) => tone(ctx, { f: base * m, t: .35 + k * .1, d: .5, type: "sine", v: .03 })); }
  if (it.slot === "anel") { tone(ctx, { f: base * 4, d: 1.4, type: "sine", v: .12 }); tone(ctx, { f: base * 4 * 2.76, d: .9, type: "sine", v: .04 }); tone(ctx, { f: base * 6, t: .2, d: 1, type: "sine", v: .05 }); }
  if (it.slot === "manto") { noise(ctx, 0, .8, .18); tone(ctx, { f: base / 2, d: 1, type: "sine", v: .15, slide: base / 3 }); }
  if (it.rar === "lendario") { tone(ctx, { f: 65, t: .05, d: 1.2, type: "sine", v: .3, slide: 40 }); [1, 1.26, 1.5, 2].forEach(m => tone(ctx, { f: base * m, t: .3, d: 1.8, v: .05 })); }
}

// Item do Arsenal obtido (Portão, mudança de classe)
export function itemFx({ arte, nome, sub, cor, lendario = false, item = null }) {
  navigator.vibrate?.(lendario ? [80, 50, 80, 50, 400] : [60, 40, 120]);
  lendario ? playRank() : item ? playItem(item) : playLevel();
  return overlay(`fx-item${lendario ? " lendario" : ""}`, `<div class="fx-dark"></div>
    <div class="fx-type">${typing("[ AVISO DO SISTEMA ] Item obtido para o Arsenal.")}</div>
    <div class="fx-item-arte" style="--c:${cor}">${arte}</div>
    <div class="fx-item-nome" style="--c:${cor}">${nome}</div>
    <div class="fx-item-sub" style="--c:${cor}">${sub.toUpperCase()}</div>
    ${lendario ? `<div class="fx-burst">${particles(40, cor)}</div>` : ""}
    <div class="fx-lvl">toque para continuar</div>`, lendario ? 5600 : 4200);
}

// ---- evolução de uma sombra ---------------------------------------------------------------
// Bipes cada vez mais rápidos enquanto a silhueta pisca; impacto e acorde na revelação (aos 4,4 s).
export function playEvolucao() {
  const ctx = soundOn() && audio(); if (!ctx) return;
  const notas = [392, 440, 494, 523.25];
  let t = 1.2, gap = .55;
  for (let i = 0; t < 4.35; i++) { tone(ctx, { f: notas[i % 4] * (1 + Math.floor(i / 4) * .25), t, d: .12, v: .06, type: "square" }); t += gap; gap = Math.max(.06, gap * .82); }
  tone(ctx, { f: 70, t: 4.4, d: 1.1, type: "sine", v: .3, slide: 40 }); noise(ctx, 4.4, .6, .25);
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ctx, { f, t: 4.5 + i * .08, d: 1.3, v: .07 }));
}
export function evolucaoFx({ arteDe, artePara, nome, para, cor }) {
  navigator.vibrate?.([50, 80, 50, 80, 50, 60, 50, 40, 400]);
  playEvolucao();
  return overlay("fx-evo", `<div class="fx-dark"></div>
    <div class="fx-type">${typing(`[ AVISO DO SISTEMA ] ${nome} está evoluindo…`)}</div>
    <div class="fx-evo-palco" style="--c:${cor}"><div class="fx-evo-a">${arteDe}</div><div class="fx-evo-b">${artePara}</div><div class="fx-evo-flash"></div></div>
    <div class="fx-evo-txt" style="--c:${cor}">${nome} evoluiu para ${para}!</div>
    <div class="fx-lvl">toque para continuar</div>`, 8200);
}

// ---- trilha escolhida: animação e som próprios de cada trilha ------------------------------
// Calistenia: a barra se desenha e a silhueta sobe numa barra, com impacto metálico.
// Corrida: contagem 3, 2, 1, pegadas acendendo e a largada com rastro de luz.
export function playTrilha(id) {
  const ctx = soundOn() && audio(); if (!ctx) return;
  if (id === "corrida") {
    [0.6, 1.2, 1.8].forEach(t => tone(ctx, { f: 440, t, d: .16, type: "square", v: .07 }));
    tone(ctx, { f: 880, t: 2.4, d: .5, type: "square", v: .08 }); noise(ctx, 2.4, .7, .3);
    [392, 523.25, 659.25, 783.99].forEach((f, i) => tone(ctx, { f, t: 2.6 + i * .07, d: 1.2, v: .06 }));
    return;
  }
  noise(ctx, .3, .5, .12);
  tone(ctx, { f: 160, t: 1.2, d: .7, type: "sawtooth", v: .05, slide: 520 });
  noise(ctx, 1.9, .35, .35); tone(ctx, { f: 1250, t: 1.9, d: .9, type: "sine", v: .08 }); tone(ctx, { f: 1870, t: 1.92, d: .6, type: "sine", v: .04 });
  [261.63, 329.63, 392, 523.25].forEach((f, i) => tone(ctx, { f, t: 2.3 + i * .07, d: 1.4, v: .06 }));
}
export function trilhaFx({ id, nome, icone = "", fase = "", rank = "", cor = "var(--glow)" }) {
  navigator.vibrate?.(id === "corrida" ? [40, 560, 40, 560, 40, 560, 300] : [60, 1800, 200]);
  playTrilha(id);
  const cena = id === "calistenia" ? `<svg class="tr-svg" viewBox="0 0 240 220" aria-hidden="true">
      <path class="tr-barra" d="M30 205 V40 H210 V205" fill="none" stroke="${cor}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <path class="tr-braco tr-be" d="M106 40 L110 96" stroke="${cor}" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path class="tr-braco tr-bd" d="M134 40 L130 96" stroke="${cor}" stroke-width="5" stroke-linecap="round" fill="none"/>
      <g class="tr-corpo"><circle cx="120" cy="78" r="13" fill="#04060c" stroke="${cor}" stroke-width="2"/>
        <path d="M106 96 H134 L131 150 H109 Z" fill="#04060c" stroke="${cor}" stroke-width="2"/>
        <path d="M113 150 L111 198 M127 150 L129 198" stroke="${cor}" stroke-width="6" stroke-linecap="round" fill="none"/></g>
      <circle class="tr-impacto" cx="120" cy="40" r="10" fill="none" stroke="#fff" stroke-width="3"/></svg>`
    : id === "corrida" ? `<svg class="tr-svg" viewBox="0 0 240 220" aria-hidden="true">
      <path class="tr-chao" d="M10 182 H230" stroke="${cor}" stroke-width="3" fill="none"/>
      <path d="M40 150 V200" stroke="#fff" stroke-width="4" stroke-dasharray="6 6" fill="none"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<ellipse class="tr-pe" cx="${66 + i * 28}" cy="${i % 2 ? 176 : 166}" rx="9" ry="4.5" fill="${cor}" style="animation-delay:${0.7 + i * .25}s"/>`).join("")}
      <path class="tr-rastro" d="M40 140 H232" stroke="${cor}" stroke-width="5" stroke-linecap="round" fill="none"/></svg>
      <div class="tr-conta">${["3", "2", "1", "LARGADA!"].map((n, i) => `<span style="animation-delay:${0.6 + i * .6}s">${n}</span>`).join("")}</div>`
    : `<div class="tr-icone">${icone}</div>`;
  return overlay(`fx-trilha tr-${id}`, `<div class="fx-dark"></div>
    <div class="fx-type">${typing("[ AVISO DO SISTEMA ] Trilha escolhida.")}</div>
    <div class="tr-cena" style="--c:${cor}">${cena}</div>
    <div class="tr-nome" style="--c:${cor}">${nome.toUpperCase()}</div>
    ${fase ? `<div class="tr-sub">Fase ${fase}${rank ? ` · rumo ao rank ${rank}` : ""}</div>` : ""}
    <div class="fx-lvl">toque para continuar</div>`, 5400);
}

// ---- séries da missão: som e efeito a cada quadradinho ---------------------------------------
// no alvo = "ding" brilhante e faísca verde; abaixo do alvo = "tok" grave e faísca âmbar; desmarcar = clique seco.
// Fechou todas as séries de um exercício = pequeno acorde; fechou o treino inteiro = fanfarra curta.
export function playSerie(estado, extra = null) {
  const ctx = soundOn() && audio(); if (!ctx) return;
  if (estado === "on") { tone(ctx, { f: 1046.5, d: .18, type: "sine", v: .12 }); tone(ctx, { f: 1568, t: .03, d: .14, type: "sine", v: .05 }); }
  else if (estado === "low") tone(ctx, { f: 330, d: .13, type: "triangle", v: .13, slide: 250 });
  else noise(ctx, 0, .04, .12);
  if (extra === "exercicio") [784, 987.8, 1174.7].forEach((f, i) => tone(ctx, { f, t: .12 + i * .06, d: .3, type: "sine", v: .07 }));
  if (extra === "treino") {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ctx, { f, t: .15 + i * .09, d: .35, v: .09 }));
    [523.25, 659.25, 783.99].forEach(f => tone(ctx, { f, t: .55, d: 1.1, v: .06 }));
  }
}
export function serieFx(el, estado, extra = null) {
  navigator.vibrate?.(extra === "treino" ? [50, 40, 140] : extra === "exercicio" ? 40 : estado === "low" ? [10, 30, 10] : estado === "on" ? 15 : 0);
  playSerie(estado, extra);
  if (reduced() || estado === "off") return;
  const fx = document.createElement("span");
  fx.className = `set-fx ${estado}`;
  fx.innerHTML = Array.from({ length: 6 }, (_, i) => { const a = i / 6 * Math.PI * 2 + Math.random() * .5;
    return `<i style="--dx:${Math.round(Math.cos(a) * 26)}px;--dy:${Math.round(Math.sin(a) * 22)}px"></i>`; }).join("");
  el.append(fx); setTimeout(() => fx.remove(), 700);
  if (extra) {
    const li = el.closest("li"); li?.classList.remove("ex-ok"); void li?.offsetWidth; li?.classList.add("ex-ok");
    if (extra === "treino") el.closest(".list")?.classList.add("treino-ok");
  }
}
