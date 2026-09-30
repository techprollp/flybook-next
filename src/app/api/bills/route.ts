import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isDateLocked, todayDubai, timeDubai } from "@/lib/time";

export async function GET(req: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || todayDubai();
  const rows = await prisma.transaction.findMany({
    where: { transactionDate: date },
    orderBy: [{ transactionTime: "desc" }, { id: "desc" }],
    take: 200,
  });
  const debit = rows
    .filter((r) => r.transactionType === "debit")
    .reduce((s, r) => s + r.amount, 0);
  const credit = rows
    .filter((r) => r.transactionType === "credit")
    .reduce((s, r) => s + r.amount, 0);
  return NextResponse.json({ rows, debit, credit, date });
}

export async function POST(req: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const id = Number(body.id || 0);
  const billName = String(body.billName || "").trim();
  const memberName = String(body.memberName || "").trim();
  const amount = Number(body.amount || 0);
  const transactionType = String(body.transactionType || "");
  let transactionDate = String(body.transactionDate || todayDubai());
  let transactionTime = String(body.transactionTime || "").trim() || null;
  const notes = String(body.notes || "").trim() || null;
  const dateLocked = body.dateLocked === true || body.dateLocked === "1";

  if (!billName || !memberName) {
    return NextResponse.json(
      { error: "Bill name and member are required." },
      { status: 400 }
    );
  }
  if (amount <= 0) {
    return NextResponse.json(
      { error: "Amount must be greater than zero." },
      { status: 400 }
    );
  }
  if (!["debit", "credit"].includes(transactionType)) {
    return NextResponse.json({ error: "Invalid type." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const lockActive = dateLocked || isDateLocked();
  if (lockActive) {
    if (id <= 0) {
      transactionDate = todayDubai();
    } else {
      const orig = await prisma.transaction.findUnique({ where: { id } });
      if (orig) transactionDate = orig.transactionDate;
    }
  }
  if (!transactionTime) transactionTime = timeDubai();

  if (id > 0) {
    const row = await prisma.transaction.update({
      where: { id },
      data: {
        billName,
        memberName,
        amount,
        transactionType,
        transactionDate,
        transactionTime,
        notes,
      },
    });
    return NextResponse.json({ ok: true, row, updated: true });
  }

  const row = await prisma.transaction.create({
    data: {
      billName,
      memberName,
      amount,
      transactionType,
      transactionDate,
      transactionTime,
      notes,
    },
  });
  return NextResponse.json({ ok: true, row, saved: true });
}

export async function DELETE(req: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id") || 0);
  if (id > 0) {
    await prisma.transaction.delete({ where: { id } }).catch(() => null);
  }
  return NextResponse.json({ ok: true });
}
