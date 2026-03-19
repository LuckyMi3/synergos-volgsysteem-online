/*
  Warnings:

  - A unique constraint covering the columns `[uitvoeringId]` on the table `Cohort` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Cohort_uitvoeringId_key" ON "Cohort"("uitvoeringId");
