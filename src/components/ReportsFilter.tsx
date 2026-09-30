"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReportsFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/reports?from=${f}&to=${t}`);
  }

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
    >
      <label className="label">
        From
        <input
          className="input"
          type="date"
          value={f}
          onChange={(e) => setF(e.target.value)}
        />
      </label>
      <label className="label">
        To
        <input
          className="input"
          type="date"
          value={t}
          onChange={(e) => setT(e.target.value)}
        />
      </label>
      <button type="submit" className="btn-primary">
        Preview
      </button>
    </form>
  );
}
