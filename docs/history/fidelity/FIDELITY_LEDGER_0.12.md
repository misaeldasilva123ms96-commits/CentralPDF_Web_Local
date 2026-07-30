# Registro de fidelidade visual — versão 0.12

Referência: `DESIGN_CONCEPT_0.12.png`.
Implementação verificada: `PREVIA_LAYOUT_EXPANDIDO_0.12.png`, `PREVIA_LAYOUT_COMPACTO_0.12.png`, `PREVIA_MODO_FOCO_0.12.png` e `PREVIA_MENU_MOBILE_0.12.png`.

## Pontos comparados

1. **Estrutura de três regiões**
   - Referência: navegação esquerda, documento central e propriedades à direita.
   - Implementação: preservada, com possibilidade de recolher cada região lateral.

2. **Barra lateral compacta**
   - Referência: controle de recolhimento próximo ao menu.
   - Implementação: faixa de 70 px com ícones, estado ativo e tooltips.

3. **Comandos de layout no cabeçalho**
   - Referência: controles discretos próximos às ações principais.
   - Implementação: alternar menu, foco, propriedades e preferências no topo.

4. **Paleta e hierarquia**
   - Referência: fundo branco, cinza neutro e acento roxo.
   - Implementação: mesma direção, mantendo contraste e estados de foco.

5. **Área central do editor**
   - Referência: documento dominante com ferramentas fixas.
   - Implementação: modo foco amplia o canvas e mantém toolbar durante rolagem.

6. **Painel de propriedades**
   - Referência: inspetor contextual organizado em grupos.
   - Implementação: preservado e recolhível sem perder o estado do objeto.

7. **Responsividade**
   - Referência: navegação clara sem ocupar permanentemente a tela.
   - Implementação: menu móvel em gaveta com backdrop e fechamento automático.

## Desvios intencionais

- O nome do produto e os 21 módulos existentes foram preservados.
- Não foram adicionados avatares, conta de usuário ou funções em nuvem.
- O modo compacto mantém todos os módulos acessíveis por ícone em vez de reduzir o conjunto de ferramentas.

Não foram identificadas diferenças materiais que impeçam o uso do fluxo proposto.
