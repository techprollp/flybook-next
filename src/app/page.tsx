import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayDubai, money, formatDisplayDate } from "@/lib/time";
import { Shell } from "@/components/Shell";
import { StatCards } from "@/components/StatCards";
import { BillsClient } from "@/components/BillsClient";

export const dynamic = "force-dynamic";

export default async function BillsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const date = todayDubai();
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

  return (
    <Shell title="Daily Bills" subtitle={`Bills only · ${formatDisplayDate(date)}`}>
      <section className="card p-5 sm:p-6 mb-5 bg-gradient-to-br from-white to-slate-50">
        <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
          Today · {formatDisplayDate(date)}
        </p>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
          Track every debit &amp; credit.
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          Bills are stored separately from coins. Clean white workspace — same
          functions as FlyBook.
        </p>
      </section>

      <StatCards
        items={[
          { label: "Debit", value: `د.إ ${money(debit)}`, tone: "red", icon: "−" },
          {
            label: "Credit",
            value: `د.إ ${money(credit)}`,
            tone: "green",
            icon: "+",
          },
          {
            label: "Balance",
            value: `د.إ ${money(credit - debit)}`,
            icon: "≈",
          },
        ]}
      />

      <BillsClient rows={rows} date={date} />
    </Shell>
  );
}
