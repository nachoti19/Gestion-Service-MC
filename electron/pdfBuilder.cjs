// Generación y lectura de los PDF de presupuestos ("Informe Técnico").
// No depende de Electron para poder probarse por separado.

const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const ASSETS_DIR = path.join(__dirname, "..", "assets", "pdf");

const SERVICE_PHONE = "2494-562663";
const SERVICE_ADDRESS = "Patagonia 1221";
const SERVICE_CUIT = "20-39962698-7";

// Línea de contacto del pie en los PDF particulares y sin intermediario
const CONTACT_LINE = `${SERVICE_ADDRESS} | ${SERVICE_PHONE} | ${SERVICE_CUIT}`;

const INSURER_LABELS = {
  SIN_INTERMEDIARIO: "Sin intermediario",
  FEDERACION_PATRONAL: "Federación Patronal",
  MERCANTIL_ANDINA: "Mercantil Andina",
};

const INSURER_FOOTERS = {
  FEDERACION_PATRONAL: "FEDERACIÓN PATRONAL",
  MERCANTIL_ANDINA: "MERCANTIL ANDINA",
};

// Colores tomados de las plantillas originales
const PANEL = rgb(248 / 255, 252 / 255, 252 / 255);
const NAVY = rgb(16 / 255, 32 / 255, 76 / 255);
const LABEL_GRAY = rgb(0.53, 0.55, 0.58);
const TITLE_GRAY = rgb(0.25, 0.27, 0.3);
const BOX_BORDER = rgb(0.82, 0.85, 0.88);
const BLACK = rgb(0, 0, 0);

// ---------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------

// Las fuentes estándar de PDF solo soportan WinAnsi: se reemplaza lo que no entra.
function sanitize(text) {
  return String(text ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\r?\n/g, " ")
    .replace(/\t/g, " ")
    .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, "?")
    .trim();
}

// Igual que sanitize pero conserva los saltos de línea (campos multilínea).
function sanitizeMultiline(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => sanitize(line))
    .join("\n")
    .trim();
}

const moneyFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(value) {
  return moneyFormatter.format(Number(value) || 0);
}

// 'YYYY-MM-DD' -> 'DD/MM/YYYY'
function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso ?? "");
}

// 'D/M/YYYY' -> 'YYYY-MM-DD' (para leer la fecha de los PDF)
function parseArgDate(text) {
  const m = /^\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s*$/.exec(String(text ?? ""));
  if (!m) return "";
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function clientFullName(client) {
  return `${client?.name ?? ""} ${client?.surname ?? ""}`.trim();
}

function clientAddress(client) {
  return [client?.adress, client?.city]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

// Corta un texto en líneas que entren en maxWidth.
function wrapLines(text, font, size, maxWidth) {
  const lines = [];

  for (const paragraph of String(text).split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";

    if (words.length === 0) {
      lines.push("");
      continue;
    }

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;

      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }

    lines.push(current);
  }

  return lines;
}

// Busca el tamaño de letra más grande (entre startSize y minSize) con el que el
// texto entra en el alto disponible.
function fitText(text, font, maxWidth, maxHeight, startSize, minSize) {
  let size = startSize;

  while (size >= minSize) {
    const lineHeight = size * 1.25;
    const lines = wrapLines(text, font, size, maxWidth);

    if (lines.length * lineHeight <= maxHeight) {
      return { size, lineHeight, lines };
    }

    size -= 0.5;
  }

  const lineHeight = minSize * 1.25;
  const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
  const lines = wrapLines(text, font, minSize, maxWidth).slice(0, maxLines);

  return { size: minSize, lineHeight, lines };
}

function drawWrapped(page, text, font, { x, topY, width, height, size, minSize }) {
  const fit = fitText(text, font, width, height, size, minSize ?? 7);

  fit.lines.forEach((line, i) => {
    page.drawText(line, {
      x,
      y: topY - fit.size - i * fit.lineHeight,
      size: fit.size,
      font,
      color: BLACK,
    });
  });
}

function setField(form, name, text, { multiline = false, fontSize } = {}) {
  const field = form.getTextField(name);
  const clean = multiline ? sanitizeMultiline(text) : sanitize(text);

  field.setText(clean || undefined);

  if (fontSize) {
    field.setFontSize(fontSize);
  }
}

// ---------------------------------------------------------------
// Generación
// ---------------------------------------------------------------

function loadAsset(name) {
  return fs.readFileSync(path.join(ASSETS_DIR, name));
}

// Texto del pie "negrita" como en los originales
function drawFooter(page, font, text, centerX) {
  const size = 16;
  const width = font.widthOfTextAtSize(text, size);
  const x = centerX - width / 2;

  for (const dx of [0, 0.3]) {
    page.drawText(text, { x: x + dx, y: 41.96, size, font, color: BLACK });
  }
}

// El centro del pie en los originales (Federación: x=192.21, 16 pt)
const FOOTER_CENTER_X = 297.5;

// Pie con dirección, celular y CUIT (más chico que el nombre de la aseguradora)
function drawContactFooter(page, font) {
  const size = 12;
  const width = font.widthOfTextAtSize(CONTACT_LINE, size);
  const x = FOOTER_CENTER_X - width / 2;

  for (const dx of [0, 0.25]) {
    page.drawText(CONTACT_LINE, { x: x + dx, y: 42, size, font, color: BLACK });
  }
}

async function buildSinIntermediario(data) {
  const doc = await PDFDocument.load(loadAsset("sin_intermediario.pdf"));
  const form = doc.getForm();
  const { budget, client, appliance } = data;
  const insured = data.insured || {};

  const set = (name, text, opts) => setField(form, name, text, opts);

  set("Text1", clientFullName(client));
  set("Text2", insured.claim);
  set("Text3", formatDate(budget.pickup_date));
  set("Text4", insured.policy);
  // Sin intermediario: "Siniestro" pasa a ser "Compañía" y la descripción del
  // siniestro se reemplaza por la dirección del cliente.
  set("Text5", clientAddress(client), { multiline: true });
  set("Text6", appliance.brand);
  set("Text7", appliance.model);
  set("Text8", appliance.serial_number);
  set("Text9", insured.appliance_description || appliance.type, { multiline: true });
  set("Text10", insured.received_status);
  set("Text11", insured.affected_parts);
  set("Text12", budget.repair_description);
  set("Text13", insured.cause, { multiline: true });
  set("Text14", budget.details, { multiline: true });
  set("Text15", formatMoney(budget.parts_price), { fontSize: 12 });
  set("Text17", formatMoney(budget.labor_price), { fontSize: 12 });
  set("Text18", formatMoney(budget.price), { fontSize: 12 });

  const font = await doc.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  form.flatten({ updateFieldAppearances: false });

  // Las etiquetas de la plantilla vienen en la imagen de fondo: se tapan y se
  // vuelven a escribir con los nombres que corresponden.
  const page = doc.getPage(0);
  const labelBg = rgb(247 / 255, 251 / 255, 253 / 255);
  const labelColor = rgb(0.6, 0.62, 0.64);

  page.drawRectangle({ x: 50, y: 665, width: 52, height: 16, color: labelBg });
  page.drawText("Compañía:", { x: 52, y: 670, size: 10.5, font, color: labelColor });

  page.drawRectangle({ x: 50, y: 614.5, width: 135, height: 14, color: labelBg });
  page.drawText("Dirección:", { x: 52, y: 618, size: 10.5, font, color: labelColor });

  // Pie: se tapa el teléfono original y se escribe la línea de contacto
  page.drawRectangle({ x: 190, y: 28, width: 220, height: 30, color: rgb(1, 1, 1) });
  drawContactFooter(page, font);

  return doc.save();
}

async function buildSeguro(data) {
  const doc = await PDFDocument.load(loadAsset("seguro_base.pdf"));
  const form = doc.getForm();
  const page = doc.getPage(0);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const { budget, client, appliance } = data;
  const insured = data.insured || {};

  const set = (name, text, opts) => setField(form, name, text, opts);

  set("FechaRetiro", formatDate(budget.pickup_date), { fontSize: 10 });
  set("NroSerie", appliance.serial_number, { fontSize: 10 });
  set("Estado", insured.received_status, { fontSize: 10 });
  set("Partes", insured.affected_parts, { fontSize: 10 });
  set("Diagnostico", budget.repair_description, { fontSize: 10 });
  set("Causa", insured.cause, { multiline: true, fontSize: 10 });
  set("Observaciones", budget.details, { multiline: true, fontSize: 10 });
  set("Repuestos", formatMoney(budget.parts_price), { fontSize: 14 });
  set("MO", formatMoney(budget.labor_price), { fontSize: 14 });
  set("Total", formatMoney(budget.price), { fontSize: 16 });

  form.updateFieldAppearances(font);
  form.flatten({ updateFieldAppearances: false });

  // Datos que en las plantillas originales vienen como texto fijo
  const line = (text, x, y) =>
    page.drawText(sanitize(text), { x, y, size: 9, font, color: BLACK });

  line(clientFullName(client), 120, 688.54);
  line(insured.claim, 110, 670.54);
  line(insured.policy, 115, 633.54);
  line(appliance.brand, 130, 509.54);
  line(appliance.model, 137, 491.54);

  drawWrapped(page, sanitizeMultiline(insured.claim_description), font, {
    x: 55,
    topY: 612,
    width: 460,
    height: 37,
    size: 9,
    minSize: 6.5,
  });

  drawWrapped(
    page,
    sanitizeMultiline(insured.appliance_description || appliance.type),
    font,
    { x: 55, topY: 447, width: 460, height: 37, size: 9, minSize: 6.5 },
  );

  drawFooter(page, font, INSURER_FOOTERS[budget.insurer] || "", FOOTER_CENTER_X);

  return doc.save();
}

// Presupuesto particular (sin seguro): mismo diseño, con las partes de seguro
// reemplazadas por los datos del cliente, el arreglo y los repuestos.
async function buildParticular(data) {
  const doc = await PDFDocument.load(loadAsset("seguro_base.pdf"));
  const form = doc.getForm();
  const page = doc.getPage(0);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const { budget, client, appliance } = data;
  const items = data.items || [];

  // Campos que se conservan
  setField(form, "Observaciones", budget.details, { multiline: true, fontSize: 10 });
  setField(form, "Total", formatMoney(budget.price), { fontSize: 16 });

  // Campos que no se usan
  for (const name of [
    "FechaRetiro",
    "NroSerie",
    "Estado",
    "Partes",
    "Diagnostico",
    "Causa",
    "Repuestos",
    "MO",
  ]) {
    form.removeField(form.getTextField(name));
  }

  form.updateFieldAppearances(font);
  form.flatten({ updateFieldAppearances: false });

  const cover = (x, y, w, h) =>
    page.drawRectangle({ x, y, width: w, height: h, color: PANEL });

  // Se tapa el contenido de seguros y se vuelve a dibujar lo necesario
  cover(46, 238, 488, 482); // cuerpo del formulario hasta "Observaciones"
  cover(46, 719, 260, 20); // título "Datos del asegurado"
  cover(80, 137, 262, 21); // etiquetas Repuestos / Mano de Obra
  cover(80, 78, 262, 46); // cuadros Repuestos / Mano de Obra

  // Restos de las barras originales que sobresalen a la izquierda del panel
  for (const y of [697, 517, 354]) {
    page.drawRectangle({
      x: 0,
      y,
      width: 46,
      height: 24,
      color: rgb(252 / 255, 252 / 255, 252 / 255),
    });
  }

  const title = (text, y) => {
    page.drawText(text, { x: 51, y, size: 11, font, color: TITLE_GRAY });
    page.drawRectangle({ x: 50, y: y - 14, width: 470, height: 3, color: NAVY });
  };

  const row = (label, value, y, boxX) => {
    page.drawText(label, { x: 52, y: y + 2, size: 10, font, color: LABEL_GRAY });
    page.drawRectangle({
      x: boxX,
      y: y - 3,
      width: 517 - boxX,
      height: 15,
      borderColor: BOX_BORDER,
      borderWidth: 0.8,
    });
    page.drawText(sanitize(value), {
      x: boxX + 4,
      y: y + 1,
      size: 9,
      font,
      color: BLACK,
    });
  };

  title("Datos del cliente", 725);
  row("Cliente:", clientFullName(client), 685, 104);
  row("Fecha de retiro del Artículo:", formatDate(budget.pickup_date), 665, 187);

  title("Descripción del Artículo", 638);
  row("Marca:", appliance.brand, 600, 100);
  row("Modelo:", appliance.model, 580, 104);
  row("Equipo:", appliance.type, 560, 100);

  title("Descripción del arreglo", 533);
  page.drawRectangle({
    x: 50,
    y: 440,
    width: 467,
    height: 75,
    borderColor: BOX_BORDER,
    borderWidth: 0.8,
  });
  drawWrapped(page, sanitizeMultiline(budget.repair_description), font, {
    x: 55,
    topY: 511,
    width: 457,
    height: 67,
    size: 10,
    minSize: 7,
  });

  title("Repuestos utilizados", 424);
  page.drawRectangle({
    x: 50,
    y: 246,
    width: 467,
    height: 160,
    borderColor: BOX_BORDER,
    borderWidth: 0.8,
  });

  const partLines = items.map(
    (it) => `${it.quantity} x ${sanitize(it.name)}`,
  );

  if (partLines.length === 0) {
    page.drawText("Sin repuestos", {
      x: 55,
      y: 392,
      size: 9,
      font,
      color: LABEL_GRAY,
    });
  } else {
    // Hasta 12 renglones en una columna; si hay más se usan dos columnas.
    const columns = partLines.length > 12 ? 2 : 1;
    const perColumn = Math.ceil(partLines.length / columns);
    const size = perColumn > 12 ? 8 : 10;
    const lineHeight = size * 1.3;
    const colWidth = 457 / columns;

    partLines.forEach((text, i) => {
      const col = Math.floor(i / perColumn);
      const rowIndex = i % perColumn;
      const fit = fitText(text, font, colWidth - 8, lineHeight, size, 6.5);

      page.drawText(fit.lines[0] || "", {
        x: 55 + col * colWidth,
        y: 396 - size - rowIndex * lineHeight,
        size: fit.size,
        font,
        color: BLACK,
      });
    });
  }

  drawContactFooter(page, font);

  return doc.save();
}

// ---------------------------------------------------------------
// Informe de repuestos ("Pedido de repuestos")
// ---------------------------------------------------------------

// report: { created_at, date_from, date_to, lines: [{ type, name, quantity }] }
async function buildPartsReportPdf(report) {
  const doc = await PDFDocument.create();
  const baseDoc = await PDFDocument.load(loadAsset("seguro_base.pdf"));
  const [embedded] = await doc.embedPdf(baseDoc, [0]);
  const { width: pageWidth, height: pageHeight } = baseDoc.getPage(0).getSize();

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const white = rgb(252 / 255, 252 / 255, 252 / 255);
  const TOP = 712;
  const BOTTOM = 80;

  const newPage = (first) => {
    const page = doc.addPage([pageWidth, pageHeight]);
    page.drawPage(embedded);

    // Se tapa el formulario de la plantilla y el título "Informe Técnico"
    page.drawRectangle({ x: 46, y: 60, width: 488, height: 662, color: PANEL });
    page.drawRectangle({ x: 395, y: 745, width: 135, height: 24, color: PANEL });

    // Restos de las barras originales que sobresalen a la izquierda del panel
    for (const y of [697, 517, 354, 116]) {
      page.drawRectangle({ x: 0, y, width: 46, height: 24, color: white });
    }

    // Título "Datos del asegurado" de la plantilla
    page.drawRectangle({ x: 46, y: 719, width: 260, height: 20, color: PANEL });

    const title = "Pedido de repuestos";
    page.drawText(title, {
      x: 516 - font.widthOfTextAtSize(title, 16),
      y: 752,
      size: 16,
      font,
      color: BLACK,
    });

    if (first) {
      page.drawText(
        `Período: ${formatDate(report.date_from)} al ${formatDate(report.date_to)}`,
        { x: 51, y: TOP, size: 11, font: bold, color: TITLE_GRAY },
      );
      page.drawText(`Fecha de creación: ${formatDate(report.created_at)}`, {
        x: 51,
        y: TOP - 18,
        size: 11,
        font,
        color: TITLE_GRAY,
      });
      page.drawRectangle({ x: 50, y: TOP - 30, width: 470, height: 3, color: NAVY });
    }

    return page;
  };

  // Agrupa por tipo de electrodoméstico, en orden alfabético
  const groups = new Map();
  for (const line of report.lines) {
    const type = line.type || "Otros";
    groups.set(type, [...(groups.get(type) ?? []), line]);
  }

  const sortedGroups = [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "es"))
    .map(([type, lines]) => [
      type,
      [...lines].sort((a, b) => a.name.localeCompare(b.name, "es")),
    ]);

  let page = newPage(true);
  let y = TOP - 54;

  const heading = (type, continued) => {
    const text = sanitize(continued ? `${type} (continuación)` : type);
    page.drawText(text, { x: 51, y, size: 12, font: bold, color: TITLE_GRAY });
    page.drawRectangle({ x: 50, y: y - 5, width: 470, height: 0.8, color: BOX_BORDER });
    y -= 24;
  };

  for (const [type, lines] of sortedGroups) {
    if (y < BOTTOM + 50) {
      page = newPage(false);
      y = TOP;
    }

    heading(type, false);

    for (const line of lines) {
      if (y < BOTTOM) {
        page = newPage(false);
        y = TOP;
        heading(type, true);
      }

      const fit = fitText(
        `${line.quantity} x ${sanitize(line.name)}`,
        font,
        455,
        14,
        11,
        7,
      );

      page.drawText(fit.lines[0] || "", {
        x: 58,
        y,
        size: fit.size,
        font,
        color: BLACK,
      });

      y -= 17;
    }

    y -= 10;
  }

  return doc.save();
}

// data: { budget, client, appliance, insured, items }
async function buildBudgetPdf(data) {
  const { budget } = data;

  if (budget.type === "SIN_SEGURO") {
    return buildParticular(data);
  }

  if (budget.insurer === "SIN_INTERMEDIARIO") {
    return buildSinIntermediario(data);
  }

  if (budget.insurer === "FEDERACION_PATRONAL" || budget.insurer === "MERCANTIL_ANDINA") {
    return buildSeguro(data);
  }

  throw new Error("Aseguradora no válida para generar el PDF");
}

// ---------------------------------------------------------------
// Lectura de los PDF que envían las aseguradoras
// ---------------------------------------------------------------

// items: [{ str, x, y }] con y en coordenadas PDF (0 = borde inferior).
function textInBand(items, yMin, yMax) {
  return items
    .filter((it) => it.y >= yMin && it.y <= yMax && it.str.trim())
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .map((it) => it.str.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseInsurerItems(items, fieldValues = {}) {
  const footer = textInBand(items, 30, 52).toUpperCase();

  let insurer = "";
  if (footer.includes("FEDERACI")) insurer = "FEDERACION_PATRONAL";
  else if (footer.includes("MERCANTIL")) insurer = "MERCANTIL_ANDINA";

  return {
    insurer,
    client_name: textInBand(items, 683, 695),
    claim: textInBand(items, 665, 677),
    policy: textInBand(items, 628, 640),
    claim_description: textInBand(items, 555, 607),
    brand: textInBand(items, 504, 516),
    model: textInBand(items, 486, 498),
    appliance_description: textInBand(items, 400, 443),
    // Campos que el service ya pudo haber completado en el PDF
    pickup_date: parseArgDate(fieldValues.FechaRetiro),
    serial_number: String(fieldValues.NroSerie ?? "").trim(),
    received_status: String(fieldValues.Estado ?? "").trim(),
    affected_parts: String(fieldValues.Partes ?? "").trim(),
    repair_description: String(fieldValues.Diagnostico ?? "").trim(),
    cause: String(fieldValues.Causa ?? "").trim(),
  };
}

async function readFormValues(bytes) {
  const values = {};

  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = doc.getForm();

    for (const name of [
      "FechaRetiro",
      "NroSerie",
      "Estado",
      "Partes",
      "Diagnostico",
      "Causa",
    ]) {
      try {
        values[name] = form.getTextField(name).getText() ?? "";
      } catch {
        // el PDF no tiene ese campo
      }
    }
  } catch {
    // PDF sin formulario
  }

  return values;
}

async function parseInsurerPdf(bytes) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    verbosity: 0,
    useSystemFonts: false,
  });

  const pdf = await loadingTask.promise;

  try {
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();

    const items = content.items
      .filter((it) => typeof it.str === "string")
      .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));

    const fieldValues = await readFormValues(bytes);

    return parseInsurerItems(items, fieldValues);
  } finally {
    await pdf.destroy();
  }
}

module.exports = {
  INSURER_LABELS,
  SERVICE_PHONE,
  buildBudgetPdf,
  buildPartsReportPdf,
  parseInsurerPdf,
  parseInsurerItems,
  formatMoney,
  formatDate,
  parseArgDate,
  sanitize,
};
