-- CreateTable
CREATE TABLE "TeacherScore" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "correctedScore" INTEGER,
    "feedback" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherScore_assessmentId_idx" ON "TeacherScore"("assessmentId");

-- CreateIndex
CREATE INDEX "TeacherScore_teacherId_idx" ON "TeacherScore"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherScore_assessmentId_teacherId_themeId_questionId_key" ON "TeacherScore"("assessmentId", "teacherId", "themeId", "questionId");
