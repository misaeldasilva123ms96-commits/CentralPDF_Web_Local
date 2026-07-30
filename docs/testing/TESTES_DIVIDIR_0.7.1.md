# Testes do módulo Dividir PDF 0.7.1

Use um PDF de 10 páginas e confira:

1. Intervalos: `1-2;3-5;6,8-10` -> 3 PDFs.
2. Partes iguais: `2` -> 1-5 e 6-10.
3. Partes iguais: `3` -> 1-4, 5-7 e 8-10.
4. A cada 2 páginas -> 5 PDFs.
5. Cortes `2,5` -> 1-2, 3-5 e 6-10.
6. Uma página por arquivo -> 10 PDFs.
7. Pares/ímpares -> dois PDFs.
8. Grupo `1-2` apenas -> download direto de um PDF.
9. Grupo `1-2` com “páginas não mencionadas” -> 1-2 e 3-10.
10. Valores inválidos devem apresentar mensagem clara.
