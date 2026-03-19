/*
  Warnings:

  - A unique constraint covering the columns `[apolloId]` on the table `Cohort` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[apolloId]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[apolloId]` on the table `Teacher` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Cohort" ADD COLUMN     "apolloId" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "apolloId" TEXT;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "apolloId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_apolloId_key" ON "Cohort"("apolloId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_apolloId_key" ON "Student"("apolloId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_apolloId_key" ON "Teacher"("apolloId");
