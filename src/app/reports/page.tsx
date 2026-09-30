import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayDubai, money } from "@/lib/time";
import { Shell } from "@/components/Shell";
import { StatCards } from "@/components/StatCards";
import { ReportsFilter } from "@/components/ReportsFilter";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const sp = searchParams;
  const today = todayDubai();
  const from =
    sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from)
      ? sp.from
      : today.slice(0, 8) + "01";
  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : today;

  const rows = await prisma.transaction.findMany({
    where: {
      transactionDate: { gte: from, lte: to },
    },
    orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
  });
  const debit = rows
    .filter((r) => r.transactionType === "debit")
    .reduce((s, r) => s + r.amount, 0);
  const credit = rows
    .filter((r) => r.transactionType === "credit")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <Shell title="Reports" subtitle="Analytics">
      <div className="card p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              Date filter
            </p>
            <h2 className="text-base font-bold">Report period</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="btn-primary btn-sm"
              href={`/api/pdf/bills?from=${from}&to=${to}`}
              target="_blank"
              rel="noreferrer"
            >
              ⇩ Bills PDF
            </a>
            <a
              className="btn-primary btn-sm"
              href={`/api/pdf/coins?from=${from}&to=${to}`}
              target="_blank"
              rel="noreferrer"
            >
              ⇩ Coins PDF
            </a>
          </div>
        </div>
        <ReportsFilter from={from} to={to} />
      </div>

      <StatCards
        items={[
          { label: "Total Debit", value: `د.إ ${money(debit)}`, tone: "red" },
          {
            label: "Total Credit",
            value: `د.إ ${money(credit)}`,
            tone: "green",
          },
          {
            label: "Net Balance",
            value: `د.إ ${money(credit - debit)}`,
          },
        ]}
      />

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h2 className="text-base font-bold">Bills report (debit &amp; credit)</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {from} to {to} · Coins are separate — use Coins PDF for coin data.
          </p>
        </div>
        <div className="table-wrap p-2 sm:p-3">
          <table className="data">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Bill</th>
                <th>Member</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td className="whitespace-nowrap">{r.transactionDate}</td>
                  <td>{r.billName}</td>
                  <td>{r.memberName}</td>
                  <td>
                    <span
                      className={
                        r.transactionType === "debit"
                          ? "badge-debit"
                          : "badge-credit"
                      }
                    >
                      {r.transactionType}
                    </span>
                  </td>
                  <td
                    className={
                      r.transactionType === "debit"
                        ? "text-red-600 font-semibold"
                        : "text-emerald-600 font-semibold"
                    }
                  >
                    د.إ {money(r.amount)}
                  </td>
                  <td className="text-xs text-slate-400">{r.notes || "—"}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400 py-12">
                    No bills in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
