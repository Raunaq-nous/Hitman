import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();
    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || !name.trim() || !email.trim()) {
      return NextResponse.json({ message: "Name, email and password are required." }, { status: 400 });
    }
    if (!EMAIL.test(email.trim())) return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ message: "Use a password of at least 8 characters." }, { status: 400 });

    const normalized = email.trim().toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email: normalized } });
    if (exists) return NextResponse.json({ message: "An account with that email already exists." }, { status: 400 });

    const user = await prisma.user.create({
      data: { name: name.trim(), email: normalized, password: await bcrypt.hash(password, 10) },
    });
    return NextResponse.json({ message: "User created", user: { id: user.id } }, { status: 201 });
  } catch (error) {
    console.error("Registration API error:", error);
    return NextResponse.json({ message: "Couldn’t create your account. Try again." }, { status: 500 });
  }
}
