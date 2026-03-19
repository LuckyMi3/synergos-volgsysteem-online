/*
  Warnings:

  - You are about to drop the column `apolloId` on the `Cohort` table. All the data in the column will be lost.
  - You are about to drop the column `rubricKey` on the `Cohort` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Cohort` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `Cohort` table. All the data in the column will be lost.
  - You are about to drop the `Assessment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CohortStudent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CohortTeacher` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Score` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Student` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Teacher` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeacherReview` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeacherScore` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `naam` to the `Cohort` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uitvoeringId` to the `Cohort` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- DropForeignKey
ALTER TABLE "Assessment" DROP CONSTRAINT "Assessment_studentId_fkey";

-- DropForeignKey
ALTER TABLE "CohortStudent" DROP CONSTRAINT "CohortStudent_cohortId_fkey";

-- DropForeignKey
ALTER TABLE "CohortStudent" DROP CONSTRAINT "CohortStudent_studentId_fkey";

-- DropForeignKey
ALTER TABLE "CohortTeacher" DROP CONSTRAINT "CohortTeacher_cohortId_fkey";

-- DropForeignKey
ALTER TABLE "CohortTeacher" DROP CONSTRAINT "CohortTeacher_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "Score" DROP CONSTRAINT "Score_assessmentId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherReview" DROP CONSTRAINT "TeacherReview_assessmentId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherReview" DROP CONSTRAINT "TeacherReview_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherScore" DROP CONSTRAINT "TeacherScore_teacherId_fkey";

-- DropIndex
DROP INDEX "Cohort_apolloId_key";

-- DropIndex
DROP INDEX "Cohort_rubricKey_year_key";

-- AlterTable
ALTER TABLE "Cohort" DROP COLUMN "apolloId",
DROP COLUMN "rubricKey",
DROP COLUMN "title",
DROP COLUMN "year",
ADD COLUMN     "naam" TEXT NOT NULL,
ADD COLUMN     "traject" TEXT,
ADD COLUMN     "uitvoeringId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Assessment";

-- DropTable
DROP TABLE "CohortStudent";

-- DropTable
DROP TABLE "CohortTeacher";

-- DropTable
DROP TABLE "Score";

-- DropTable
DROP TABLE "Student";

-- DropTable
DROP TABLE "Teacher";

-- DropTable
DROP TABLE "TeacherReview";

-- DropTable
DROP TABLE "TeacherScore";

-- DropEnum
DROP TYPE "ReviewStatus";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "crmCustomerId" TEXT NOT NULL,
    "voornaam" TEXT NOT NULL,
    "tussenvoegsel" TEXT,
    "achternaam" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobiel" TEXT,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "coachNaam" TEXT,
    "trajectStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_crmCustomerId_key" ON "User"("crmCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_cohortId_key" ON "Enrollment"("userId", "cohortId");

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
