# Testes — tema escuro e barra lateral (1.0.4)

## Escopo

- contraste e legibilidade do tema escuro;
- hierarquia entre fundo, painel principal, cartões e painel de propriedades;
- largura da barra lateral compacta;
- ausência de rolagem horizontal na barra lateral;
- integridade da aplicação e inicialização do JavaScript.

## Resultados

- `tests/dark-theme-1.0.4.test.py`: aprovado;
- `tests/static_integrity.py`: aprovado;
- `tests/layout-controls.test.py`: aprovado;
- `tests/stable-release-1.0.test.py`: aprovado;
- `tests/app-load-smoke.test.js`: aprovado.

A validação visual foi realizada em viewport de 1365 × 599 px. A barra compacta ficou com 69 px úteis, sem diferença entre `clientWidth` e `scrollWidth`.
