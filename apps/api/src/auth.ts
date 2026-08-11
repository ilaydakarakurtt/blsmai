import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";
const JWT_SECRET = process.env.JWT_SECRET!;

export async function register(email: string, password: string, name: string) {
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hash, name },
  });
  return generateToken(user.id);
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Kullanıcı bulunamadı");
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error("Şifre hatalı");
  return generateToken(user.id);
}

function generateToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}