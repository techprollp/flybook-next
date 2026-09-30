/** Minimal PDF writer (WinAnsi text) — no external deps */

function esc(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "");
}

export class SimplePDF {
  pages: string[] = [];
  current = "";
  y = 800;
  pageNo = 0;

  newPage() {
    if (this.current) this.pages.push(this.current);
    this.current = "";
    this.y = 800;
    this.pageNo++;
  }

  ensureSpace(h: number) {
    if (this.y - h < 40) this.newPage();
  }

  text(x: number, y: number, size: number, str: string, bold = false) {
    const font = bold ? "F2" : "F1";
    this.current += `BT /${font} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${esc(str)}) Tj ET\n`;
  }

  textRight(x: number, y: number, size: number, str: string, bold = false) {
    // approximate width
    const w = str.length * size * 0.5;
    this.text(x - w, y, size, str, bold);
  }

  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    fill = false,
    stroke = false,
    rgb?: [number, number, number]
  ) {
    if (rgb) {
      if (fill)
        this.current += `${rgb[0]} ${rgb[1]} ${rgb[2]} rg\n`;
      if (stroke)
        this.current += `${rgb[0]} ${rgb[1]} ${rgb[2]} RG\n`;
    }
    this.current += `${x} ${y} ${w} ${h} re ${fill && stroke ? "B" : fill ? "f" : "S"}\n`;
  }

  line(x1: number, y1: number, x2: number, y2: number, width = 0.5) {
    this.current += `${width} w ${x1} ${y1} m ${x2} ${y2} l S\n`;
  }

  finish(): Buffer {
    if (this.current) this.pages.push(this.current);
    const objs: string[] = [];
    objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    const kids = this.pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
    objs[2] = `<< /Type /Pages /Kids [${kids}] /Count ${this.pages.length} >>`;
    let nextId = 3;
    const pageIds: number[] = [];
    for (let i = 0; i < this.pages.length; i++) {
      const contentId = nextId + 1;
      objs[nextId] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${nextId + 2} 0 R /F2 ${nextId + 3} 0 R >> >> >>`;
      const stream = this.pages[i];
      objs[contentId] =
        `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
      objs[nextId + 2] =
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
      objs[nextId + 3] =
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
      pageIds.push(nextId);
      nextId += 4;
    }
    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];
    for (let i = 1; i < nextId; i++) {
      offsets[i] = Buffer.byteLength(pdf, "utf8");
      pdf += `${i} 0 obj\n${objs[i] || "<< >>"}\nendobj\n`;
    }
    const xref = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${nextId}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i < nextId; i++) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${nextId} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf, "utf8");
  }
}
