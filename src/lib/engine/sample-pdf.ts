function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pageStream(lines: { t: string; x: number; y: number; size: number }[]) {
  const ops = ["BT", "/F1 12 Tf", "0 g"];
  for (const line of lines) {
    ops.push(`/F1 ${line.size} Tf`);
    ops.push(`1 0 0 1 ${line.x} ${line.y} Tm`);
    ops.push(`(${esc(line.t)}) Tj`);
  }
  ops.push("ET");
  return ops.join("\n");
}

export function buildDemoPdf(): ArrayBuffer {
  const p1 = pageStream([
    { t: "DESKTOP CAPTURE", x: 72, y: 720, size: 22 },
    { t: "Local media bridge for Resolume Arena", x: 72, y: 690, size: 12 },
    { t: "This PDF is generated on the host PC. It never leaves the machine.", x: 72, y: 650, size: 11 },
    { t: "1. Load a local file or application window", x: 72, y: 610, size: 12 },
    { t: "2. Match Arena output resolution and FPS", x: 72, y: 588, size: 12 },
    { t: "3. Start the sender  DesktopCapture", x: 72, y: 566, size: 12 },
    { t: "4. In Arena: Sources > Spout > DesktopCapture", x: 72, y: 544, size: 12 },
    { t: "No Wi-Fi. No Bluetooth. No cloud.", x: 72, y: 500, size: 12 },
  ]);
  const p2 = pageStream([
    { t: "STAGE PLOT  /  PAGE 2", x: 72, y: 720, size: 18 },
    { t: "LED wall   1920 x 1080   60 FPS", x: 72, y: 680, size: 12 },
    { t: "Portrait totem   1080 x 1920", x: 72, y: 658, size: 12 },
    { t: "Triple-wide ribbon   3840 x 1080", x: 72, y: 636, size: 12 },
    { t: "Spout sender name must match the Arena source.", x: 72, y: 596, size: 12 },
    { t: "Minimized windows continue to render into the texture.", x: 72, y: 574, size: 12 },
  ]);

  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const s1 = add(`${p1.length} stream\n${p1}\nendstream`);
  // We'll rebuild with proper stream objects; use a simpler approach below.
  void s1;

  const streamObj = (content: string) =>
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;

  const objs: string[] = [];
  objs.push("<< /Type /Catalog /Pages 2 0 R >>"); // 1
  objs.push("<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>"); // 2
  objs.push(
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 7 0 R >> >> >>",
  ); // 3
  objs.push(
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 7 0 R >> >> >>",
  ); // 4
  objs.push(streamObj(p1)); // 5
  objs.push(streamObj(p2)); // 6
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"); // 7

  let body = "%PDF-1.4\n";
  const offsets = [0];
  objs.forEach((obj, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = body.length;
  let xrefTable = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) {
    xrefTable += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += xrefTable;
  body += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const buf = new Uint8Array(body.length);
  for (let i = 0; i < body.length; i++) buf[i] = body.charCodeAt(i) & 0xff;
  return buf.buffer;
}

export const DEMO_HTML = `<!doctype html>
<html>
<head><title>Tonight</title></head>
<body>
  <h1>Hall A</h1>
  <h2>Local playback page</h2>
  <p>This page is a local HTML file. Desktop Capture rasterizes it on the host PC and sends a video texture into Resolume Arena.</p>
  <p>Doors 19:30. Show 20:15. Encore 21:40. House lights restored locally.</p>
  <h3>Looks</h3>
  <ul>
    <li>Walk-in</li>
    <li>Ident</li>
    <li>Main</li>
  </ul>
</body>
</html>`;
