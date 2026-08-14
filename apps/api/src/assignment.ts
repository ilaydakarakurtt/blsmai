import { Router } from "express";
import { prisma } from "./prisma";
import { requireAuth, AuthRequest } from "./middleware";

export const assignmentRouter = Router();

// Öğretmen bir quiz'i sınıfa ödev olarak atar
assignmentRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { quizId, classroomId, dueDate } = req.body;
    if (!quizId || !classroomId) {
      return res.status(400).json({ error: "quizId ve classroomId gerekli" });
    }

    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, ownerId: req.userId },
    });
    if (!quiz) return res.status(404).json({ error: "Quiz bulunamadı" });

    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, ownerId: req.userId },
    });
    if (!classroom) return res.status(404).json({ error: "Sınıf bulunamadı" });

    const assignment = await prisma.assignment.create({
      data: {
        quizId,
        classroomId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    res.json(assignment);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Öğretmenin bir quiz için verdiği ödevleri listele
assignmentRouter.get("/quiz/:quizId", requireAuth, async (req: AuthRequest, res) => {
  const assignments = await prisma.assignment.findMany({
    where: { quiz: { id: req.params.quizId as string, ownerId: req.userId } },
    include: { classroom: true, submissions: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    assignments.map((a) => ({
      id: a.id,
      classroomName: a.classroom.name,
      dueDate: a.dueDate,
      createdAt: a.createdAt,
      submissionCount: a.submissions.length,
    }))
  );
});

// Öğrencinin kendisine atanmış ödevleri listele
assignmentRouter.get("/mine", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { joinedClassrooms: true },
  });
  if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

  const classroomIds = user.joinedClassrooms.map((c) => c.id);

  const assignments = await prisma.assignment.findMany({
    where: { classroomId: { in: classroomIds } },
    include: {
      quiz: { include: { questions: true } },
      classroom: true,
      submissions: { where: { studentId: req.userId } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    assignments.map((a) => ({
      id: a.id,
      quizId: a.quizId,
      quizTitle: a.quiz.title,
      classroomName: a.classroom.name,
      questionCount: a.quiz.questions.length,
      dueDate: a.dueDate,
      completed: a.submissions.length > 0 && a.submissions[0].completedAt !== null,
      score: a.submissions[0]?.score ?? null,
    }))
  );
});

// Ödevin sorularını getir (öğrenci çözmeye başlarken)
assignmentRouter.get("/:id/questions", requireAuth, async (req: AuthRequest, res) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id: req.params.id as string },
    include: { quiz: { include: { questions: { orderBy: { order: "asc" } } } } },
  });
  if (!assignment) return res.status(404).json({ error: "Ödev bulunamadı" });

  res.json({
    id: assignment.id,
    quizTitle: assignment.quiz.title,
    questions: assignment.quiz.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options,
      // correctIndex kasıtlı olarak gönderilmiyor
    })),
  });
});

// Öğrenci ödevi tamamlayıp cevaplarını gönderir
assignmentRouter.post("/:id/submit", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { answers } = req.body; // [{ questionId, selectedIndex }]
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: "answers dizisi gerekli" });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id as string },
      include: { quiz: { include: { questions: true } } },
    });
    if (!assignment) return res.status(404).json({ error: "Ödev bulunamadı" });

    const questionMap = new Map(assignment.quiz.questions.map((q) => [q.id, q]));

    let correctCount = 0;
    const answerRecords = answers.map((a: { questionId: string; selectedIndex: number }) => {
      const question = questionMap.get(a.questionId);
      const correct = question ? question.correctIndex === a.selectedIndex : false;
      if (correct) correctCount++;
      return {
        questionId: a.questionId,
        selectedIndex: a.selectedIndex,
        correct,
      };
    });

    const score = Math.round((correctCount / assignment.quiz.questions.length) * 100);

    const submission = await prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: req.userId!,
        },
      },
      create: {
        assignmentId: assignment.id,
        studentId: req.userId!,
        score,
        completedAt: new Date(),
        answers: { create: answerRecords },
      },
      update: {
        score,
        completedAt: new Date(),
      },
    });

    res.json({ score, correctCount, total: assignment.quiz.questions.length });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});
// Bir ödevin detaylı sonuçlarını getir (kim cevapladı, kim cevaplamadı)
assignmentRouter.get("/:id/results", requireAuth, async (req: AuthRequest, res) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id: req.params.id as string },
    include: {
      quiz: { include: { questions: true } },
      classroom: { include: { students: true } },
      submissions: { include: { student: true } },
    },
  });

  if (!assignment) return res.status(404).json({ error: "Ödev bulunamadı" });
  if (assignment.quiz.ownerId !== req.userId) {
    return res.status(403).json({ error: "Bu ödeve erişim yetkin yok" });
  }

  const submissionMap = new Map(assignment.submissions.map((s) => [s.studentId, s]));

  const results = assignment.classroom.students.map((student) => {
    const submission = submissionMap.get(student.id);
    return {
      studentId: student.id,
      studentName: student.name,
      completed: !!submission?.completedAt,
      score: submission?.score ?? null,
    };
  });

  res.json({
    id: assignment.id,
    quizTitle: assignment.quiz.title,
    classroomName: assignment.classroom.name,
    totalQuestions: assignment.quiz.questions.length,
    results,
  });
});
// Öğretmenin tüm quizlerindeki ödevleri listele
assignmentRouter.get("/mine/teacher", requireAuth, async (req: AuthRequest, res) => {
  const assignments = await prisma.assignment.findMany({
    where: { quiz: { ownerId: req.userId } },
    include: {
      quiz: true,
      classroom: { include: { students: true } },
      submissions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    assignments.map((a) => ({
      id: a.id,
      quizId: a.quizId,
      quizTitle: a.quiz.title,
      classroomName: a.classroom.name,
      totalStudents: a.classroom.students.length,
      submissionCount: a.submissions.length,
      createdAt: a.createdAt,
    }))
  );
});