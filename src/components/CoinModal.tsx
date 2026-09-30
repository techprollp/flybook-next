"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type CoinRow = {
  id: number;
  memberName: string;
  coinDate: string;
  todayPayment: number;
  oldPayment: number;
  totalPayment: number;
  coinBalance: number;
  notes: string | null;
};

export function CoinModal({
  open,
  onClose,
  edit,
  defaultDate,
  members,
}: {
  open: boolean;
  onClose: () => void;
  edit: CoinRow | null;
  defaultDate: string;
  members: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    memberName: "",
    todayPayment: "",
    oldPayment: "",
    totalPayment: "",
    coinBalance: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setError("");
    if (edit) {
      setForm({
        memberName: edit.memberName,
        todayPayment: String(Math.round(edit.todayPayment)),
        oldPayment: String(Math.round(edit.oldPayment)),
        totalPayment: String(Math.round(edit.totalPayment)),
        coinBalance: String(edit.coinBalance),
        notes: edit.notes || "",
      });
    } else {
      setForm({
        memberName: "",
        todayPayment: "",
        oldPayment: "",
        totalPayment: "",
        coinBalance: "",
        notes: "",
      });
    }
  }, [open, edit]);

  function updateTotal(today: string, old: string) {
    const t = Number(today) || 0;
    const o = Number(old) || 0;
    return String(Math.round(t + o));
  }

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/coins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: edit?.id || 0,
        memberName: form.memberName,
        todayPayment: Number(form.todayPayment) || 0,
        oldPayment: Number(form.oldPayment) || 0,
        totalPayment: Number(form.totalPayment) || 0,
        coinBalance: Number(form.coinBalance) || 0,
        notes: form.notes,
        coinDate: edit?.coinDate || defaultDate,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md card shadow-modal p-5 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              Coins table only
            </p>
            <h3 className="text-lg font-bold text-slate-900">
              {edit ? "Edit Coin" : "Add Coin"}
            </h3>
          </div>
          <button type="button" className="btn-ghost btn-sm h-9 w-9" onClick={onClose}>
            ✕
          </button>
        </div>
        {error && (
          <div className="mb-3 rounded-xl bg-red-50 text-red-700 text-sm px-3 py-2.5 border border-red-100">
            {error}
          </div>
        )}
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="label">
            Member name
            <input
              className="input"
              required
              list="memberList"
              value={form.memberName}
              onChange={(e) => setForm({ ...form, memberName: e.target.value })}
              placeholder="Enter member name"
              autoFocus
            />
            <datalist id="memberList">
              {members.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="label">
              Today payment count
              <span className="font-normal text-slate-400"> (not cash)</span>
              <input
                className="input"
                type="number"
                step="1"
                min="0"
                value={form.todayPayment}
                onChange={(e) =>
                  setForm({
                    ...form,
                    todayPayment: e.target.value,
                    totalPayment: updateTotal(e.target.value, form.oldPayment),
                  })
                }
                placeholder="0"
              />
            </label>
            <label className="label">
              Old payment count
              <span className="font-normal text-slate-400"> (not cash)</span>
              <input
                className="input"
                type="number"
                step="1"
                min="0"
                value={form.oldPayment}
                onChange={(e) =>
                  setForm({
                    ...form,
                    oldPayment: e.target.value,
                    totalPayment: updateTotal(form.todayPayment, e.target.value),
                  })
                }
                placeholder="0"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="label">
              Total payment count
              <input
                className="input"
                type="number"
                step="1"
                min="0"
                value={form.totalPayment}
                onChange={(e) =>
                  setForm({ ...form, totalPayment: e.target.value })
                }
                placeholder="Auto"
              />
            </label>
            <label className="label">
              Coin cash (AED)
              <span className="font-normal text-slate-400"> any amount</span>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.coinBalance}
                onChange={(e) =>
                  setForm({ ...form, coinBalance: e.target.value })
                }
                placeholder="0.25"
              />
            </label>
          </div>
          <label className="label">
            Notes <span className="font-normal text-slate-400">(optional)</span>
            <textarea
              className="input min-h-[72px] h-auto py-2.5"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any notes…"
            />
          </label>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? "Saving…" : edit ? "Update" : "Save"}
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
