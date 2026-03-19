-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "TeacherReview" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "correctedScore" INTEGER,
    "feedback" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherReview_assessmentId_key" ON "TeacherReview"("assessmentId");

-- CreateIndex
CREATE INDEX "TeacherReview_teacherId_idx" ON "TeacherReview"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherReview_status_idx" ON "TeacherReview"("status");

-- AddForeignKey
ALTER TABLE "TeacherReview" ADD CONSTRAINT "TeacherReview_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
