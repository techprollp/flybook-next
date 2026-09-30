import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { SimplePDF } from "@/lib/simplePdf";
import { money, todayDubai } from "@/lib/time";

export async function GET(req: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || todayDubai().slice(0, 8) + "01";
  const to = searchParams.get("to") || todayDubai();

  const rows = await prisma.transaction.findMany({
    where: { transactionDate: { gte: from, lte: to } },
    orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
  });
  let debit = 0,
    credit = 0;
  for (const r of rows) {
    if (r.transactionType === "debit") debit += r.amount;
    else credit += r.amount;
  }

  const pdf = new SimplePDF();
  pdf.newPage();
  // header bar
  pdf.rect(0, 780, 297.5, 62, true, false, [0.91, 0.12, 0.55]);
  pdf.rect(297.5, 780, 297.5, 62, true, false, [0.15, 0.39, 0.92]);
  pdf.current += "1 1 1 rg\n";
  pdf.text(36, 812, 16, "FlyBook", true);
  pdf.text(36, 794, 10, "BILLS - DEBIT & CREDIT STATEMENT");
  pdf.textRight(560, 812, 9, `Generated ${new Date().toISOString().slice(0, 16)}`);
  pdf.textRight(560, 796, 9, `Period: ${from} to ${to}`);

  pdf.y = 750;
  pdf.current += "0.2 0.2 0.22 rg\n";
  pdf.text(36, pdf.y, 11, `Debit: AED ${money(debit)}   Credit: AED ${money(credit)}   Balance: AED ${money(credit - debit)}`, true);
  pdf.y -= 24;

  pdf.text(36, pdf.y, 8, "#  DATE        BILL              MEMBER         TYPE     AMOUNT", true);
  pdf.y -= 14;
  let n = 0;
  for (const r of rows) {
    pdf.ensureSpace(16);
    n++;
    const line = `${String(n).padStart(2)} ${r.transactionDate}  ${(r.billName + "                ").slice(0, 16)} ${(r.memberName + "            ").slice(0, 12)} ${(r.transactionType + "      ").slice(0, 6)} ${money(r.amount)}`;
    pdf.text(36, pdf.y, 8, line);
    pdf.y -= 14;
  }
  if (!rows.length) {
    pdf.text(36, pdf.y, 9, "No transactions in this period.");
  }
  pdf.y -= 20;
  pdf.text(36, pdf.y, 7, "FlyBook - Bills only - not mixed with coins - Mohammed Shareef K");

  const buf = pdf.finish();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="flybook-bills-${from}-${to}.pdf"`,
    },
  });
}
