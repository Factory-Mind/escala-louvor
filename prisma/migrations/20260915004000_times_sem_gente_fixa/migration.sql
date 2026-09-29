-- Times deixam de ter gente fixa: a escala passa a ser montada a partir de
-- quem esta disponivel, e o time vira so o rotulo e a cor da linha.
PRAGMA foreign_keys=off;
DROP TABLE "TeamSlot";
PRAGMA foreign_keys=on;

-- Quantas pessoas cada posicao leva em cada culto.
CREATE TABLE "Formation" (
    "role" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL
);
