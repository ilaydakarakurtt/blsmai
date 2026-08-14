import { Router } from "express";
import { prisma } from "./prisma";
import { requireAuth, AuthRequest } from "./middleware";

export const classroomRouter = Router();

function generateClassCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Öğretmen yeni bir sınıf oluşturur
classroomRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Sınıf adı gerekli" });

    let code = generateClassCode();
    while (await prisma.classroom.findUnique({ where: { code } })) {
      code = generateClassCode();
    }

    const classroom = await prisma.classroom.create({
      data: {
        name,
        code,
        ownerId: req.userId!,
      },
    });

    res.json(classroom);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Öğretmenin kendi sınıflarını listele
classroomRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  const classrooms = await prisma.classroom.findMany({
    where: { ownerId: req.userId },
    include: { students: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    classrooms.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      studentCount: c.students.length,
      createdAt: c.createdAt,
    }))
  );
});

// Sınıf detayı (öğrenci listesiyle)
classroomRouter.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const classroom = await prisma.classroom.findFirst({
    where: { id: req.params.id as string, ownerId: req.userId },
    include: { students: true },
  });
  if (!classroom) return res.status(404).json({ error: "Sınıf bulunamadı" });

  res.json({
    id: classroom.id,
    name: classroom.name,
    code: classroom.code,
    students: classroom.students.map((s) => ({ id: s.id, name: s.name, email: s.email })),
  });
});

// Öğrenci bir sınıf koduyla katılır
classroomRouter.post("/join", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Sınıf kodu gerekli" });

    const classroom = await prisma.classroom.findUnique({ where: { code } });
    if (!classroom) return res.status(404).json({ error: "Sınıf bulunamadı" });

    await prisma.classroom.update({
      where: { id: classroom.id },
      data: { students: { connect: { id: req.userId! } } },
    });

    res.json({ success: true, classroomName: classroom.name });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Öğrencinin katıldığı sınıfları listele
classroomRouter.get("/mine/joined", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { joinedClassrooms: true },
  });
  res.json(user?.joinedClassrooms ?? []);
});