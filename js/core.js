// Registro de ações e de telas (evita importações circulares entre as views e o app)
export const actions = {};   // data-act="nome" → actions.nome(dataset|formData, elemento, evento)
export const views = {};     // rota → função que devolve HTML (pode ter .after para rodar depois do render)
let renderFn = () => {};
export const setRender = fn => { renderFn = fn; };
export const refresh = () => renderFn();
export const go = rota => { if (location.hash === "#/" + rota) refresh(); else location.hash = "#/" + rota; };
