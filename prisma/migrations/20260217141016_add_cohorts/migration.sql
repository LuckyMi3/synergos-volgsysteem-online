-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rubricKey" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortStudent" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortTeacher" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_rubricKey_year_key" ON "Cohort"("rubricKey", "year");

-- CreateIndex
CREATE INDEX "CohortStudent_studentId_idx" ON "CohortStudent"("studentId");

-- CreateIndex
CREATE INDEX "CohortStudent_cohortId_idx" ON "CohortStudent"("cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "CohortStudent_cohortId_studentId_key" ON "CohortStudent"("cohortId", "studentId");

-- CreateIndex
CREATE INDEX "CohortTeacher_teacherId_idx" ON "CohortTeacher"("teacherId");

-- CreateIndex
CREATE INDEX "CohortTeacher_cohortId_idx" ON "CohortTeacher"("cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "CohortTeacher_cohortId_teacherId_key" ON "CohortTeacher"("cohortId", "teacherId");

-- AddForeignKey
ALTER TABLE "CohortStudent" ADD CONSTRAINT "CohortStudent_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortStudent" ADD CONSTRAINT "CohortStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortTeacher" ADD CONSTRAINT "CohortTeacher_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
