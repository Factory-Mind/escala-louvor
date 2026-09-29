-- Som e projecao viram posicoes separadas. Quem opera o som e JORGE, PEDRO,
-- RUD e LEANDRO; o resto de quem cobria SOM_PROJECAO fica na projecao.
UPDATE "MemberRole" SET "role" = 'SOM'
WHERE "role" = 'SOM_PROJECAO'
  AND "memberId" IN (SELECT "id" FROM "Member" WHERE "name" IN ('JORGE', 'PEDRO', 'RUD', 'LEANDRO'));

UPDATE "MemberRole" SET "role" = 'PROJECAO' WHERE "role" = 'SOM_PROJECAO';

DELETE FROM "Formation" WHERE "role" = 'SOM_PROJECAO';
INSERT OR IGNORE INTO "Formation" ("role", "count") VALUES ('SOM', 1), ('PROJECAO', 1);

-- Escalas ja salvas: em cada culto a primeira vaga vai para quem e do som (se
-- houver) e as demais para a projecao.
UPDATE "ScheduleAssignment"
SET "role" = ranked."newRole", "position" = ranked."newPosition"
FROM (
  SELECT
    "id",
    CASE WHEN rn = 1 THEN 'SOM' ELSE 'PROJECAO' END AS "newRole",
    CASE WHEN rn = 1 THEN 0 ELSE rn - 2 END AS "newPosition"
  FROM (
    SELECT
      a."id",
      ROW_NUMBER() OVER (
        PARTITION BY a."entryId"
        ORDER BY
          CASE WHEN a."memberId" IN (SELECT "memberId" FROM "MemberRole" WHERE "role" = 'SOM') THEN 0 ELSE 1 END,
          a."position"
      ) AS rn
    FROM "ScheduleAssignment" a
    WHERE a."role" = 'SOM_PROJECAO'
  )
) AS ranked
WHERE "ScheduleAssignment"."id" = ranked."id";
