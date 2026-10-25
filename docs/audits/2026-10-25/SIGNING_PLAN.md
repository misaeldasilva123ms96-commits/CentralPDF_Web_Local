# Assinatura digital e Authenticode — estudo, sem integração

## Situação confirmada

A ferramenta **Assinar e rubricar** gera uma marca visual. Não usa certificado ICP-Brasil, PIN, chave privada ou provedor em nuvem. O editor exporta uma nova cópia; sua gravação por pdf-lib não é um mecanismo de preservação incremental de assinaturas.

LibPDF inclui recursos de leitura de campos de assinatura e dependências criptográficas/PKI de terceiros, mas sua presença no bundle não comprova uma implementação PAdES homologada. Nenhuma função atual foi apresentada como assinatura qualificada ou validada pelo ITI.

A auditoria acrescenta apenas detecção estrutural e aviso de risco. Uma fixture sintética com CMS autoassinado teve integridade verificada localmente; isso não é confiança pública, ICP-Brasil, DocMDP ou conformidade PAdES.

## Arquitetura proposta para PAdES/ICP-Brasil

1. **Pré-análise:** inventariar campos, ByteRange, revisões, assinaturas existentes, certificações DocMDP/FieldMDP, criptografia e permissões. Rejeitar alterações incompatíveis; não afirmar que toda assinatura existente pode ser preservada.
2. **Congelar os bytes:** editar/organizar antes da assinatura. A operação de assinatura recebe o PDF final e não deve passar depois pelo exportador visual. O original fica separado e seu hash é registrado localmente.
3. **Incremento específico:** usar biblioteca auditada/licenciada que escreva revisão incremental e reserve Contents/ByteRange de forma verificável. O modelo de edição/regravação atual não pode ser reutilizado para prometer preservação.
4. **Chave fora do app:** preferir HSM/serviço de assinatura com autenticação externa e autorização por transação. Alternativa local exige componente dedicado, autenticação de origem/token por sessão e integração com token/cartão via middleware suportado. O servidor Go atual não oferece essa API; ela precisaria de threat model e implementação próprios.
5. **Sem retenção de segredo:** chave privada, certificado A1 com chave e PIN não entram em projetos, localStorage, IndexedDB, logs ou telemetria. Tokens de sessão devem ser mínimos/efêmeros, e o aplicativo não recebe credenciais administrativas de um provedor.
6. **Rede explícita:** contratação de serviço, envio de documento ou hash e autenticação exigem autorização e informação clara sobre destinatário, região, retenção, metadados e custos. Não integrar silenciosamente pelo atual DSN Sentry; são propósitos diferentes.
7. **Validação separada:** validar CMS/digest, cadeia até âncoras corretas, política ICP-Brasil aplicável, revogação/OCSP/CRL e carimbo de tempo quando exigidos. PAdES B-B/B-T/B-LT/B-LTA têm requisitos diferentes; o perfil precisa ser escolhido antes de implementar.

Não se recomenda criar criptografia própria. Bibliotecas, licenças e capacidade de atualização incremental devem ser avaliadas com corpus real público/sintético antes da escolha. Uma assinatura autoassinada pode ter matemática íntegra e continuar sem cadeia confiável.

## Critérios de homologação

- PDF sem assinatura, assinado uma/múltiplas vezes e certificado com restrições; revisões incrementais válidas e inválidas.
- Bytes e assinatura anterior preservados quando a política permitir, com comparação de ByteRange e validação independente antes/depois.
- Rejeição de arquivo alterado, certificado expirado/revogado/não confiável, senha incorreta, cancelamento, timeout e repetição de transação.
- Nenhuma chave, PIN ou credencial em disco/log/projeto/telemetria; exame de tráfego e permissões com dados sintéticos.
- Verificação por leitor independente e **VALIDAR do ITI**, com autorização para qualquer envio ao serviço e evidência do perfil/cadeia efetivamente usados. Não enviar documentos reais de usuários para homologar.
- Testes nativos Windows, navegadores suportados e acessibilidade; revisão jurídica/institucional dos requisitos aplicáveis.

**Não implementado nesta PR:** assinatura PAdES, provedor comercial, integração A1/A3, API de assinatura no Go, selo ICP-Brasil, carimbo de tempo, validação de revogação ou submissão ao ITI.

## Custos e decisões antes de contratar

| Alternativa | Requisitos e custos potenciais |
| --- | --- |
| Certificado ICP-Brasil A1/A3 | Emissão/renovação por autoridade habilitada, validação de identidade; token/cartão/middleware no A3 e operação de suporte. Valores dependem de certificado, prazo e emissor. |
| Assinatura remota/HSM | Integração e autenticação, cobrança por transação/plano, custódia, SLA, retenção e eventual timestamp/validação. Confirmar se o provedor atende ao perfil escolhido e se recebe bytes ou hash. |
| Timestamp e validação de longo prazo | Contratação/limites de ACT, consulta de revogação e conservação de evidências; custos recorrentes e requisitos de disponibilidade. |
| Biblioteca e manutenção | Licença compatível, auditoria, atualizações, corpus, suporte multiplataforma e revisões de segurança. Não presumir que um pacote gratuito resolva a homologação. |

Preços não foram cotados e não há compromisso comercial. O plano deve incluir estimativa de volume e limites de cobrança antes de solicitar contratação.

## Authenticode do executável Windows

Atualmente o `.exe` não é assinado com Authenticode. SHA-256 comprova igualdade com um valor de referência; atestação GitHub comprova procedência do workflow/commit. Nenhum deles equivale ao certificado de editor reconhecido pelo Windows.

Opções a avaliar:

- **Certificado de assinatura de código OV/EV:** exige validação do titular, processo do emissor e armazenamento da chave conforme seus requisitos, normalmente hardware/HSM ou serviço gerenciado. Custos de emissão/renovação e token/HSM variam; EV não é garantia automática de reputação ou ausência de SmartScreen.
- **Serviço gerenciado de assinatura de artefatos:** elegibilidade/região/validação de identidade, perfil e plano/limites do fornecedor; custos por plano/volume e operação. Azure Artifact Signing é uma opção a avaliar, sem afirmar elegibilidade desta conta.
- **Certificado autoassinado:** útil em laboratório com confiança distribuída explicitamente, não resolve a confiança pública de distribuição para usuários e não deve ser apresentado como equivalente comercial.

Fluxo CI futuro: build determinístico **não assinado** → comparação byte a byte → assinatura em job protegido com aprovação → timestamp → `signtool verify /pa /all` em Windows → hashes e atestações dos artefatos finais assinados. A assinatura/timestamp altera os bytes; conservar o hash do build reproduzível e o hash do distribuído, sem comparar o arquivo assinado ao binário cru.

Segredos/chaves não devem ser versionados. Preferir identidade federada/OIDC e perfil restrito no HSM quando suportados; proteger ambiente, permissões e aprovação contra PRs não confiáveis. Acesso ao certificado é configuração administrativa separada.

SmartScreen considera assinatura, confiança/reputação e políticas do dispositivo. Assinar melhora identificação do editor, mas não garante ausência de aviso. Essa experiência exige teste real no Windows com o artefato distribuído.

## Referências para decisão e homologação

- [VALIDAR do ITI](https://validar.iti.gov.br/) e [Instituto Nacional de Tecnologia da Informação](https://www.gov.br/iti/pt-br).
- [ETSI — assinaturas eletrônicas e infraestruturas de confiança](https://www.etsi.org/technologies/electronic-signatures).
- [Microsoft SignTool](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool).
- [Azure Artifact Signing](https://learn.microsoft.com/en-us/azure/artifact-signing/overview) e [preços do serviço](https://azure.microsoft.com/en-us/pricing/details/artifact-signing/).

As referências orientam uma futura seleção; não substituem cotação, acesso ao fornecedor, validação ITI ou execução do fluxo de assinatura. Nenhum certificado foi comprado, segredo adicionado, provedor integrado ou funcionalidade publicada.
