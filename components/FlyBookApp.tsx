"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { jsPDF } from "jspdf";
import ExcelJS from "exceljs";
import {
  Plus, Trash2, Pencil, LogOut, WalletCards, Users, BarChart3, Coins, FileText,
  Lock, Unlock, Menu, X, FileSpreadsheet,
} from "lucide-react";

type Member = { id: number; name: string; phone: string | null; notes: string | null; active: boolean };
type Tx = {
  id: number; member_id: number | null; transaction_date: string; transaction_time: string | null;
  category: "bill" | "coin"; type: "debit" | "credit"; bill_name: string; amount: number;
  notes: string | null; created_at: string;
};

const money = (n: number) => new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(n || 0);
const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const emptyForm = (category: "bill" | "coin" = "bill") => ({
  member_name: "", transaction_date: today(), transaction_time: nowTime(),
  type: (category === "coin" ? "credit" : "debit") as "debit" | "credit",
  bill_name: "", amount: category === "coin" ? "1" : "", notes: "", time_locked: false, category,
});

const NAV = [
  { id: "dashboard", label: "Dashboard", Icon: BarChart3 },
  { id: "bills", label: "Bills", Icon: WalletCards },
  { id: "coins", label: "Coins", Icon: Coins },
  { id: "members", label: "Members", Icon: Users },
  { id: "reports", label: "Reports", Icon: FileText },
] as const;

export default function FlyBookApp() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [members, setMembers] = useState<Member[]>([]);
  const [tx, setTx] = useState<Tx[]>([]);
  const [date, setDate] = useState(today());
  const [from, setFrom] = useState(today().slice(0, 8) + "01");
  const [to, setTo] = useState(today());
  const [editing, setEditing] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [login, setLogin] = useState({ username: "", password: "" });
  const [form, setForm] = useState(emptyForm("bill"));
  const [memberName, setMemberName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function load() {
    const { data: s } = await supabase.auth.getSession();
    setSession(s.session);
    if (!s.session) { setLoading(false); return; }
    const [{ data: m }, { data: t }] = await Promise.all([
      supabase.from("members").select("*").order("name"),
      supabase.from("transactions").select("*").order("transaction_date", { ascending: false }).order("id", { ascending: false }),
    ]);
    setMembers((m || []) as Member[]);
    setTx(((t || []) as any[]).map((row) => ({ ...row, category: row.category === "coin" ? "coin" : "bill" })) as Tx[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const { data } = supabase.auth.onAuthStateChange(() => load());
    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn(e: any) {
    e.preventDefault(); setNotice("");
    const email = login.username.trim().toLowerCase() + "@flybook.local";
    const { error } = await supabase.auth.signInWithPassword({ email, password: login.password });
    if (error) setNotice(error.message);
  }
  async function signOut() { await supabase.auth.signOut(); setSession(null); }

  const bills = useMemo(() => tx.filter((x) => x.category === "bill"), [tx]);
  const coins = useMemo(() => tx.filter((x) => x.category === "coin"), [tx]);
  const filteredBills = useMemo(() => bills.filter((x) => x.transaction_date >= from && x.transaction_date <= to), [bills, from, to]);
  const filteredCoins = useMemo(() => coins.filter((x) => x.transaction_date >= from && x.transaction_date <= to), [coins, from, to]);
  const dailyCoins = useMemo(() => coins.filter((x) => x.transaction_date === date), [coins, date]);

  const billTotals = useMemo(() => {
    const debit = filteredBills.filter((x) => x.type === "debit").reduce((s, x) => s + Number(x.amount), 0);
    const credit = filteredBills.filter((x) => x.type === "credit").reduce((s, x) => s + Number(x.amount), 0);
    return { debit, credit, balance: credit - debit };
  }, [filteredBills]);

  const coinTotals = useMemo(() => ({
    totalNos: filteredCoins.reduce((s, x) => s + Number(x.amount || 1), 0),
  }), [filteredCoins]);

  const allTotals = useMemo(() => {
    const debit = bills.filter((x) => x.type === "debit").reduce((s, x) => s + Number(x.amount), 0);
    const credit = bills.filter((x) => x.type === "credit").reduce((s, x) => s + Number(x.amount), 0);
    const coinNos = coins.reduce((s, x) => s + Number(x.amount || 1), 0);
    return { debit, credit, balance: credit - debit, billsCount: bills.length, coinsCount: coins.length, coinNos, membersActive: members.filter((m) => m.active).length };
  }, [bills, coins, members]);

  async function resolveMemberId(name: string): Promise<number | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = members.find((m) => m.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const { data, error } = await supabase.from("members").insert({ name: trimmed }).select("id").single();
    if (error) { setNotice(error.message); return null; }
    return data.id as number;
  }

  async function saveTx(e: any) {
    e.preventDefault(); setNotice("");
    const memberId = await resolveMemberId(form.member_name);
    if (form.member_name.trim() && memberId === null) return;
    const amount = form.category === "coin" ? Math.max(1, Math.floor(Number(form.amount) || 1)) : Number(form.amount);
    const payload = {
      member_id: memberId, transaction_date: form.transaction_date, transaction_time: form.transaction_time || null,
      category: form.category, type: form.category === "coin" ? "credit" : form.type,
      bill_name: form.bill_name.trim() || (form.category === "coin" ? "Coin" : ""),
      amount, notes: form.notes.trim() || null, created_by: session.user.id,
    };
    if (!payload.bill_name || payload.amount < 0) {
      setNotice(form.category === "coin" ? "Enter description and coin count (nos)." : "Enter a bill name and valid amount.");
      return;
    }
    const q = editing ? supabase.from("transactions").update(payload).eq("id", editing) : supabase.from("transactions").insert(payload);
    const { error } = await q;
    if (error) { setNotice(error.message); return; }
    setEditing(null); setForm(emptyForm(form.category)); await load(); setNotice("Saved successfully.");
  }

  function editTx(x: Tx) {
    setEditing(x.id);
    const m = members.find((m) => m.id === x.member_id);
    setForm({
      member_name: m?.name || "", transaction_date: x.transaction_date, transaction_time: x.transaction_time || nowTime(),
      type: x.type, bill_name: x.bill_name, amount: String(x.amount), notes: x.notes || "", time_locked: false, category: x.category,
    });
    setTab(x.category === "coin" ? "coins" : "bills"); setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteTx(id: number) {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) setNotice(error.message); else await load();
  }

  async function addMember(e: any) {
    e.preventDefault();
    if (!memberName.trim()) return;
    const { error } = await supabase.from("members").insert({ name: memberName.trim() });
    if (error) setNotice(error.message); else { setMemberName(""); await load(); }
  }

  async function deleteMember(id: number) {
    if (!confirm("Delete member? Entries will remain but member will be cleared.")) return;
    await supabase.from("members").delete().eq("id", id); await load();
  }

  function toggleTimeLock() {
    setForm((f) => !f.time_locked
      ? { ...f, time_locked: true, transaction_date: today(), transaction_time: nowTime() }
      : { ...f, time_locked: false });
  }

  function goTab(id: string) {
    setTab(id); setSidebarOpen(false);
    if (id === "bills" && form.category !== "bill" && !editing) setForm(emptyForm("bill"));
    if (id === "coins" && form.category !== "coin" && !editing) setForm(emptyForm("coin"));
  }

  function pdfHeader(doc: jsPDF, title: string, subtitle: string) {
    doc.setFillColor(22, 24, 32); doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.text(title, 14, 14);
    doc.setFontSize(10); doc.setTextColor(180, 184, 196); doc.text(subtitle, 14, 22); doc.setTextColor(0, 0, 0);
  }

  function exportBillsPDF(rows = filteredBills) {
    const doc = new jsPDF();
    pdfHeader(doc, "FlyBook — Bills Report", `Period: ${from} to ${to}`);
    let y = 38; doc.setFontSize(10); doc.setTextColor(100);
    ["Date", "Time", "Member", "Type", "Bill", "Amount"].forEach((h, i) => doc.text(h, [14, 38, 58, 95, 118, 165][i], y));
    doc.setTextColor(0); y += 7;
    rows.forEach((r) => {
      if (y > 280) { doc.addPage(); y = 18; }
      const m = members.find((x) => x.id === r.member_id)?.name || "—";
      doc.text(r.transaction_date, 14, y); doc.text(r.transaction_time || "—", 38, y);
      doc.text(m.slice(0, 16), 58, y); doc.text(r.type, 95, y);
      doc.text(r.bill_name.slice(0, 22), 118, y); doc.text(money(Number(r.amount)), 165, y); y += 6;
    });
    y += 10; doc.setFontSize(11);
    doc.text(`Debit: ${money(billTotals.debit)}   Credit: ${money(billTotals.credit)}   Balance: ${money(billTotals.balance)}`, 14, y);
    doc.save(`FlyBook-Bills-${from}_to_${to}.pdf`);
  }

  function exportCoinsPDF(rows = filteredCoins, forDate?: string) {
    const doc = new jsPDF();
    pdfHeader(doc, "FlyBook — Coins Report", forDate ? `Date: ${forDate}` : `Period: ${from} to ${to}`);
    let y = 38; doc.setFontSize(10); doc.setTextColor(100);
    ["Date", "Time", "Member", "Description", "Coins (nos)"].forEach((h, i) => doc.text(h, [14, 38, 58, 105, 160][i], y));
    doc.setTextColor(0); y += 7; let totalNos = 0;
    rows.forEach((r) => {
      if (y > 280) { doc.addPage(); y = 18; }
      const m = members.find((x) => x.id === r.member_id)?.name || "—";
      const nos = Number(r.amount || 1); totalNos += nos;
      doc.text(r.transaction_date, 14, y); doc.text(r.transaction_time || "—", 38, y);
      doc.text(m.slice(0, 18), 58, y); doc.text(r.bill_name.slice(0, 24), 105, y);
      doc.text(String(nos), 160, y); y += 6;
    });
    y += 10; doc.setFontSize(12);
    doc.text(`Total Coins: ${totalNos} nos   ·   Entries: ${rows.length}`, 14, y);
    y += 14; doc.setFontSize(14); doc.text("Member Coins Summary", 14, y); y += 8; doc.setFontSize(10);
    members.forEach((m) => {
      const mine = rows.filter((r) => r.member_id === m.id);
      const nos = mine.reduce((s, r) => s + Number(r.amount || 1), 0);
      if (!mine.length) return;
      if (y > 280) { doc.addPage(); y = 18; }
      doc.text(`${m.name}:  ${nos} nos  (${mine.length} entries)`, 14, y); y += 6;
    });
    doc.save(forDate ? `FlyBook-Coins-${forDate}.pdf` : `FlyBook-Coins-${from}_to_${to}.pdf`);
  }

  function exportCombinedPDF() {
    const doc = new jsPDF();
    pdfHeader(doc, "FlyBook — Full Report", `Period: ${from} to ${to}`);
    let y = 40; doc.setFontSize(14); doc.text("1. Bills Summary", 14, y); y += 8; doc.setFontSize(11);
    doc.text(`Debit: ${money(billTotals.debit)}  |  Credit: ${money(billTotals.credit)}  |  Balance: ${money(billTotals.balance)}  |  Entries: ${filteredBills.length}`, 14, y);
    y += 12; doc.setFontSize(10); doc.setTextColor(100);
    ["Date", "Member", "Type", "Bill", "Amount"].forEach((h, i) => doc.text(h, [14, 40, 80, 105, 155][i], y));
    doc.setTextColor(0); y += 6;
    filteredBills.forEach((r) => {
      if (y > 270) { doc.addPage(); y = 18; }
      const m = members.find((x) => x.id === r.member_id)?.name || "—";
      doc.text(r.transaction_date, 14, y); doc.text(m.slice(0, 16), 40, y); doc.text(r.type, 80, y);
      doc.text(r.bill_name.slice(0, 22), 105, y); doc.text(money(Number(r.amount)), 155, y); y += 6;
    });
    doc.addPage(); pdfHeader(doc, "FlyBook — Coins Section", `Period: ${from} to ${to}`);
    y = 40; doc.setFontSize(14); doc.text("2. Coins Summary", 14, y); y += 8;
    const totalNos = filteredCoins.reduce((s, r) => s + Number(r.amount || 1), 0);
    doc.setFontSize(11); doc.text(`Total Coins: ${totalNos} nos  |  Entries: ${filteredCoins.length}`, 14, y);
    y += 12; doc.setFontSize(10); doc.setTextColor(100);
    ["Date", "Member", "Description", "Coins (nos)"].forEach((h, i) => doc.text(h, [14, 40, 90, 150][i], y));
    doc.setTextColor(0); y += 6;
    filteredCoins.forEach((r) => {
      if (y > 270) { doc.addPage(); y = 18; }
      const m = members.find((x) => x.id === r.member_id)?.name || "—";
      doc.text(r.transaction_date, 14, y); doc.text(m.slice(0, 18), 40, y);
      doc.text(r.bill_name.slice(0, 28), 90, y); doc.text(String(Number(r.amount || 1)), 150, y); y += 6;
    });
    doc.save(`FlyBook-Full-Report-${from}_to_${to}.pdf`);
  }

  async function styleHeaderRow(row: ExcelJS.Row, color: string) {
    row.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    row.height = 24;
  }

  function downloadBlob(buf: ExcelJS.Buffer, filename: string) {
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  async function exportBillsExcel(rows = filteredBills) {
    const wb = new ExcelJS.Workbook(); wb.creator = "FlyBook";
    const ws = wb.addWorksheet("Bills", { views: [{ state: "frozen", ySplit: 4 }] });
    ws.columns = [{ key: "date", width: 14 }, { key: "time", width: 10 }, { key: "member", width: 20 }, { key: "type", width: 12 }, { key: "bill", width: 28 }, { key: "amount", width: 16 }, { key: "notes", width: 22 }];
    ws.mergeCells("A1:G1");
    const t = ws.getCell("A1"); t.value = "FlyBook — Bills Report";
    t.font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFFFF" } };
    t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1C28" } }; ws.getRow(1).height = 32;
    ws.mergeCells("A2:G2");
    ws.getCell("A2").value = `Period: ${from} → ${to}  ·  ${new Date().toLocaleString()}`;
    ws.getCell("A2").font = { name: "Calibri", size: 10, color: { argb: "FFB0B4C0" } };
    ws.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF252836" } };
    ws.mergeCells("A3:G3");
    ws.getCell("A3").value = `Debit: ${money(billTotals.debit)}   Credit: ${money(billTotals.credit)}   Balance: ${money(billTotals.balance)}   Entries: ${rows.length}`;
    ws.getCell("A3").font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    ws.getCell("A3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3977FF" } }; ws.getRow(3).height = 24;
    const hr = ws.getRow(4); hr.values = ["Date", "Time", "Member", "Type", "Bill / Description", "Amount (AED)", "Notes"];
    await styleHeaderRow(hr, "FFFF3B81");
    rows.forEach((r, i) => {
      const mName = members.find((x) => x.id === r.member_id)?.name || "—";
      const row = ws.addRow([r.transaction_date, r.transaction_time || "—", mName, r.type.toUpperCase(), r.bill_name, Number(r.amount), r.notes || ""]);
      const bg = i % 2 === 0 ? "FFFFFFFF" : "FFF8F9FC"; const isDebit = r.type === "debit";
      row.eachCell((cell, col) => {
        cell.font = { name: "Calibri", size: 11 }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        if (col === 4) {
          cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: isDebit ? "FFC72C43" : "FF14784F" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isDebit ? "FFFFE5EA" : "FFE4F7EF" } };
          cell.alignment = { horizontal: "center" };
        }
        if (col === 6) { cell.numFmt = '"AED" #,##0.00'; cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: isDebit ? "FFE13D4F" : "FF1B9B67" } }; }
      });
    });
    downloadBlob(await wb.xlsx.writeBuffer(), `FlyBook-Bills-${from}_to_${to}.xlsx`);
    setNotice("Bills Excel downloaded.");
  }

  async function exportCoinsExcel(rows = filteredCoins, forDate?: string) {
    const wb = new ExcelJS.Workbook(); wb.creator = "FlyBook";
    const ws = wb.addWorksheet("Coins", { views: [{ state: "frozen", ySplit: 4 }] });
    ws.columns = [{ key: "date", width: 14 }, { key: "time", width: 10 }, { key: "member", width: 20 }, { key: "desc", width: 28 }, { key: "nos", width: 14 }, { key: "notes", width: 22 }];
    ws.mergeCells("A1:F1");
    const t = ws.getCell("A1"); t.value = "FlyBook — Coins Report";
    t.font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFFFF" } };
    t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1C28" } }; ws.getRow(1).height = 32;
    const totalNos = rows.reduce((s, r) => s + Number(r.amount || 1), 0);
    ws.mergeCells("A2:F2");
    ws.getCell("A2").value = forDate ? `Date: ${forDate}` : `Period: ${from} → ${to}  ·  ${new Date().toLocaleString()}`;
    ws.getCell("A2").font = { name: "Calibri", size: 10, color: { argb: "FFB0B4C0" } };
    ws.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF252836" } };
    ws.mergeCells("A3:F3");
    ws.getCell("A3").value = `Total Coins: ${totalNos} nos   ·   Entries: ${rows.length}`;
    ws.getCell("A3").font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    ws.getCell("A3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFB800" } }; ws.getRow(3).height = 24;
    const hr = ws.getRow(4); hr.values = ["Date", "Time", "Member", "Description", "Coins (nos)", "Notes"];
    await styleHeaderRow(hr, "FFFF8C00");
    rows.forEach((r, i) => {
      const mName = members.find((x) => x.id === r.member_id)?.name || "—";
      const row = ws.addRow([r.transaction_date, r.transaction_time || "—", mName, r.bill_name, Number(r.amount || 1), r.notes || ""]);
      const bg = i % 2 === 0 ? "FFFFFFFF" : "FFFFF8E7";
      row.eachCell((cell, col) => {
        cell.font = { name: "Calibri", size: 11 }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        if (col === 5) { cell.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFC47800" } }; cell.alignment = { horizontal: "center" }; }
      });
    });
    const ws2 = wb.addWorksheet("Member Coins");
    ws2.columns = [{ key: "name", width: 22 }, { key: "new", width: 16 }, { key: "old", width: 16 }, { key: "grand", width: 16 }];
    ws2.mergeCells("A1:D1");
    ws2.getCell("A1").value = "Member Coins Summary (counts / nos)";
    ws2.getCell("A1").font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    ws2.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1C28" } };
    const h2 = ws2.getRow(2); h2.values = ["Member", "New Payment (nos)", "Old Payment (nos)", "Grand Total (nos)"];
    await styleHeaderRow(h2, "FFFF8C00");
    const refDate = forDate || to;
    members.forEach((m, i) => {
      const newNos = rows.filter((r) => r.member_id === m.id && r.transaction_date === refDate).reduce((s, r) => s + Number(r.amount || 1), 0);
      const oldNos = coins.filter((r) => r.member_id === m.id && r.transaction_date < refDate).reduce((s, r) => s + Number(r.amount || 1), 0);
      const row = ws2.addRow([m.name, newNos, oldNos, newNos + oldNos]);
      const bg = i % 2 === 0 ? "FFFFFFFF" : "FFFFF8E7";
      row.eachCell((cell) => { cell.font = { name: "Calibri", size: 11 }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }; });
      row.getCell(4).font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFC47800" } };
    });
    downloadBlob(await wb.xlsx.writeBuffer(), forDate ? `FlyBook-Coins-${forDate}.xlsx` : `FlyBook-Coins-${from}_to_${to}.xlsx`);
    setNotice("Coins Excel downloaded.");
  }

  async function exportCombinedExcel() {
    const wb = new ExcelJS.Workbook(); wb.creator = "FlyBook";
    const ws = wb.addWorksheet("Bills");
    ws.columns = [{ key: "date", width: 14 }, { key: "time", width: 10 }, { key: "member", width: 18 }, { key: "type", width: 10 }, { key: "bill", width: 26 }, { key: "amount", width: 14 }, { key: "notes", width: 20 }];
    ws.mergeCells("A1:G1");
    ws.getCell("A1").value = "FlyBook — Bills";
    ws.getCell("A1").font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFFFF" } };
    ws.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1C28" } };
    ws.mergeCells("A2:G2");
    ws.getCell("A2").value = `Debit ${money(billTotals.debit)} | Credit ${money(billTotals.credit)} | Balance ${money(billTotals.balance)} | ${from} → ${to}`;
    ws.getCell("A2").font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    ws.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3977FF" } };
    const hr = ws.getRow(3); hr.values = ["Date", "Time", "Member", "Type", "Bill", "Amount (AED)", "Notes"];
    await styleHeaderRow(hr, "FFFF3B81");
    filteredBills.forEach((r, i) => {
      const mName = members.find((x) => x.id === r.member_id)?.name || "—";
      const row = ws.addRow([r.transaction_date, r.transaction_time || "—", mName, r.type.toUpperCase(), r.bill_name, Number(r.amount), r.notes || ""]);
      const bg = i % 2 === 0 ? "FFFFFFFF" : "FFF8F9FC";
      row.eachCell((cell, col) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }; if (col === 6) cell.numFmt = '"AED" #,##0.00'; });
    });
    const ws2 = wb.addWorksheet("Coins");
    ws2.columns = [{ key: "date", width: 14 }, { key: "time", width: 10 }, { key: "member", width: 18 }, { key: "desc", width: 26 }, { key: "nos", width: 12 }, { key: "notes", width: 20 }];
    const totalNos = filteredCoins.reduce((s, r) => s + Number(r.amount || 1), 0);
    ws2.mergeCells("A1:F1");
    ws2.getCell("A1").value = "FlyBook — Coins";
    ws2.getCell("A1").font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFFFF" } };
    ws2.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1C28" } };
    ws2.mergeCells("A2:F2");
    ws2.getCell("A2").value = `Total Coins: ${totalNos} nos | Entries: ${filteredCoins.length} | ${from} → ${to}`;
    ws2.getCell("A2").font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    ws2.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFB800" } };
    const hr2 = ws2.getRow(3); hr2.values = ["Date", "Time", "Member", "Description", "Coins (nos)", "Notes"];
    await styleHeaderRow(hr2, "FFFF8C00");
    filteredCoins.forEach((r, i) => {
      const mName = members.find((x) => x.id === r.member_id)?.name || "—";
      const row = ws2.addRow([r.transaction_date, r.transaction_time || "—", mName, r.bill_name, Number(r.amount || 1), r.notes || ""]);
      const bg = i % 2 === 0 ? "FFFFFFFF" : "FFFFF8E7";
      row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }; });
    });
    const ws3 = wb.addWorksheet("Dashboard");
    ws3.columns = [{ key: "l", width: 24 }, { key: "v", width: 20 }];
    ws3.mergeCells("A1:B1");
    ws3.getCell("A1").value = "FlyBook Dashboard";
    ws3.getCell("A1").font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFFFF" } };
    ws3.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1C28" } };
    [["Total Debit (Bills)", money(allTotals.debit)], ["Total Credit (Bills)", money(allTotals.credit)], ["Bills Balance", money(allTotals.balance)],
      ["Bills Entries", allTotals.billsCount], ["Total Coins (nos)", allTotals.coinNos], ["Coins Entries", allTotals.coinsCount],
      ["Active Members", allTotals.membersActive]].forEach(([l, v]) => { const row = ws3.addRow([l, v]); row.getCell(1).font = { bold: true }; row.height = 22; });
    downloadBlob(await wb.xlsx.writeBuffer(), `FlyBook-Full-Report-${from}_to_${to}.xlsx`);
    setNotice("Full Excel report downloaded.");
  }

  if (loading) return (
    <div className="login"><div className="loginbox"><h1><span className="brand"><span className="fly">Fly</span><span className="oo">B</span><span className="book">ook</span></span></h1><p>Loading your money book…</p></div></div>
  );

  if (!session) return (
    <div className="login">
      <form className="loginbox" onSubmit={signIn}>
        <div className="brand"><span className="fly">Fly</span><span className="oo">B</span><span className="book">ook</span></div>
        <h1>Money Book</h1>
        <p>Bills &amp; Coins management made simple.</p>
        {notice && <div className="notice">{notice}</div>}
        <div className="field"><label>Username</label>
          <input value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} autoComplete="username" placeholder="Enter username" required />
        </div>
        <div className="field"><label>Password</label>
          <input type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} autoComplete="current-password" placeholder="Enter password" required />
        </div>
        <button className="btn primary" type="submit">Sign in</button>
      </form>
    </div>
  );

  const formFields = (category: "bill" | "coin") => (
    <form onSubmit={(e) => { setForm((f) => ({ ...f, category })); saveTx(e); }} className="formgrid">
      <div className="field"><label>Date</label>
        <input type="date" value={form.transaction_date} disabled={form.time_locked}
          onChange={(e) => setForm({ ...form, transaction_date: e.target.value, category })} />
      </div>
      <div className="field"><label>Time</label>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="time" value={form.transaction_time} disabled={form.time_locked}
            onChange={(e) => setForm({ ...form, transaction_time: e.target.value, category })} style={{ flex: 1 }} />
          <button type="button" className={"btn " + (form.time_locked ? "primary" : "")} onClick={toggleTimeLock}
            title={form.time_locked ? "Unlock date & time" : "Lock to current date & time"} style={{ padding: "8px 10px" }}>
            {form.time_locked ? <Lock size={15} /> : <Unlock size={15} />}
          </button>
        </div>
      </div>
      {category === "bill" && (
        <div className="field"><label>Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any, category })}>
            <option value="debit">Debit</option><option value="credit">Credit</option>
          </select>
        </div>
      )}
      <div className="field"><label>{category === "coin" ? "Description" : "Bill / Description"}</label>
        <input required value={form.bill_name} onChange={(e) => setForm({ ...form, bill_name: e.target.value, category })}
          placeholder={category === "coin" ? "Coin note" : "Bill name"} />
      </div>
      <div className="field"><label>{category === "coin" ? "Coins (nos)" : "Amount (AED)"}</label>
        <input required min={category === "coin" ? "1" : "0"} step={category === "coin" ? "1" : "0.01"} type="number"
          value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value, category })} />
      </div>
      <div className="field"><label>Member</label>
        <input list="member-list" value={form.member_name}
          onChange={(e) => setForm({ ...form, member_name: e.target.value, category })}
          placeholder="Enter member name (auto-adds if new)" />
        <datalist id="member-list">{members.map((m) => <option key={m.id} value={m.name} />)}</datalist>
      </div>
      <div className="field"><label>Notes</label>
        <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value, category })} />
      </div>
      <div className="actions">
        <button className="btn primary" type="submit" onClick={() => setForm((f) => ({ ...f, category }))}>
          {editing ? "Update" : "Save"}
        </button>
        {editing && (
          <button type="button" className="btn" onClick={() => { setEditing(null); setForm(emptyForm(category)); }}>Cancel</button>
        )}
      </div>
    </form>
  );

  const pageTitle = NAV.find((n) => n.id === tab)?.label || "FlyBook";

  return (
    <div className="app-layout">
      <button className="menu-toggle" onClick={() => setSidebarOpen((o) => !o)} aria-label="Toggle menu">
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <div className={"sidebar-overlay" + (sidebarOpen ? " open" : "")} onClick={() => setSidebarOpen(false)} />

      <aside className={"sidebar" + (sidebarOpen ? " open" : "")}>
        <div className="sidebar-brand">
          <span className="brand"><span className="fly">Fly</span><span className="oo">B</span><span className="book">ook</span></span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} className={"side-link" + (tab === id ? " active" : "")} onClick={() => goTab(id)}>
              <Icon size={18} />{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="pill">{login.username || "admin"}</div>
          <button className="btn ghost logout-btn" onClick={signOut}><LogOut size={15} /> Sign out</button>
        </div>
      </aside>

      <div className="main-area">
        <div className="shell">
          <div className="page-head">
            <h1>{pageTitle}</h1>
            <button className="btn ghost mobile-logout" onClick={signOut}><LogOut size={15} /> Logout</button>
          </div>
          {notice && <div className="notice">{notice}</div>}

          {tab === "dashboard" && (
            <>
              <section className="grid">
                <div className="stat"><small>Total Debit (Bills)</small><strong className="red">{money(allTotals.debit)}</strong></div>
                <div className="stat"><small>Total Credit (Bills)</small><strong className="green">{money(allTotals.credit)}</strong></div>
                <div className="stat"><small>Bills Balance</small><strong className={allTotals.balance >= 0 ? "blue" : "red"}>{money(allTotals.balance)}</strong></div>
                <div className="stat"><small>Active Members</small><strong>{allTotals.membersActive}</strong></div>
                <div className="stat"><small>Bills Entries</small><strong className="blue">{allTotals.billsCount}</strong></div>
                <div className="stat"><small>Total Coins (nos)</small><strong style={{ color: "#c47800" }}>{allTotals.coinNos}</strong></div>
                <div className="stat"><small>Coins Entries</small><strong style={{ color: "#c47800" }}>{allTotals.coinsCount}</strong></div>
                <div className="stat"><small>All Entries</small><strong>{allTotals.billsCount + allTotals.coinsCount}</strong></div>
              </section>
              <section className="card">
                <div className="toolbar"><h2>Recent Bills</h2>
                  <button className="btn primary" onClick={() => goTab("bills")}><Plus size={15} /> Add Bill</button>
                </div>
                <TxTable rows={bills.slice(0, 6)} members={members} edit={editTx} del={deleteTx} mode="bill" />
              </section>
              <section className="card">
                <div className="toolbar"><h2>Recent Coins</h2>
                  <button className="btn primary" onClick={() => goTab("coins")}><Plus size={15} /> Add Coins</button>
                </div>
                <TxTable rows={coins.slice(0, 6)} members={members} edit={editTx} del={deleteTx} mode="coin" />
              </section>
            </>
          )}

          {tab === "bills" && (
            <>
              <section className="card">
                <div className="toolbar">
                  <h2>{editing && form.category === "bill" ? "Edit Bill" : "Add Bill"}</h2>
                  <div className="right">
                    <button className="btn excel" onClick={() => exportBillsExcel(bills)}><FileSpreadsheet size={15} /> Excel</button>
                    <button className="btn primary" onClick={() => exportBillsPDF(bills)}>PDF</button>
                  </div>
                </div>
                {formFields("bill")}
              </section>
              <section className="card">
                <h2>Bills Ledger</h2>
                <TxTable rows={bills} members={members} edit={editTx} del={deleteTx} mode="bill" />
              </section>
            </>
          )}

          {tab === "coins" && (
            <>
              <section className="card">
                <div className="toolbar">
                  <h2>{editing && form.category === "coin" ? "Edit Coins" : "Add Coins"}</h2>
                  <div className="right">
                    <button className="btn excel" onClick={() => exportCoinsExcel(dailyCoins.length ? dailyCoins : coins, date)}>
                      <FileSpreadsheet size={15} /> Excel
                    </button>
                    <button className="btn primary" onClick={() => exportCoinsPDF(dailyCoins.length ? dailyCoins : coins, date)}>PDF</button>
                  </div>
                </div>
                {formFields("coin")}
              </section>
              <section className="card">
                <div className="toolbar">
                  <h2>Daily Coins Summary</h2>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="btn" />
                </div>
                <div className="tablewrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>New Payment (nos)</th>
                        <th>Old Payment (nos)</th>
                        <th>Grand Total (nos)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => {
                        const newNos = dailyCoins.filter((x) => x.member_id === m.id).reduce((s, x) => s + Number(x.amount || 1), 0);
                        const oldNos = coins.filter((x) => x.member_id === m.id && x.transaction_date < date).reduce((s, x) => s + Number(x.amount || 1), 0);
                        return (
                          <tr key={m.id}>
                            <td>{m.name}</td>
                            <td><b>{newNos}</b> nos</td>
                            <td>{oldNos} nos</td>
                            <td><b style={{ color: "#c47800" }}>{newNos + oldNos}</b> nos</td>
                          </tr>
                        );
                      })}
                      {!members.length && <tr><td colSpan={4} className="empty">No members yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="card">
                <h2>Coins Ledger (edit / delete)</h2>
                <TxTable rows={coins} members={members} edit={editTx} del={deleteTx} mode="coin" />
              </section>
            </>
          )}

          {tab === "members" && (
            <>
              <section className="card">
                <h2>Add Member</h2>
                <form className="toolbar" onSubmit={addMember}>
                  <input className="btn" style={{ flex: 1 }} value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Member name" required />
                  <button className="btn primary"><Plus size={15} /> Add</button>
                </form>
              </section>
              <section className="card">
                <h2>Members</h2>
                <div className="tablewrap">
                  <table className="table">
                    <thead><tr><th>Name</th><th>Phone</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.id}>
                          <td>{m.name}</td><td>{m.phone || "—"}</td><td>{m.active ? "Active" : "Inactive"}</td>
                          <td><button className="btn" onClick={() => deleteMember(m.id)}><Trash2 size={15} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {tab === "reports" && (
            <section className="card">
              <div className="toolbar">
                <div className="left">
                  <h2>Combined Reports</h2>
                  <input type="date" className="btn" value={from} onChange={(e) => setFrom(e.target.value)} />
                  <span>to</span>
                  <input type="date" className="btn" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
              <div className="grid" style={{ marginBottom: 16 }}>
                <div className="stat"><small>Bills Debit</small><strong className="red">{money(billTotals.debit)}</strong></div>
                <div className="stat"><small>Bills Credit</small><strong className="green">{money(billTotals.credit)}</strong></div>
                <div className="stat"><small>Bills Balance</small><strong>{money(billTotals.balance)}</strong></div>
                <div className="stat"><small>Coins (nos)</small><strong style={{ color: "#c47800" }}>{coinTotals.totalNos}</strong></div>
              </div>
              <div className="toolbar" style={{ flexWrap: "wrap", gap: 10 }}>
                <button className="btn excel" onClick={() => exportBillsExcel(filteredBills)}><FileSpreadsheet size={15} /> Bills Excel</button>
                <button className="btn primary" onClick={() => exportBillsPDF(filteredBills)}>Bills PDF</button>
                <button className="btn excel" onClick={() => exportCoinsExcel(filteredCoins)}><FileSpreadsheet size={15} /> Coins Excel</button>
                <button className="btn primary" onClick={() => exportCoinsPDF(filteredCoins)}>Coins PDF</button>
                <button className="btn excel" onClick={() => exportCombinedExcel()}><FileSpreadsheet size={15} /> Full Excel (Bills + Coins)</button>
                <button className="btn primary" onClick={() => exportCombinedPDF()}>Full PDF (Bills + Coins)</button>
              </div>
              <h2 style={{ marginTop: 20 }}>Bills in range</h2>
              <TxTable rows={filteredBills} members={members} edit={editTx} del={deleteTx} mode="bill" />
              <h2 style={{ marginTop: 20 }}>Coins in range</h2>
              <TxTable rows={filteredCoins} members={members} edit={editTx} del={deleteTx} mode="coin" />
            </section>
          )}
        </div>
      </div>

      <nav className="bottom-nav">
        {NAV.map(({ id, label, Icon }) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => goTab(id)}>
            <Icon size={20} />{label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function TxTable({ rows, members, edit, del, mode }: {
  rows: Tx[]; members: Member[]; edit: (x: Tx) => void; del: (id: number) => void; mode: "bill" | "coin";
}) {
  if (!rows.length) return <div className="empty">No records found.</div>;
  return (
    <div className="tablewrap">
      <table className="table">
        <thead>
          <tr>
            <th>Date</th><th>Time</th><th>Member</th>
            {mode === "bill" && <th>Type</th>}
            <th>{mode === "coin" ? "Description" : "Bill"}</th>
            <th>{mode === "coin" ? "Coins (nos)" : "Amount"}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.transaction_date}</td>
              <td>{r.transaction_time || "—"}</td>
              <td>{members.find((m) => m.id === r.member_id)?.name || "—"}</td>
              {mode === "bill" && <td><span className={"tag " + r.type}>{r.type.toUpperCase()}</span></td>}
              <td>{r.bill_name}</td>
              <td><b>{mode === "coin" ? `${Number(r.amount || 1)} nos` : money(Number(r.amount))}</b></td>
              <td>
                <button className="btn" onClick={() => edit(r)}><Pencil size={14} /></button>{" "}
                <button className="btn" onClick={() => del(r.id)}><Trash2 size={14} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
