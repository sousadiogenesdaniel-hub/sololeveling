# Baú de ideias

Ideias discutidas para o app que ficaram para depois. A gente revisita de tempos em tempos: quando uma for
feita, ela sai daqui e vira regra no README.

## Guardadas para o futuro

### Loja com recompensas da vida real
Gastar Ouro em coisas fora da comida: equipamento (tênis, roupa, barra), experiências (cinema, massagem).
- **Problema:** o Ouro de hoje mal dá para a comida de sexta a domingo; itens caros levariam meses.
- **Alternativa pensada: Recompensas de Portão.** O jogador cadastra um prêmio real para cada rank (ex.: tênis
  no D, roupa de treino no C, relógio GPS no B). Fica trancado e abre com animação quando ele sobe de rank. Não
  usa Ouro.

### Outras classes (em espera)
Na escolha de classe do rank D aparecem **Mago, Guerreiro, Assassino e Tanque** como "Em construção". Só o
Necromante está pronto.
- **Princípio (Daniel):** cada classe tem que ser **colecionável**, como o Necromante coleciona sombras (o exército
  com cavaleiros e, um dia, o Marechal). Falta definir o que Mago, Guerreiro, Assassino e Tanque colecionam. O
  Daniel vai pensar.
- **As 4 peças de cada classe:** combustível (o esforço real que alimenta), coleção, poderes (só mais recompensa ou
  escolha; nunca treino mais leve nem penalidade menor) e escada de títulos própria.
- **Pilares que foram propostos (rascunho, não aprovado):** Mago = constância (missões seguidas, impulsos) e
  mana; Guerreiro = volume (repetições) e forja; Assassino = corrida (km e ritmo) e marcas de caça; Tanque =
  resistência e corpo (prancha, séries longas, dias na meta de calorias) e armadura.
- **Troca de classe (decidido):** liberada depois de X níveis (sugestão: 20) desde a última escolha; custa 1
  nível; a classe nova começa do zero; dá para alternar, e a anterior fica guardada com os seus soldados e
  conquistas; os títulos exibidos refletem a classe atual.
- **A decidir:** o valor de X. Os equipamentos passam a ser da classe (ver "Arsenal do Necromante").

### Grandes Recompensas por rank (próxima conversa)
Além do Comandante e dos títulos, uma única **mega recompensa** a cada rank, para cada subida ter a empolgação
que a mudança de classe no rank D tem. O Daniel ainda está pensando.

### Arsenal: o que ficou para depois
O Arsenal do Necromante, o HP com o dia de folga e os Portões do Inferno e do Trono estão no app (regras no README).
Ficaram para depois:
- **Arsenal das outras classes** (Mago, Guerreiro, Assassino, Tanque), quando elas saírem do "Em construção".
- **Sons próprios de cada item:** hoje cada item já tem um som sintetizado diferente (timbre pelo tipo, nota pela
  posição no catálogo). Melhorar na conversa de sons e efeitos.
- **Poder extra da Foice e de outros Épicos:** hoje só o Anel do Domínio tem um poder extra (invocar todos os
  Comandantes). Dá para mudar qualquer poder depois, inclusive o do Anel: o poder é calculado na hora, então o
  item que você já tem passa a valer a regra nova.

### Desenho único para cada sombra (em conversa)
O Daniel quer que cada uma das 100 sombras tenha um desenho só dela, "quase uma NFT". A identidade (corpo, arma,
marcas, cor dos olhos) continua igual quando ela evolui; o grau muda o capacete e a armadura. Ver a conversa antes de
implementar.

### Recompensas: próximos passos
- **Portões de corrida:** hoje os Portões são de calistenia (peso do corpo). Com a Corrida ativa, poderiam pedir uma
  distância rastreada pelo GPS.
- **Aviso no Android quando um Portão abrir** (hoje ele aparece ao abrir o app).
- **Arte das sombras:** desenhada em SVG pelo próprio app (silhuetas originais). Dá para trocar por imagens feitas
  pelo Daniel no futuro.
- **Comandantes dos ranks C a S:** nomes e poderes já definidos no código (aparecem como "???" até o chefe cair).

### Trilhas em construção
Academia, Ciclismo, Natação e Híbrido aparecem como "Building…".

### Ajustes do modelo de treino (do documento "como o treino é montado")
- Calorias da missão por esforço feito (séries), não só pelo tempo entre os pontos.
- Calibragem que também baixa o alvo quando o máximo está abaixo da tabela, com um piso.
- Teste de Rank dividido em 2 dias (parte de cima / pernas e core).

## Descartadas (para lembrar o porquê)
- **Volta por cima e bônus de sequência:** recompensa extra por voltar depois de uma falta e XP crescente com
  a sequência. O Daniel preferiu não.
- **Premiar as respostas da Condição** (sono, foco, celular na cama): prêmio criaria tentação de marcar "sim" sem
  ser. Desde 23/11/2026 a Condição dá +5 XP só por registrar o dia inteiro, seja qual for a resposta.
- **Modelo A de duas trilhas** (principal + extra valendo menos): substituído pelas várias trilhas ativas.
