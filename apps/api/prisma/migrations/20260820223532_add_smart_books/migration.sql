-- CreateEnum
CREATE TYPE "BookLevel" AS ENUM ('PRE_A1', 'A1', 'A2', 'B1', 'B2');

-- CreateTable
CREATE TABLE "SmartBook" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" "BookLevel" NOT NULL,
    "content" TEXT NOT NULL,
    "coverPrompt" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmartBook_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SmartBook" ADD CONSTRAINT "SmartBook_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
