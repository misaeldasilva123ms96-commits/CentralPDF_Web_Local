# Revisão e versão 3.0.0 — 05/11/2026

## Comentários reproduzidos e corrigidos

- Admin, #81: em 1366×768 o botão Sair estava em y=785. A sidebar agora permite rolagem e impede o encolhimento de seus elementos. O teste Chromium/Firefox verifica os limites do botão e executa o logout, além dos fluxos de autenticação anteriores.
- React, #82: o aviso de privacidade no escuro tinha contraste 2,35:1 no texto e 1,56:1 no ícone. As cores agora acompanham o tema; contraste final 5,96:1 no claro e 7,58:1 no escuro. O teste verifica 320/390/768/1440 px, ambos os temas, e união/download/reabertura de cinco páginas sintéticas.

Capturas e resultados: `evidence/review-fixes/`. O primeiro ajuste de contraste produziu 4,18:1 no claro; a execução reprovou e a cor foi corrigida antes do registro final.

## Versão e preservação

Versão atual 3.0.0, cache `centralpdf-v3.0.0-pages-51`. Histórico de releases e fixtures de migração conservam as versões originais. Migração de cache e importação real de projeto salvo na 2.0.1 passaram. Servidor Windows recompilado com Go 1.26.10; checksum, testes e vet passaram. Admin mantém sua versão independente 0.3.0 e passa a catalogar o produto 3.0.0.

Não foram alterados autenticação, MFA, autorização, banco ou motores. A revisão mantém os limites documentados de testes com fixtures, leitor de tela, zoom e toque em dispositivo físico.
