import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { todayDubai } from "@/lib/time";

export async function GET(req: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || todayDubai();
  const member = (searchParams.get("member") || "").trim();

  const where: { coinDate: string; memberName?: { contains: string } } = {
    coinDate: date,
  };
  if (member) where.memberName = { contains: member };

  const rows = await prisma.memberCoin.findMany({
    where,
    orderBy: [{ memberName: "asc" }, { id: "asc" }],
  });

  const namesCoins = await prisma.memberCoin.findMany({
    select: { memberName: true },
    distinct: ["memberName"],
  });
  const namesBills = await prisma.transaction.findMany({
    select: { memberName: true },
    distinct: ["memberName"],
  });
  const allMembers = Array.from(
    new Set([
      ...namesCoins.map((n) => n.memberName),
      ...namesBills.map((n) => n.memberName),
    ])
  ).sort((a, b) => a.localeCompare(b));

  return NextResponse.json({ rows, date, allMembers });
}

export async function POST(req: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const id = Number(body.id || 0);
  const memberName = String(body.memberName || "").trim();
  const todayPayment = Number(body.todayPayment || 0);
  const oldPayment = Number(body.oldPayment || 0);
  let totalPayment = Number(body.totalPayment || 0);
  const coinBalance = Number(body.coinBalance || 0);
  const notes = String(body.notes || "").trim() || null;
  const coinDate = String(body.coinDate || todayDubai());

  if (!memberName) {
    return NextResponse.json(
      { error: "Member name is required." },
      { status: 400 }
    );
  }
  if (todayPayment < 0 || oldPayment < 0) {
    return NextResponse.json(
      { error: "Payment counts cannot be negative." },
      { status: 400 }
    );
  }
  if (coinBalance < 0) {
    return NextResponse.json(
      { error: "Coin cash cannot be negative." },
      { status: 400 }
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(coinDate)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  if (totalPayment <= 0 && (todayPayment > 0 || oldPayment > 0)) {
    totalPayment = todayPayment + oldPayment;
  }

  if (id > 0) {
    const row = await prisma.memberCoin.update({
      where: { id },
      data: {
        memberName,
        coinDate,
        todayPayment,
        oldPayment,
        totalPayment,
        coinBalance,
        notes,
      },
    });
    return NextResponse.json({ ok: true, row, updated: true });
  }

  const row = await prisma.memberCoin.create({
    data: {
      memberName,
      coinDate,
      todayPayment,
      oldPayment,
      totalPayment,
      coinBalance,
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
    await prisma.memberCoin.delete({ where: { id } }).catch(() => null);
  }
  return NextResponse.json({ ok: true });
}
