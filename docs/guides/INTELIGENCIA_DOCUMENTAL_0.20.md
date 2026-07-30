# Inteligência documental local — versão 0.20

## 1. Assistente documental

Use para resumir documentos, localizar cláusulas e responder perguntas com evidências. O relatório informa arquivo e página das passagens encontradas.

Exemplos de perguntas:

- Qual é a vigência do contrato?
- Qual valor foi informado na nota fiscal?
- Existe cláusula de reajuste?
- Qual é a validade da certidão?

A resposta é extrativa. Ela não inventa conteúdo e não substitui a leitura integral.

## 2. Extração estruturada

Gera CSV, JSON e HTML com:

- CNPJ e CPF.
- Datas e validades.
- Valores em reais.
- Números de notas fiscais.
- Contratos, processos e códigos.
- E-mails.
- Situação textual de certidões.

Uma expressão regular personalizada pode localizar códigos internos, como `PED-[0-9]{6}`.

## 3. Auditoria documental

Cruza documentos relacionados e produz achados por severidade. O perfil de compras permite informar data de lançamento e pagamento.

Regras disponíveis:

- Comparar CNPJ entre arquivos.
- Comparar contratos, processos e códigos.
- Mapear valores coincidentes ou isolados.
- Identificar certidão positiva ou situação irregular.
- Verificar se a validade localizada termina antes do pagamento.
- Aplicar a regra opcional de oito dias após o lançamento quando não há vencimento expresso.

Os achados são indícios e precisam ser confirmados nas fontes.

## 4. Classificar e renomear

Classifica documentos como contrato, aditivo, nota fiscal, CND, medição, relatório, atestado, proposta, comprovante, formulário ou documento genérico.

Variáveis de nome:

- `{tipo}`
- `{data}`
- `{numero}`
- `{cnpj}`
- `{original}`

Exemplo:

`{tipo}_{data}_{numero}`

O ZIP pode incluir cópias com os nomes sugeridos. Os arquivos originais não são alterados.

## OCR e documentos digitalizados

Os módulos analisam texto selecionável. Quando o PDF é formado por imagens, execute primeiro:

`OCR e PDF pesquisável → Assistente documental`

ou use os fluxos “Digitalizar e analisar” e “Digitalizar e auditar”.

## Privacidade

Todo o processamento ocorre no navegador. A versão 0.20 não exige uma chave de API e não envia documentos para um provedor de inteligência artificial.
