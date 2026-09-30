"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type BillRow = {
  id: number;
  billName: string;
  memberName: string;
  amount: number;
  transactionType: string;
  transactionDate: string;
  transactionTime: string | null;
  notes: string | null;
};

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function localTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function BillModal({
  open,
  onClose,
  edit,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  edit: BillRow | null;
  defaultDate: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dateLocked, setDateLocked] = useState(true);
  const [form, setForm] = useState({
    billName: "",
    memberName: "",
    amount: "",
    transactionType: "debit",
    transactionDate: defaultDate || localDate(),
    transactionTime: localTime(),
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setError("");
    if (edit) {
      setForm({
        billName: edit.billName,
        memberName: edit.memberName,
        amount: String(edit.amount),
        transactionType: edit.transactionType,
        transactionDate: edit.transactionDate,
        transactionTime: edit.transactionTime?.slice(0, 5) || localTime(),
        notes: edit.notes || "",
      });
      setDateLocked(false);
    } else {
      setForm({
        billName: "",
        memberName: "",
        amount: "",
        transactionType: "debit",
        transactionDate: defaultDate || localDate(),
        transactionTime: localTime(),
        notes: "",
      });
      setDateLocked(new Date().getHours() >= 12);
    }
  }, [open, edit, defaultDate]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: edit?.id || 0,
        ...form,
        amount: Number(form.amount),
        dateLocked,
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
      <div className="w-full max-w-md card shadow-modal p-5 sm:p-6 animate-in">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              {edit ? "Edit" : "New"} entry
            </p>
            <h3 className="text-lg font-bold text-slate-900">
              {edit ? "Edit bill" : "Add bill"}
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
            Bill name
            <input
              className="input"
              required
              value={form.billName}
              onChange={(e) => setForm({ ...form, billName: e.target.value })}
              placeholder="Bill name"
              autoFocus
            />
          </label>
          <label className="label">
            Member name
            <input
              className="input"
              required
              value={form.memberName}
              onChange={(e) => setForm({ ...form, memberName: e.target.value })}
              placeholder="Member name"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="label">
              Amount (AED)
              <input
                className="input"
                required
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
            </label>
            <label className="label">
              Type
              <select
                className="input"
                value={form.transactionType}
                onChange={(e) =>
                  setForm({ ...form, transactionType: e.target.value })
                }
              >
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="label">
              Date
              <div className="flex gap-2">
                <input
                  className="input"
                  type="date"
                  value={form.transactionDate}
                  readOnly={dateLocked}
                  onChange={(e) =>
                    setForm({ ...form, transactionDate: e.target.value })
                  }
                />
              </div>
            </label>
            <label className="label">
              Time
              <input
                className="input"
                type="time"
                value={form.transactionTime}
                onChange={(e) =>
                  setForm({ ...form, transactionTime: e.target.value })
                }
              />
            </label>
          </div>
          <button
            type="button"
            className={`btn-sm self-start ${
              dateLocked
                ? "bg-red-50 text-red-700 border border-red-100"
                : "btn-secondary"
            }`}
            onClick={() => {
              const next = !dateLocked;
              setDateLocked(next);
              if (next && !edit) {
                setForm((f) => ({ ...f, transactionDate: localDate() }));
              }
            }}
          >
            {dateLocked ? "🔒 Date locked" : "🔓 Date unlocked"}
          </button>
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
              {loading ? "Saving…" : edit ? "Update" : "Save & add another"}
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
