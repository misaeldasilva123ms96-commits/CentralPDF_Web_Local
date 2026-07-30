# Auditoria técnica — Central PDF & Imagem 1.0.3

Data: 30/07/2026

## Escopo

- aplicação web, service worker e carregamento de motores opcionais;
- servidor local Go e executável distribuído;
- testes JavaScript, Python/Playwright e Go;
- documentação de instalação, privacidade e segurança;
- automação de testes no GitHub Actions.

## Achados corrigidos

### 1. Motores remotos eram executados sem consentimento explícito

Quando os arquivos de `vendor` não existiam, a página carregava automaticamente JavaScript de CDNs. Embora os documentos não fossem enviados por uma rota da aplicação, esse código era executado no mesmo contexto do navegador que processa arquivos selecionados pelo usuário.

Correção: o carregamento remoto agora fica bloqueado por padrão. A autorização é registrada somente após o usuário confirmar **Preparar uso offline**. PDF.js, pdf-lib, LibPDF, Tesseract, UTIF e heic2any respeitam a mesma decisão. Um teste de navegador verifica que nenhuma requisição externa ocorre antes da autorização.

Risco residual: os downloads autorizados são fixados por versão, mas ainda dependem da disponibilidade e integridade dos fornecedores externos. Para documentos sigilosos, recomenda-se executar `PREPARAR_OFFLINE.bat` previamente em uma rede confiável e usar apenas os motores locais.

### 2. Endpoint local de encerramento não autenticado

O servidor expunha `POST /__shutdown` sem token e sem uso pela interface. Mesmo limitado a `127.0.0.1` e porta aleatória, o endpoint ampliava desnecessariamente a superfície local de negação de serviço.

Correção: o endpoint foi removido do código e do executável recompilado. Testes Go garantem que a rota retorna `404`, que `/__health` aceita somente `GET` e que os cabeçalhos defensivos continuam presentes.

### 3. Suíte de navegador não era portátil

Os testes Playwright exigiam `/usr/bin/chromium`, impedindo sua execução no Windows. O teste do servidor também procurava o botão de diagnóstico no local anterior ao menu **Configurações**.

Correção: o Playwright agora usa o navegador gerenciado pela própria ferramenta, o teste navega pelo menu atual e as dependências estão declaradas em `requirements-test.txt`.

## Prevenção adicionada

- workflow de CI para pushes e pull requests;
- verificação de sintaxe de todos os JavaScript;
- execução das suítes Node e Python/Playwright;
- `go test` e `go vet` para o servidor;
- testes específicos para consentimento de motores remotos e superfície HTTP local.

## Próximas melhorias recomendadas

1. Publicar checksums SHA-256 dos motores baixados por `PREPARAR_OFFLINE.bat` e falhar quando houver divergência.
2. Separar scripts de geração de prévias dos testes executáveis para evitar execução acidental em CI.
3. Avaliar uma política CSP compatível com workers e blobs usados pelos motores PDF/OCR.
