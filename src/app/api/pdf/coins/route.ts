import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { SimplePDF } from "@/lib/simplePdf";
import { money, countFmt, todayDubai } from "@/lib/time";

export async function GET(req: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || todayDubai();
  const to = searchParams.get("to") || from;

  const rows = await prisma.memberCoin.findMany({
    where: { coinDate: { gte: from, lte: to } },
    orderBy: [{ coinDate: "asc" }, { memberName: "asc" }, { id: "asc" }],
  });
  const sumToday = rows.reduce((s, r) => s + r.todayPayment, 0);
  const sumOld = rows.reduce((s, r) => s + r.oldPayment, 0);
  const sumTotal = rows.reduce((s, r) => s + r.totalPayment, 0);
  const sumCoins = rows.reduce((s, r) => s + r.coinBalance, 0);

  const pdf = new SimplePDF();
  pdf.newPage();
  pdf.rect(0, 780, 297.5, 62, true, false, [0.91, 0.12, 0.55]);
  pdf.rect(297.5, 780, 297.5, 62, true, false, [0.15, 0.39, 0.92]);
  pdf.current += "1 1 1 rg\n";
  pdf.text(36, 812, 16, "FlyBook", true);
  pdf.text(36, 794, 10, "DAILY COINS REPORT - counts + coin cash only");
  pdf.textRight(560, 812, 9, `Period: ${from} to ${to}`);

  pdf.y = 750;
  pdf.current += "0.2 0.2 0.22 rg\n";
  pdf.text(
    36,
    pdf.y,
    10,
    `Today count: ${countFmt(sumToday)}   Old count: ${countFmt(sumOld)}   Total count: ${countFmt(sumTotal)}   Coin cash: AED ${money(sumCoins)}`,
    true
  );
  pdf.y -= 24;
  pdf.text(
    36,
    pdf.y,
    8,
    "#  DATE        MEMBER           TODAY  OLD   TOTAL  CASH",
    true
  );
  pdf.y -= 14;
  let n = 0;
  for (const r of rows) {
    pdf.ensureSpace(16);
    n++;
    const line = `${String(n).padStart(2)} ${r.coinDate}  ${(r.memberName + "              ").slice(0, 14)} ${String(Math.round(r.todayPayment)).padStart(5)} ${String(Math.round(r.oldPayment)).padStart(5)} ${String(Math.round(r.totalPayment)).padStart(6)}  ${money(r.coinBalance)}`;
    pdf.text(36, pdf.y, 8, line);
    pdf.y -= 14;
  }
  if (!rows.length) {
    pdf.text(36, pdf.y, 9, "No coin entries in this period.");
  }
  pdf.y -= 20;
  pdf.text(
    36,
    pdf.y,
    7,
    "FlyBook Coins - separate from bills - Mohammed Shareef K"
  );

  const buf = pdf.finish();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="flybook-coins-${from}-${to}.pdf"`,
    },
  });
}
