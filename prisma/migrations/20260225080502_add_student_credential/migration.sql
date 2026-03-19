-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StudentCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mbkCompleted" BOOLEAN NOT NULL DEFAULT false,
    "psbkCompleted" BOOLEAN NOT NULL DEFAULT false,
    "exam1Completed" BOOLEAN NOT NULL DEFAULT false,
    "exam2Completed" BOOLEAN NOT NULL DEFAULT false,
    "exam3Completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentCredential_userId_key" ON "StudentCredential"("userId");

-- AddForeignKey
ALTER TABLE "StudentCredential" ADD CONSTRAINT "StudentCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
