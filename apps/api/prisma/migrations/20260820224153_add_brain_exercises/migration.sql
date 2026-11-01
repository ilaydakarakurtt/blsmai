-- CreateEnum
CREATE TYPE "ExerciseCategory" AS ENUM ('MEMORY', 'LOGIC', 'MATH', 'ATTENTION');

-- CreateTable
CREATE TABLE "BrainExerciseSession" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "category" "ExerciseCategory" NOT NULL,
    "score" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainExerciseSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BrainExerciseSession" ADD CONSTRAINT "BrainExerciseSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
