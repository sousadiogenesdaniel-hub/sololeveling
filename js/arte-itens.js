// Arte dos itens do Arsenal: SVG desenhado aqui mesmo (metal escuro, brilho na cor do item). Os não obtidos viram
// silhueta escura; os Lendários têm raios dourados girando atrás (CSS .raios).
let seq = 0;
const el = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
const rot = (a, s) => `<g transform="rotate(${a} 50 50)">${s}</g>`;
const borda = (c, o = .55, w = .8) => `stroke="${c}" stroke-opacity="${o}" stroke-width="${w}"`;

function defsBase(P, c) {
  return `<linearGradient id="${P}met" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#525b7e"/><stop offset=".5" stop-color="#171b2a"/><stop offset="1" stop-color="#3b4362"/></linearGradient>
  <linearGradient id="${P}lam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#262c3f"/><stop offset=".46" stop-color="#8c96b6"/><stop offset=".54" stop-color="#3b4360"/><stop offset="1" stop-color="#141824"/></linearGradient>
  <linearGradient id="${P}osso" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8e8268"/><stop offset=".45" stop-color="#efe6cf"/><stop offset="1" stop-color="#a89c7e"/></linearGradient>
  <linearGradient id="${P}ouro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c2"/><stop offset=".35" stop-color="#ffc94d"/><stop offset=".7" stop-color="#9a6812"/><stop offset="1" stop-color="#ffdc7a"/></linearGradient>
  <linearGradient id="${P}prata" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f9ff"/><stop offset=".5" stop-color="#8793ad"/><stop offset="1" stop-color="#e1e8f5"/></linearGradient>
  <linearGradient id="${P}couro" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#24170f"/><stop offset=".5" stop-color="#4a3224"/><stop offset="1" stop-color="#1a110b"/></linearGradient>
  <radialGradient id="${P}aura" cx="50%" cy="52%" r="52%"><stop offset="0" stop-color="${c}" stop-opacity=".38"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>
  <filter id="${P}gl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="${P}bl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4"/></filter>`;
}

// peças reutilizadas
function adaga(P, c, { fio = c, cabo = `url(#${P}couro)`, pomo = "circulo", larg = 6 } = {}) {
  const l = larg;
  return `<path d="M50 6L${50 + l} 20L${50 + l - .5} 60L${50 - l + .5} 60L${50 - l} 20Z" fill="url(#${P}lam)" ${borda(fio, .6)}/>
    <path d="M50 19V56" stroke="#0a0c13" stroke-width="1.5"/>
    <path d="M36 60Q50 65 64 60V64Q50 69 36 64Z" fill="url(#${P}met)" ${borda(c, .5)}/>
    <rect x="46" y="65.5" width="8" height="18" rx="1.5" fill="${cabo}"/>
    ${[69, 72.5, 76, 79.5].map(y => `<path d="M46 ${y}L54 ${y + 1.6}" stroke="#000" stroke-opacity=".55" stroke-width="1"/>`).join("")}
    ${pomo === "circulo" ? `<circle cx="50" cy="88" r="4.6" fill="url(#${P}met)" ${borda(c, .6)}/>` : `<path d="M50 83L54.5 88L50 93L45.5 88Z" fill="url(#${P}met)" ${borda(c, .6)}/>`}`;
}
function banda(P, fill, traco, { cy = 62, rx = 27, ry = 19, t = 7.5 } = {}) {
  return `<path fill-rule="evenodd" d="${el(50, cy + 3.5, rx, ry)}${el(50, cy + 5, rx - t, ry - t * .8)}" fill="#04050a"/>
    <path fill-rule="evenodd" d="${el(50, cy, rx, ry)}${el(50, cy + 2, rx - t, ry - t * .8)}" fill="${fill}" ${traco}/>`;
}
function livroFechado(P, { capa, lombada, traco, paginas = "#cdc2a3", inclina = 0 }) {
  return `<g transform="rotate(${inclina} 50 50)">
    <rect x="30" y="17" width="47" height="70" rx="2" fill="${paginas}" stroke="#7d735a" stroke-width=".5"/>
    ${[22, 32, 42, 52, 62, 72, 82].map(y => `<path d="M75.5 ${y}h1.2" stroke="#8a7f63" stroke-width=".5"/>`).join("")}
    <rect x="24" y="13" width="49" height="71" rx="3" fill="${capa}" ${traco}/>
    <rect x="24" y="13" width="7.5" height="71" rx="2.5" fill="${lombada}"/>
    <path d="M24.5 23h7M24.5 74h7" stroke="#000" stroke-opacity=".5" stroke-width="1.2"/>`;
}
const estrela = (x, y, r, c, o = 1) => `<path d="M${x} ${y - r}L${x + r * .28} ${y - r * .28}L${x + r} ${y}L${x + r * .28} ${y + r * .28}L${x} ${y + r}L${x - r * .28} ${y + r * .28}L${x - r} ${y}L${x - r * .28} ${y - r * .28}Z" fill="${c}" opacity="${o}"/>`;

const DESENHO = {
  "adaga-coveiro": (P, c) => ({ peca: rot(-38, adaga(P, c, { larg: 6 })) }),

  "cajado-osso": (P, c) => ({
    peca: rot(18, `<path d="M48 30H52L52.7 95H47.3Z" fill="url(#${P}osso)" stroke="#5e5644" stroke-width=".5"/>
      ${[44, 60, 76].map(y => `<ellipse cx="50" cy="${y}" rx="4" ry="2.6" fill="url(#${P}osso)" stroke="#5e5644" stroke-width=".5"/>`).join("")}
      <path d="M47 94H53L50 99Z" fill="url(#${P}met)"/>
      <path d="M50 33C40 31 36.5 21 40.5 9.5C41.5 18 45 24 50 26Z" fill="url(#${P}osso)" stroke="#5e5644" stroke-width=".5"/>
      <path d="M50 33C60 31 63.5 21 59.5 9.5C58.5 18 55 24 50 26Z" fill="url(#${P}osso)" stroke="#5e5644" stroke-width=".5"/>
      <circle cx="50" cy="18" r="6.2" fill="#0c2a26" stroke="${c}" stroke-opacity=".6" stroke-width=".7"/>`),
    fx: rot(18, `<circle cx="50" cy="18" r="4" fill="${c}" filter="url(#${P}gl)"/><circle cx="48.6" cy="16.6" r="1.4" fill="#f2fffb"/>`),
  }),

  "grimorio-chamado": (P, c) => ({
    peca: livroFechado(P, { capa: "#2b2139", lombada: "#191223", traco: borda(c, .4), inclina: -5 }) +
      `<path d="M73 13V22L64 13ZM73 84V75L64 84Z" fill="url(#${P}met)"/>
      <path d="M60 84V94L63 91L66 94V84Z" fill="#6c4fb3"/>
      <circle cx="52" cy="48" r="12.5" fill="none" stroke="${c}" stroke-opacity=".35" stroke-width="1"/></g>`,
    fx: `<g transform="rotate(-5 50 50)" filter="url(#${P}gl)"><path d="M52 39.5V57M52 39.5L46.5 46M52 39.5L57.5 46" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/></g>`,
  }),

  "anel-ferro": (P, c) => ({
    peca: banda(P, `url(#${P}met)`, borda(c, .5)) +
      `<path d="M50 29L61.5 40.5L50 52L38.5 40.5Z" fill="url(#${P}met)" ${borda(c, .6)}/>
      <path d="M50 33.5L57 40.5L50 47.5L43 40.5Z" fill="#06070b" stroke="#3d4458" stroke-width=".6"/>
      ${[[50, 30.5], [60.5, 40.5], [50, 50.5], [39.5, 40.5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#8890a8"/>`).join("")}`,
    fx: `<path d="M46.5 37.8L49.5 35" stroke="#c9d0e6" stroke-opacity=".7" stroke-width=".9" stroke-linecap="round"/>`,
  }),

  "manto-necromante": (P, c) => ({
    peca: `<path d="M50 12C40 12 33 20 32 30C26 43 20 66 13 92L21 88L27 95L34 89L41 96L50 90L59 96L66 89L73 95L79 88L87 92C80 66 74 43 68 30C67 20 60 12 50 12Z" fill="#130c21" ${borda(c, .55, .9)}/>
      <path d="M39.5 40C36.5 49 34.5 57 32.5 64M60.5 40C63.5 49 65.5 57 67.5 64" fill="none" stroke="${c}" stroke-opacity=".45" stroke-width=".8"/>
      <path d="M43 52C39 66 35 78 30 89M57 52C61 66 65 78 70 89M50 54V88" fill="none" stroke="${c}" stroke-opacity=".2" stroke-width=".8"/>
      <path d="M50 18C43 18 38.5 24 38.5 31.5C38.5 39 44 44.5 50 44.5C56 44.5 61.5 39 61.5 31.5C61.5 24 57 18 50 18Z" fill="#020104"/>
      <path d="M40.5 45.5L46.5 48M53.5 48L59.5 45.5" stroke="url(#${P}met)" stroke-width="1.6"/>
      <circle cx="50" cy="48" r="3.6" fill="#2a1747" stroke="url(#${P}met)" stroke-width="1"/>`,
    fx: `<g filter="url(#${P}gl)"><circle cx="50" cy="48" r="2" fill="${c}"/><ellipse cx="45.5" cy="33" rx="2.2" ry="1" fill="${c}" opacity=".85"/><ellipse cx="54.5" cy="33" rx="2.2" ry="1" fill="${c}" opacity=".85"/></g>
      <g filter="url(#${P}bl)" opacity=".5"><ellipse cx="30" cy="94" rx="10" ry="3" fill="${c}" opacity=".3"/><ellipse cx="68" cy="95" rx="12" ry="3" fill="${c}" opacity=".3"/></g>`,
  }),

  "lamina-luto": (P, c) => ({
    peca: rot(-40, `<path d="M46 61V16L50 7C56.5 15 59.5 30 58.5 44C58 52 56.5 57.5 54.5 61Z" fill="url(#${P}lam)" ${borda(c, .55)}/>
      <path d="M48.5 18V58" stroke="#0a0c13" stroke-width="1.3"/>
      <rect x="40" y="61" width="20" height="4.2" rx="1.2" fill="url(#${P}met)" ${borda(c, .5)}/>
      <rect x="46.5" y="65" width="7" height="18" rx="1.2" fill="#15121c"/>
      <path d="M46 83H54L52.4 89.5H47.6Z" fill="url(#${P}met)" ${borda(c, .5)}/>
      <path d="M53.5 67.5C60.5 69.5 64.5 76 62 86.5L58.8 84.5C60 78 57.5 73 52.5 71Z" fill="#040406" stroke="#4a4f66" stroke-width=".45"/>
      <path d="M53 68.5C58.5 74 58.5 82.5 54.5 90.5L52 87.5C55 81.5 55 76 51 71.5Z" fill="#040406" stroke="#4a4f66" stroke-width=".45"/>
      <circle cx="53" cy="68.5" r="2.4" fill="#08080c" stroke="#4a4f66" stroke-width=".45"/>`),
    fx: rot(-40, `<path d="M50.5 9C56 16.5 58.6 30 57.6 44C57.2 51 56 56 54.5 59.5" fill="none" stroke="${c}" stroke-width=".7" stroke-opacity=".9" filter="url(#${P}gl)"/>`),
  }),

  "cetro-ebano": (P, c) => ({
    peca: rot(22, `<linearGradient id="${P}eb" x1="0" x2="1"><stop offset="0" stop-color="#120d18"/><stop offset=".5" stop-color="#3b2f4b"/><stop offset="1" stop-color="#0e0a13"/></linearGradient>
      <rect x="47.5" y="42" width="5" height="50" rx="2" fill="url(#${P}eb)" ${borda(c, .3, .5)}/>
      <rect x="46" y="56" width="8" height="2.6" rx="1" fill="url(#${P}met)"/><rect x="46" y="74" width="8" height="2.6" rx="1" fill="url(#${P}met)"/>
      <circle cx="50" cy="93.5" r="3.2" fill="url(#${P}met)" ${borda(c, .4, .5)}/>
      <path d="M50 41C37.5 39 33.5 26 38 13C39.8 23.5 45 30 50 31C55 30 60.2 23.5 62 13C66.5 26 62.5 39 50 41Z" fill="url(#${P}eb)" ${borda(c, .55)}/>
      <path d="M44 41H56L54 45H46Z" fill="url(#${P}met)"/>
      <circle cx="50" cy="24" r="5.6" fill="#1b0f2b" ${borda(c, .7)}/>`),
    fx: rot(22, `<circle cx="50" cy="24" r="2.8" fill="${c}" filter="url(#${P}gl)"/>`),
  }),

  "adagas-nevoa": (P, c) => {
    const d = adaga(P, c, { cabo: "#10202b", pomo: "losango", larg: 4.6 });
    return {
      peca: `<g transform="translate(-4 0)">${rot(-32, d)}</g><g transform="translate(4 0)">${rot(32, d)}</g>`,
      fx: `<g filter="url(#${P}bl)" opacity=".75"><path d="M8 86C18 79 27 90 38 83C47 77 56 88 66 81C75 76 83 83 92 79" fill="none" stroke="${c}" stroke-opacity=".5" stroke-width="3"/>
        <path d="M14 94C24 89 33 96 44 91C54 87 62 95 72 90C79 87 85 91 90 89" fill="none" stroke="${c}" stroke-opacity=".35" stroke-width="2.5"/></g>
        <g transform="translate(-4 0)">${rot(-32, `<path d="M50 9V55" stroke="${c}" stroke-width=".6" filter="url(#${P}gl)"/>`)}</g>
        <g transform="translate(4 0)">${rot(32, `<path d="M50 9V55" stroke="${c}" stroke-width=".6" filter="url(#${P}gl)"/>`)}</g>`,
    };
  },

  "livro-covas": (P, c) => ({
    peca: livroFechado(P, { capa: "url(#" + P + "couro)", lombada: "#1a100a", traco: borda(c, .4), inclina: 5 }) +
      `<path d="M27.5 16V81" stroke="${c}" stroke-opacity=".45" stroke-width=".7" stroke-dasharray="2 2"/>
      <path d="M36 70C42 62.5 62 62.5 68 70Z" fill="#160e08"/>
      <path d="M43.5 67V47C43.5 38.5 60.5 38.5 60.5 47V67Z" fill="#3b2f25" ${borda(c, .55)}/>
      <path d="M47 50H57M48 54.5H56M49 59H55" stroke="${c}" stroke-opacity=".5" stroke-width=".8"/>
      ${[[35, 30], [64, 26], [38, 78], [66, 77], [58, 33]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#7a6040"/>`).join("")}</g>`,
  }),

  "codice-cinzas": (P, c) => ({
    peca: `<g transform="rotate(-4 50 50)"><rect x="30" y="18" width="46" height="69" rx="2" fill="#bdb3a0" stroke="#6d6556" stroke-width=".5"/>
      <path d="M25 14H72L74.5 22L71 30L74.5 40L72 52L75.5 62L72 72L74.5 84L63 86.5L54 83L44 86.5L34 83L25 85.5Z" fill="#2a292f" stroke="#5c4b43" stroke-width=".7"/>
      <rect x="25" y="14" width="7" height="71.5" fill="#19181d"/>
      <path d="M50 36C56.5 44 58.5 50 54.5 58C52.3 62 47.7 62 45.6 58C42.5 52 47 47.5 50 36Z" fill="none" stroke="${c}" stroke-opacity=".75" stroke-width="1.1"/></g>`,
    fx: `<g transform="rotate(-4 50 50)"><path d="M72 14L74.5 22L71 30L74.5 40L72 52L75.5 62L72 72L74.5 84L63 86.5L54 83L44 86.5L34 83" fill="none" stroke="${c}" stroke-opacity=".55" stroke-width=".9" filter="url(#${P}gl)"/>
      <path d="M50 44C53 48.5 54 52 52 56C51 58 49 58 48 56C46.6 53 48.5 50 50 44Z" fill="${c}" opacity=".8" filter="url(#${P}gl)"/></g>
      ${[[70, 10, 1.2, c], [79, 6, .9, "#9a9aa3"], [63, 5, 1, c], [84, 14, 1.1, "#9a9aa3"], [75, 2.5, .8, c]].map(([x, y, r, k]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${k}" filter="url(#${P}gl)"/>`).join("")}`,
  }),

  "tomo-juramento": (P, c) => {
    const corrente = (x1, y1, x2, y2) => {
      const n = 9, ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI; let s = "";
      for (let i = 0; i <= n; i++) { const x = x1 + (x2 - x1) * i / n, y = y1 + (y2 - y1) * i / n;
        s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3.6" ry="1.9" transform="rotate(${(ang + (i % 2 ? 90 : 0)).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="none" stroke="url(#${P}met)" stroke-width="1.5"/>`; }
      return s; };
    return {
      peca: `<path d="M73 14L79 18V88L73 84Z" fill="#c8bd9e" stroke="#7d735a" stroke-width=".5"/>
        <rect x="22" y="12" width="51" height="73" rx="3" fill="#121831" ${borda(c, .45)}/>
        <rect x="22" y="12" width="7.5" height="73" rx="2.5" fill="#0b0f20"/>
        ${corrente(24, 16, 76, 80)}${corrente(76, 16, 24, 80)}
        <path d="M46.3 48V44C46.3 38.8 53.7 38.8 53.7 44V48" fill="none" stroke="url(#${P}met)" stroke-width="2.4"/>
        <rect x="43.5" y="47.5" width="13" height="11.5" rx="2" fill="url(#${P}met)" ${borda(c, .7)}/>`,
      fx: `<g filter="url(#${P}gl)"><circle cx="50" cy="52" r="1.6" fill="${c}"/><path d="M50 52.5V56" stroke="${c}" stroke-width="1.3"/></g>`,
    };
  },

  "anel-lua": (P, c) => ({
    peca: banda(P, `url(#${P}prata)`, `stroke="#5b6680" stroke-width=".5"`, { rx: 26, ry: 18, t: 5.5 }) +
      `<path d="M44 45.5L50 41L56 45.5" fill="none" stroke="url(#${P}prata)" stroke-width="1.8"/>`,
    fx: `<g filter="url(#${P}gl)"><path d="M55 25A10 10 0 1 0 55 45A8 8 0 1 1 55 25Z" fill="${c}"/></g>${estrela(63, 26, 2.6, "#fff")}${estrela(37, 30, 1.6, c, .8)}`,
  }),

  "anel-osso": (P, c) => {
    let marcas = "";
    for (let a = 25; a <= 155; a += 13) { const r = a * Math.PI / 180, x = 50 + Math.cos(r) * 23, y = 64 + Math.sin(r) * 16;
      marcas += `<path d="M${x.toFixed(1)} ${(y - 2.2).toFixed(1)}v4.4${a % 2 ? "m-1.6 -2.2h3.2" : ""}" stroke="#5e5240" stroke-width="1" stroke-linecap="round"/>`; }
    return {
      peca: banda(P, `url(#${P}osso)`, `stroke="#6f6550" stroke-width=".5"`, { rx: 28, ry: 20, t: 9 }) + marcas +
        `<ellipse cx="50" cy="42.5" rx="6.5" ry="4.2" fill="url(#${P}osso)" stroke="#6f6550" stroke-width=".5"/>
        <path d="M45 42.5H55M50 39V46" stroke="#5e5240" stroke-width=".8"/>`,
    };
  },

  "lanca-caido": (P, c) => ({
    peca: rot(-42, `<rect x="48.3" y="28" width="3.4" height="69" fill="#2b1c19" stroke="#000" stroke-width=".4"/>
      <path d="M50 1C55.5 9.5 56.5 18.5 53.2 28H46.8C43.5 18.5 44.5 9.5 50 1Z" fill="url(#${P}lam)" ${borda(c, .6)}/>
      <path d="M50 5V26" stroke="#0b0d14" stroke-width="1"/>
      <rect x="46.8" y="27" width="6.4" height="5" rx="1" fill="url(#${P}met)"/>
      <path d="M51.7 33L73 36L66.5 41L74 46L64.5 48.5L70.5 54L51.7 52.5Z" fill="#4e0c19" ${borda(c, .55, .6)}/>
      <circle cx="61" cy="43" r="1.6" fill="#05060c"/>
      <path d="M48.5 96.5H51.5L50 100Z" fill="url(#${P}met)"/>`),
    fx: rot(-42, `<path d="M50 3C54.8 10.5 55.6 18.5 52.7 27" fill="none" stroke="${c}" stroke-width=".6" filter="url(#${P}gl)"/>`),
  }),

  "espada-crepusculo": (P, c) => ({
    peca: rot(-45, `<linearGradient id="${P}cr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb27a"/><stop offset=".5" stop-color="#c65fcb"/><stop offset="1" stop-color="#4c2a83"/></linearGradient>
      <path d="M50 3L54.5 13L54 65H46L45.5 13Z" fill="url(#${P}lam)" stroke="url(#${P}cr)" stroke-width=".9"/>
      <path d="M50 63.5C42 63.5 34 61.5 27 55.5C31 62.5 37 66.5 46 68.5H54C63 66.5 69 62.5 73 55.5C66 61.5 58 63.5 50 63.5Z" fill="url(#${P}met)" ${borda("#c65fcb", .6)}/>
      <rect x="47.2" y="68.5" width="5.6" height="17" rx="1" fill="#1d1530"/>
      ${[71.5, 75, 78.5, 82].map(y => `<path d="M47.2 ${y}L52.8 ${y + 1.4}" stroke="#000" stroke-opacity=".6" stroke-width=".9"/>`).join("")}
      <path d="M50 85.5L54 90L50 95L46 90Z" fill="#2a1a12" stroke="url(#${P}met)" stroke-width="1"/>`),
    fx: rot(-45, `<path d="M50 11L51.6 15V61.5H48.4V15Z" fill="url(#${P}cr)" filter="url(#${P}gl)"/>
      <path d="M50 87.2L52 90L50 92.6L48 90Z" fill="${c}" filter="url(#${P}gl)"/>`) +
      [[22, 24], [78, 70], [30, 78]].map(([x, y]) => estrela(x, y, 1.8, c, .7)).join(""),
  }),

  "livro-nomes": (P, c) => {
    const glifos = [[30, 22, .9], [42, 13, .75], [57, 18, .8], [67, 9, .55], [37, 5, .45], [52, 4, .4]]
      .map(([x, y, o], i) => `<path transform="translate(${x} ${y})" d="${["M0 4L2.5 -2L5 4", "M2.5 -2V4M0 0.5H5", "M0 -2L5 4M5 -2L0 4", "M0 -2V4L5 1", "M0 4V-2H5", "M2.5 -2L5 1L2.5 4L0 1Z"][i]}" fill="none" stroke="${c}" stroke-width="1" opacity="${o}"/>`).join("");
    return {
      peca: `<path d="M12 67L50 73.5L88 67V71.5L50 78.5L12 71.5Z" fill="#1c2338" stroke="#2f3a5c" stroke-width=".5"/>
        <path d="M15 30C27.5 26 40 27 50 33.5V72C40 66 27.5 65 15 68.5Z" fill="#d9d3c0" stroke="#8c8571" stroke-width=".5"/>
        <path d="M85 30C72.5 26 60 27 50 33.5V72C60 66 72.5 65 85 68.5Z" fill="#cfc8b3" stroke="#8c8571" stroke-width=".5"/>
        ${[38, 44, 50, 56, 62].map((y, i) => `<path d="M${20 + (i % 2) * 2} ${y - 3 + i * .3}C30 ${y - 5} 38 ${y - 4} ${45} ${y - 1}" fill="none" stroke="#6f6a5a" stroke-opacity=".55" stroke-width=".7"/>
          <path d="M${80 - (i % 3) * 2} ${y - 3 + i * .3}C70 ${y - 5} 62 ${y - 4} ${55} ${y - 1}" fill="none" stroke="#6f6a5a" stroke-opacity=".55" stroke-width=".7"/>`).join("")}`,
      fx: `<path d="M28 33L72 33L62 0H38Z" fill="${c}" opacity=".1" filter="url(#${P}bl)"/><g filter="url(#${P}gl)">${glifos}</g>`,
    };
  },

  "anel-olhos": (P, c) => ({
    peca: banda(P, `url(#${P}met)`, borda(c, .45), { cy: 64, rx: 25, ry: 17, t: 6 }) +
      `<path d="M30 38L24.5 33.5M70 38L75.5 33.5M30 40L24.5 44.5M70 40L75.5 44.5" stroke="url(#${P}met)" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M44 47.5L50 52L56 47.5" fill="none" stroke="url(#${P}met)" stroke-width="2"/>
      <path d="M31 39C39.5 28 60.5 28 69 39C60.5 50 39.5 50 31 39Z" fill="#190a30" ${borda(c, .85, 1)}/>`,
    fx: `<radialGradient id="${P}iris"><stop offset="0" stop-color="#f1e6ff"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="#4a1f8f"/></radialGradient>
      <circle cx="50" cy="39" r="7" fill="url(#${P}iris)" filter="url(#${P}gl)"/><ellipse cx="50" cy="39" rx="1.4" ry="5.2" fill="#05020a"/>
      <circle cx="47.6" cy="36.6" r="1" fill="#fff" opacity=".9"/>`,
  }),

  "cajado-eclipse": (P, c) => {
    const pontas = [0, 45, -45, 90, -90].map(a => `<path d="M50 6L52.2 10.5H47.8Z" fill="url(#${P}met)" transform="rotate(${a} 50 24)"/>`).join("");
    return {
      peca: rot(12, `<rect x="48" y="41" width="4" height="55" rx="1.5" fill="url(#${P}met)" ${borda(c, .3, .5)}/>
        ${[52, 64, 76, 88].map(y => `<path d="M47.5 ${y}L52.5 ${y - 3}" stroke="${c}" stroke-opacity=".35" stroke-width=".9"/>`).join("")}
        <path d="M43.5 38.5H56.5L53 43H47Z" fill="url(#${P}met)"/>
        <path d="M48 96H52L50 100Z" fill="url(#${P}met)"/>
        ${pontas}<circle cx="50" cy="24" r="15" fill="none" stroke="url(#${P}met)" stroke-width="3.2"/>
        <circle cx="50" cy="24" r="15" fill="none" stroke="${c}" stroke-opacity=".35" stroke-width=".6"/>`),
      fx: rot(12, `<circle cx="50" cy="24" r="10.5" fill="${c}" opacity=".85" filter="url(#${P}bl)"/>
        <circle cx="50" cy="24" r="8" fill="#020104"/><circle cx="50" cy="24" r="8" fill="none" stroke="#fff6d6" stroke-width=".7" opacity=".95"/>`),
    };
  },

  "grimorio-noite": (P, c) => {
    const canto = (x, y, sx, sy) => `<path transform="translate(${x} ${y}) scale(${sx} ${sy})" d="M0 0H11C8 2 5 2.5 3 5C2 7 2 9 0 11Z" fill="url(#${P}prata)"/>`;
    return {
      peca: `<linearGradient id="${P}nt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a1f5a"/><stop offset="1" stop-color="#07081f"/></linearGradient>
        <rect x="30" y="16" width="49" height="73" rx="2" fill="#d2c8ad" stroke="#7d735a" stroke-width=".5"/>
        <rect x="22" y="11" width="53" height="75" rx="3" fill="url(#${P}nt)" ${borda(c, .5)}/>
        <rect x="22" y="11" width="8" height="75" rx="2.5" fill="#05061a"/>
        ${[20, 34, 63, 77].map(y => `<rect x="22" y="${y}" width="8" height="2" fill="url(#${P}prata)" opacity=".7"/>`).join("")}
        ${canto(32, 13, 1, 1)}${canto(73, 13, -1, 1)}${canto(32, 84, 1, -1)}${canto(73, 84, -1, -1)}
        <rect x="71" y="43" width="9" height="11" rx="1.5" fill="url(#${P}prata)"/><circle cx="76" cy="48.5" r="1.8" fill="#151b55"/>`,
      fx: `<g filter="url(#${P}gl)"><path d="M57 37A12.5 12.5 0 1 0 57 62A10 10 0 1 1 57 37Z" fill="#e3e9ff"/></g>
        ${[[40, 28, 1.8], [64, 30, 1.3], [38, 66, 1.4], [62, 70, 2], [45, 46, 1], [67, 56, 1]].map(([x, y, r]) => estrela(x, y, r, "#f2f5ff", .9)).join("")}
        <circle cx="76" cy="48.5" r="1" fill="${c}" filter="url(#${P}gl)"/>`,
    };
  },

  "foice-almas": (P, c) => ({
    peca: `<linearGradient id="${P}fc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3240"/><stop offset=".5" stop-color="#121016"/><stop offset="1" stop-color="#2b232f"/></linearGradient>
      <path d="M63.5 97.5L67.5 97L56.8 11L53.2 11.4Z" fill="#20151a" ${borda(c, .35, .5)}/>
      <path d="M59.5 57.5L72.5 53L73.6 56.2L60.6 60.8Z" fill="url(#${P}met)"/>
      <path d="M57.5 10C42 1.5 20 5 7 34C20 18.5 38 15.5 55.5 20.5Z" fill="url(#${P}fc)" ${borda(c, .9, .9)}/>
      <path d="M52 9C40 5 26 8 16 20" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="1"/>
      <circle cx="55.6" cy="15" r="4" fill="url(#${P}ouro)" stroke="#6b4a0e" stroke-width=".5"/><circle cx="55.6" cy="15" r="1.6" fill="#2a0a05"/>
      <path d="M62.5 92H68.5L66 99H63.5Z" fill="url(#${P}ouro)"/>`,
    fx: `<path d="M7 34C20 18.5 38 15.5 55.5 20.5" fill="none" stroke="${c}" stroke-width="1.4" filter="url(#${P}gl)"/>
      <circle cx="55.6" cy="15" r="1.2" fill="${c}" filter="url(#${P}gl)"/>
      <g filter="url(#${P}bl)" opacity=".7"><path d="M72 86C62 80 76 72 65 65C57 60 68 52 61 45" fill="none" stroke="#ffb38a" stroke-width="2"/>
        <path d="M48 80C56 72 46 66 54 58" fill="none" stroke="#ffb38a" stroke-width="1.6"/></g>
      ${[[61, 44, 1.6], [54, 57.5, 1.3], [72, 87, 1.4], [30, 30, 1], [20, 40, .9], [40, 26, .8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" filter="url(#${P}gl)"/>`).join("")}`,
  }),

  "anel-dominio": (P, c) => {
    let runas = "";
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, x = 50 + Math.cos(a) * 42, y = 62 + Math.sin(a) * 12, fr = Math.sin(a) > 0;
      runas += `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(.9)" d="${["M-2 3L0 -3L2 3", "M0 -3V3M-2 0H2", "M-2 -3L2 3M2 -3L-2 3", "M-2 -3V3L2 0", "M-2 3V-3H2", "M0 -3L2 0L0 3L-2 0Z", "M-2 -3H2L-2 3H2"][i % 7]}" fill="none" stroke="${c}" stroke-width="1" opacity="${fr ? .95 : .35}"/>`; }
    return {
      peca: banda(P, `url(#${P}ouro)`, `stroke="#7a5512" stroke-width=".5"`, { cy: 63, rx: 28, ry: 21, t: 7 }) +
        `<path d="M37.5 44L40 30.5L45 37L50 26L55 37L60 30.5L62.5 44Z" fill="url(#${P}ouro)" stroke="#7a5512" stroke-width=".5"/>
        <ellipse cx="50" cy="41" rx="5.4" ry="4.2" fill="#0b0614" stroke="#ffdc7a" stroke-width=".7"/>`,
      fx: `<ellipse cx="50" cy="41" rx="2.4" ry="1.8" fill="#b892ff" filter="url(#${P}gl)"/>
        <g filter="url(#${P}gl)">${runas}</g>
        <path d="M30 52C33 46 40 43 46 43" fill="none" stroke="#fff6d6" stroke-opacity=".6" stroke-width=".8"/>`,
    };
  },
};

// tam = largura em px; bloq = silhueta (item ainda não obtido)
export function arteItem(it, { tam = 96, bloq = false } = {}) {
  const P = "it" + (++seq) + "-", c = it.cor, lend = it.rar === "lendario";
  const d = DESENHO[it.id](P, c);
  let peca = d.peca;
  if (bloq) peca = peca.replace(/fill="(?!none)[^"]*"/g, 'fill="#0b0e16"').replace(/stroke="[^"]*"/g, 'stroke="#2c3446"');
  const raios = lend ? `<g class="raios" opacity="${bloq ? .55 : .9}">${Array.from({ length: 18 }, (_, i) => `<path d="M50 50L48.4 -6H51.6Z" fill="#ffc94d" opacity=".22" transform="rotate(${i * 20} 50 50)"/>`).join("")}</g>
    <circle cx="50" cy="50" r="40" fill="url(#${P}ouroAura)"/>` : "";
  return `<svg class="item-arte" viewBox="0 0 100 100" width="${tam}" height="${tam}" role="img" aria-label="${bloq ? "Item desconhecido" : it.nome}">
    <defs>${defsBase(P, bloq ? "#3a4256" : c)}<radialGradient id="${P}ouroAura"><stop offset="0" stop-color="#ffc94d" stop-opacity=".45"/><stop offset="1" stop-color="#ffc94d" stop-opacity="0"/></radialGradient></defs>
    ${raios}<rect width="100" height="100" fill="url(#${P}aura)"/>
    <g class="peca">${peca}${bloq ? "" : d.fx || ""}</g></svg>`;
}
