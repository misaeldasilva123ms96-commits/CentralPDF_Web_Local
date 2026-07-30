# Testes recomendados — versão 0.7

1. Proteja um PDF pequeno com AES-256 e confirme que o leitor solicita senha.
2. Teste uma senha incorreta e confirme que o arquivo não abre.
3. Remova a senha usando a senha administrativa e confirme que a nova cópia abre sem solicitação.
4. Gere diagnóstico antes e depois da proteção e compare `criptografado` e permissões.
5. Use um PDF com formulário preenchido, fixe os campos e confirme que não são mais editáveis.
6. Teste recuperação com uma cópia de PDF que apresenta erro de índice/xref.
7. Teste dois PDFs simultaneamente e confira o ZIP.
8. Confirme que os originais permanecem inalterados.

Nunca faça o primeiro teste com o único exemplar de um documento importante.
