# Escala de Louvor

Monta a escala mensal do time de louvor e exporta a planilha pronta para postar —
com as mesmas colunas e as mesmas cores por time da planilha que o líder usava
no Google Sheets.

## Como funciona

**Ninguém é fixo em um time.** No fim do mês o líder marca em *Disponibilidade*
quem não vai poder no mês seguinte — a tela agrupa as pessoas por instrumento e
mostra, dia a dia, quantas sobram em cada posição, avisando antes de gerar se
alguma não fecha. Ao clicar em *Gerar*, o app monta cada culto
sorteando entre quem está disponível naquela data, preferindo quem tocou menos no
mês — por isso os vocais mudam de um culto para o outro. Se faltar gente de algum
instrumento, a célula vira `A DEFINIR` e o aviso aparece no topo da tela.

**O time é só a cor.** `TIME 1..4` não tem gente: é o rótulo e a cor que a linha
recebe na planilha. As cores giram de um dia de culto para o outro e continuam de
onde pararam no mês anterior.

**A formação diz quantos entram.** Em *Times e formação* o líder define quantas
pessoas cada posição leva (1 vocal masculino, 2 femininos, 1 teclado...). Vale
para todos os cultos.

**Domingo tem uma escalação só.** Manhã e noite saem com as mesmas pessoas e a
mesma cor — quem ensaiou toca nos dois. Travar a linha da manhã trava a noite
junto, senão o domingo se dividiria.

**Um gestor por culto.** Integrantes marcados como *Gestor* em *Integrantes* podem
ser o responsável. Cada culto recebe um, alternando ao longo do mês, e o nome sai
como `DIGO/GESTOR` na planilha. Se o sorteio não pegar nenhum gestor, o app troca
uma vaga por um gestor que toque aquele instrumento e esteja livre.

**Ajuste manual vale mais que o sorteio.** Clique em qualquer nome para trocar a
pessoa, mover a marca de gestor ou deixar a vaga em aberto. Toda escolha manual
já fica travada, e o cadeado na ponta direita trava a linha inteira. Ao clicar em
*Gerar de novo*, o que está travado é preservado e o resto é sorteado outra vez.

## Rodando

```bash
pnpm install
pnpm prisma migrate dev   # cria prisma/dev.db
pnpm db:seed              # popula integrantes e times
pnpm dev                  # http://localhost:3000
```

Para zerar o banco e repopular do começo: `pnpm db:reset`.

## Testes

```bash
pnpm test    # gerador de escala e exportação
pnpm build   # checagem de tipos do Next
```

Os testes cobrem o coração do app: as datas de culto do mês, o rodízio de cores,
o sorteio a partir de quem está disponível, o equilíbrio entre quem toca mais e
quem toca menos, a igualdade entre manhã e noite de domingo, a garantia de um
gestor por culto, as travas, a reprodutibilidade por seed e a formatação do
`.xlsx` (cores, bordas, negrito).

## Estrutura

| Caminho | O que é |
|---|---|
| `src/lib/scheduler/` | O gerador. Funções puras, sem banco — é onde os testes vivem. |
| `src/lib/export/` | Converte a escala em `.xlsx` colorido e `.csv`. |
| `src/server/queries.ts` | Leitura do banco no formato que o gerador espera. |
| `src/app/*/actions.ts` | Server actions de cada tela. |
| `prisma/seed.ts` | Integrantes, cores dos times e formação inicial. |

## Notas técnicas

- **SQLite não tem `enum` no Prisma.** `role` e `service` são `String` no banco;
  os tipos reais estão em `src/lib/domain/types.ts` e são validados com zod na
  borda.
- **A exportação usa `exceljs`**, não `xlsx`/SheetJS: a versão community do
  SheetJS não escreve estilo de célula, e sem isso não há como reproduzir as cores.
- **Datas são sempre UTC à meia-noite**, para o dia não escorregar por fuso.
- **Prisma 7 exige driver adapter**: `@prisma/adapter-better-sqlite3`, configurado
  em `src/lib/db.ts`. `better-sqlite3` tem binário nativo e está em
  `serverExternalPackages` no `next.config.ts`.
