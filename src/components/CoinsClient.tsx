"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CoinModal, type CoinRow } from "./CoinModal";
import { money, countFmt } from "@/lib/time";

export function CoinsClient({
  rows,
  date,
  members,
}: {
  rows: CoinRow[];
  date: string;
  members: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<CoinRow | null>(null);
  const [filterDate, setFilterDate] = useState(date);
  const [filterMember, setFilterMember] = useState("");

  async function remove(id: number) {
    if (!confirm("Delete this coin entry?")) return;
    await fetch(`/api/coins?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  function applyFilter(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams();
    if (filterDate) q.set("date", filterDate);
    if (filterMember) q.set("member", filterMember);
    router.push(`/coins?${q.toString()}`);
  }

  // Aggregate cards
  const byMember = new Map<
    string,
    { today: number; old: number; total: number; coins: number }
  >();
  for (const r of rows) {
    const cur = byMember.get(r.memberName) || {
      today: 0,
      old: 0,
      coins: 0,
      total: 0,
    };
    cur.today += r.todayPayment;
    if (r.oldPayment > cur.old) cur.old = r.oldPayment;
    cur.coins += r.coinBalance;
    cur.total = cur.old + cur.today;
    byMember.set(r.memberName, cur);
  }

  return (
    <>
      <div className="card p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              Filter
            </p>
            <h2 className="text-base font-bold">Date &amp; member</h2>
          </div>
          <a
            className="btn-primary btn-sm"
            href={`/api/pdf/coins?from=${date}&to=${date}`}
            target="_blank"
            rel="noreferrer"
          >
            ⇩ Coins PDF
          </a>
        </div>
        <form
          onSubmit={applyFilter}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
        >
          <label className="label">
            Date
            <input
              className="input"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </label>
          <label className="label">
            Member name
            <input
              className="input"
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              placeholder="Search member…"
            />
          </label>
          <button type="submit" className="btn-primary">
            Show
          </button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              Per-member coins &amp; payments
            </p>
            <h2 className="text-base font-bold">Coin entries</h2>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
          >
            ＋ Add Coin
          </button>
        </div>

        {byMember.size > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 border-b border-surface-border bg-slate-50/50">
            {[...byMember.entries()].map(([name, m]) => (
              <div key={name} className="card p-4 shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900">{name}</h4>
                  <span className="coin-badge">🪙 د.إ {money(m.coins)}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Today count</span>
                    <b>{countFmt(m.today)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Old count</span>
                    <b>{countFmt(m.old)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total count</span>
                    <b>{countFmt(m.total)}</b>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="table-wrap p-2 sm:p-3">
          <table className="data">
            <thead>
              <tr>
                <th>#</th>
                <th>Member</th>
                <th>Today count</th>
                <th>Old count</th>
                <th>Total count</th>
                <th>Coin cash</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td className="font-medium">{r.memberName}</td>
                  <td>{countFmt(r.todayPayment)}</td>
                  <td>{countFmt(r.oldPayment)}</td>
                  <td>
                    <b>{countFmt(r.totalPayment)}</b>
                  </td>
                  <td>
                    <span className="coin-badge">
                      🪙 د.إ {money(r.coinBalance)}
                    </span>
                  </td>
                  <td className="text-xs text-slate-400 max-w-[120px] truncate">
                    {r.notes || "—"}
                  </td>
                  <td>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setEdit(r);
                          setOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-danger btn-sm"
                        onClick={() => remove(r.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="text-center text-slate-400 py-12">
                    No coin entries. Click <b>Add Coin</b> (saved only in coins
                    table — not bills).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CoinModal
        open={open}
        onClose={() => {
          setOpen(false);
          setEdit(null);
        }}
        edit={edit}
        defaultDate={date}
        members={members}
      />
    </>
  );
}
