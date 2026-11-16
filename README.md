# O Sistema

App pessoal de evolução fitness em formato de RPG, inspirado na estética de "janela do Sistema":
missões diárias, XP, níveis, ranks (E a S), Ouro e Zona de Penalidade.

É um PWA: um site que se instala na tela inicial do celular e funciona offline.
Não tem servidor nem conta. Todos os dados ficam no próprio aparelho (IndexedDB).

## O que tem

| Tela | Conteúdo |
|---|---|
| **Início** | Resumo do dia: missão diária, quantas calorias ainda pode consumir, macros, lembretes (com atalho para registrar), sequência, contagem para a Loja de sexta, peso e dívida do mês. |
| **Missão** | Treino do dia da trilha escolhida, ponto por GPS (entrada e saída), séries para marcar, treino indoor em dia de chuva forte e Teste de Rank. |
| **Comida** | **Dieta padrão** que entra sozinha em todos os dias, e **Dia**, onde você altera só aquele dia sem mexer na dieta. Busca na tabela TACO e alimentos próprios pelo rótulo. |
| **Evolução** | Gráficos de peso, abdômen, calorias consumidas × gastas, medidas semanais e treinos por semana. |
| **Mais** | Medidas (diárias: peso e abdômen; semanais), Fotos (galeria e antes × depois), Loja de sexta, Penalidades, Registro do Sistema e Perfil. |

## Regras do jogo

- **Treino concluído:** +100 XP e +100 Ouro. Todas as séries marcadas: +20 XP.
- **Medidas do dia:** +10 XP. **Medidas semanais:** +30 XP. **Dia dentro da meta de calorias:** +20 XP.
- **A cada 7 treinos seguidos:** +50 Ouro.
- **Faltou ao treino:** −150 XP, −50 Ouro e **Zona de Penalidade** (o app fica vermelho e a Loja tranca).
- **Sair da Zona de Penalidade:** enviar no grupo do WhatsApp a mensagem gerada (com o código do dia),
  mandar o print para o app validar, e concluir um treino. Cada dia com comprovante pendente custa 30 XP.
- **Loja de sexta:** só abre na sexta. Uma semana perfeita (6 treinos = 600 de Ouro) paga exatamente uma pizza.
- **Trilhas:** Calistenia e Corrida, cada uma com 3 fases (metas de 3 meses, 6 meses e 1 ano).
  A carga sobe a cada 6 treinos completos. A meta seguinte só é revelada depois do Teste de Rank da fase atual.

## Como o treino é verificado

1. Cadastre sua casa no Perfil (uma vez, estando em casa).
2. No local de treino, toque em **Bater ponto: entrada**. Só vale a mais de 300 m de casa.
3. Depois de pelo menos 30 min, toque em **Bater ponto: saída**, ainda no local.

**Chuva forte:** o botão "Verificar clima" consulta a previsão (Open-Meteo, com coordenadas arredondadas).
Se confirmar chuva forte, libera o treino em casa: 25 min no cronômetro, todas as séries e uma selfie no final.

## Como publicar e instalar no celular

O app é só arquivos estáticos, sem etapa de build. O GPS exige HTTPS, então ele precisa estar hospedado.

**GitHub Pages:** no repositório, vá em *Settings → Pages*, escolha *Deploy from a branch*, selecione a branch
`main` e a pasta `/ (root)`. Em um ou dois minutos o endereço aparece nessa mesma página.
(No plano gratuito do GitHub, o Pages exige repositório público. O código fica visível, mas seus dados não:
eles nunca saem do aparelho.)

**No Android:** abra o endereço no Chrome → menu ⋮ → **Adicionar à tela inicial / Instalar app**.
Permita a localização quando o app pedir.

**Para testar no computador:**

```bash
python3 -m http.server 8000
```

Depois abra `http://localhost:8000`.

## Backup

Os dados ficam só no aparelho. Em **Perfil → Baixar backup** sai um arquivo `.json` com tudo, menos as fotos.
Se você limpar os dados do navegador ou desinstalar o app sem backup, perde o histórico.

## Estrutura

```
index.html, manifest.webmanifest, sw.js   casca do PWA
css/styles.css                            tema (azul; vermelho na Zona de Penalidade)
js/app.js, core.js                        inicialização, rotas e eventos
js/store.js                               estado e fotos no IndexedDB
js/game.js                                XP, nível, rank, Ouro, fechamento dos dias, penalidades
js/tracks.js                              trilhas, fases, exercícios e progressão de carga
js/ocr.js                                 leitura do print do WhatsApp (Tesseract.js, no aparelho)
js/views/                                 telas
data/taco.json                            Tabela TACO (NEPA/UNICAMP)
vendor/                                   Chart.js e Tesseract.js (embutidos para funcionar offline)
```

Para simular outra data em testes: `?hoje=AAAA-MM-DD` na URL.
