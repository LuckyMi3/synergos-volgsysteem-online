-- Align migration history with existing DB state (Uitvoering table + Cohort constraint changes)

-- 1) Create Uitvoering table
CREATE TABLE "Uitvoering" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Uitvoering_pkey" PRIMARY KEY ("id")
);

-- 2) Drop old unique index on Cohort.uitvoeringId (old schema)
DROP INDEX "Cohort_uitvoeringId_key";

-- 3) New unique index: (uitvoeringId, naam)
CREATE UNIQUE INDEX "Cohort_uitvoeringId_naam_key"
ON "Cohort"("uitvoeringId", "naam");

-- 4) Add FK Cohort.uitvoeringId -> Uitvoering.id
ALTER TABLE "Cohort"
ADD CONSTRAINT "Cohort_uitvoeringId_fkey"
FOREIGN KEY ("uitvoeringId") REFERENCES "Uitvoering"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;