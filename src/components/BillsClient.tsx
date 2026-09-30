"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BillModal, type BillRow } from "./BillModal";
import { money } from "@/lib/time";

export function BillsClient({
  rows,
  date,
}: {
  rows: BillRow[];
  date: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<BillRow | null>(null);

  async function remove(id: number) {
    if (!confirm("Delete this entry?")) return;
    await fetch(`/api/bills?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
        >
          ＋ Add entry
        </button>
        <a
          className="btn-secondary"
          href={`/api/pdf/bills?from=${date}&to=${date}`}
          target="_blank"
          rel="noreferrer"
        >
          ⇩ Bills PDF
        </a>
        <a className="btn-secondary" href="/coins">
          Daily Coins
        </a>
        <a className="btn-secondary" href="/reports">
          Reports
        </a>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              Today
            </p>
            <h2 className="text-base font-bold text-slate-900">Today&apos;s bills</h2>
          </div>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
          >
            ＋ Add
          </button>
        </div>
        <div className="table-wrap p-2 sm:p-3">
          <table className="data">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Bill</th>
                <th>Member</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={
                    r.transactionType === "debit"
                      ? "bg-red-50/40"
                      : "bg-emerald-50/40"
                  }
                >
                  <td className="whitespace-nowrap">
                    <div className="font-medium text-slate-800">
                      {r.transactionDate}
                    </div>
                    {r.transactionTime && (
                      <div className="text-xs text-slate-400">
                        {r.transactionTime.slice(0, 5)}
                      </div>
                    )}
                  </td>
                  <td className="font-medium">{r.billName}</td>
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
                        ? "font-semibold text-red-600"
                        : "font-semibold text-emerald-600"
                    }
                  >
                    د.إ {money(r.amount)}
                  </td>
                  <td className="text-slate-400 text-xs max-w-[140px] truncate">
                    {r.notes || "—"}
                  </td>
                  <td className="whitespace-nowrap">
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
                  <td colSpan={7} className="text-center text-slate-400 py-12">
                    No bills for today. Use <b>+ Add entry</b> to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BillModal
        open={open}
        onClose={() => {
          setOpen(false);
          setEdit(null);
        }}
        edit={edit}
        defaultDate={date}
      />
    </>
  );
}
