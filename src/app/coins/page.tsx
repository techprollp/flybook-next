import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayDubai, money, countFmt, formatDisplayDate } from "@/lib/time";
import { Shell } from "@/components/Shell";
import { StatCards } from "@/components/StatCards";
import { CoinsClient } from "@/components/CoinsClient";

export const dynamic = "force-dynamic";

export default async function CoinsPage({
  searchParams,
}: {
  searchParams: { date?: string; member?: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const sp = searchParams;
  const date =
    sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayDubai();
  const member = (sp.member || "").trim();

  const rows = await prisma.memberCoin.findMany({
    where: {
      coinDate: date,
      ...(member ? { memberName: { contains: member } } : {}),
    },
    orderBy: [{ memberName: "asc" }, { id: "asc" }],
  });

  const sumToday = rows.reduce((s, r) => s + r.todayPayment, 0);
  const sumOld = rows.reduce((s, r) => s + r.oldPayment, 0);
  const sumTotal = rows.reduce((s, r) => s + r.totalPayment, 0);
  const sumCoins = rows.reduce((s, r) => s + r.coinBalance, 0);

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

  return (
    <Shell
      title="Daily Coins"
      subtitle={`Coins only · separate from bills · ${formatDisplayDate(date)}`}
    >
      <StatCards
        items={[
          {
            label: "Today payment count",
            value: countFmt(sumToday),
          },
          {
            label: "Old payment count",
            value: countFmt(sumOld),
          },
          {
            label: "Total payment count",
            value: countFmt(sumTotal),
          },
          {
            label: "Coin cash",
            value: `د.إ ${money(sumCoins)}`,
            tone: "amber",
            icon: "🪙",
          },
        ]}
      />
      <CoinsClient rows={rows} date={date} members={allMembers} />
    </Shell>
  );
}
