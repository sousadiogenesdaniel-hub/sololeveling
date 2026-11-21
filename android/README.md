# O Sistema — app Android

Casca nativa do app web. Abre o app publicado (`https://sousadiogenesdaniel-hub.github.io/sololeveling/`)
num WebView preso a esse endereço e adiciona o que o navegador não faz:

- **Bloqueio de apps na Zona de Penalidade**: WhatsApp, WhatsApp Business, Gmail, Instagram, TikTok, YouTube,
  Facebook, Netflix, Crunchyroll e Prime Video (todos por padrão; dá para desmarcar fora da penalidade).
  Bancos, telefone e Ajustes nunca podem ser bloqueados: a lista fica fixa no código Android.
- **Bloqueio mesmo sem abrir o app:** se passar um dia cobrado sem missão concluída, o Android deduz a falta
  sozinho e bloqueia (`Prefs.missed`, coberta por testes em `PrefsTest`).
- **Desbloqueio de emergência**: espera de 10 min depois do pedido (dá para desistir), libera 15 min, 1 por dia,
  custa XP e Ouro. **Desligar o bloqueio só vale 24 h depois** do pedido.
- **Lembrete** à noite se a missão do dia não foi feita. Backup salvo em Downloads. Tela ligada durante o
  rastreamento por GPS.

Sem bibliotecas de terceiros: só o SDK do Android.

## Segurança: o que o app pode e não pode

| Permissão | Para quê | O que NÃO permite |
|---|---|---|
| Acesso ao uso | Saber qual app está na frente (nome do pacote) | Ver conteúdo, mensagens ou senhas |
| Sobrepor a outros apps | Desenhar a tela da Zona de Penalidade por cima dos apps bloqueados | Ler a tela ou tocar por você |
| Localização | Ponto e rastreamento (o app web já usava) | — |
| Notificações | Lembrete e aviso da penalidade | Ler notificações de outros apps |

O app **não pede** Acessibilidade, acesso a notificações, SMS, contatos, microfone nem câmera própria.
A página fala com o Android só pelos comandos de `NativeBridge.java`; ela não recebe a lista de apps usados.
Não existe servidor: nada é enviado a lugar nenhum.

## Build

Requer JDK 17+ e Android SDK (platform 35, build-tools 35).

```bash
export SISTEMA_KEYSTORE=/caminho/o-sistema.jks
export SISTEMA_KS_PASS='senha-da-chave'
gradle assembleRelease testReleaseUnitTest lintRelease
cp app/build/outputs/apk/release/app-release.apk ../download/o-sistema.apk
```

Depois atualize `../download/versao.json` (aumente `versionCode` aqui em `app/build.gradle` e lá). O app
avisa sozinho quando há versão nova.

**A chave de assinatura não fica neste repositório (público).** Sem ela não dá para publicar atualizações que
instalem por cima: seria preciso desinstalar e reinstalar (e restaurar o backup).

## Estrutura

```
MainActivity.java   WebView preso ao site, GPS, câmera/galeria, aviso de versão nova
NativeBridge.java   os únicos comandos que a página pode chamar
Prefs.java          estado do bloqueio e as regras (quando bloquear, emergência, desligar em 24 h)
BlockerService.java serviço que cobre os apps bloqueados enquanto houver penalidade
Scheduler.java      virada do dia, fim do desbloqueio, lembrete; notificações
```
