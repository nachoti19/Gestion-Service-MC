import { formatDate } from "./date";

type Report = {
  created_at: string;
  date_from: string;
  date_to: string;
  lines: { type: string; name: string; quantity: number }[];
};

// Versión en texto plano del pedido de repuestos (para copiar y pegar)
export function buildPartsReportText(report: Report): string {
  const groups = new Map<string, { name: string; quantity: number }[]>();

  for (const line of report.lines) {
    const type = line.type || "Otros";
    groups.set(type, [...(groups.get(type) ?? []), line]);
  }

  const out = [
    "PEDIDO DE REPUESTOS",
    `Período: ${formatDate(report.date_from)} al ${formatDate(report.date_to)}`,
    `Fecha de creación: ${formatDate(report.created_at)}`,
  ];

  [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "es"))
    .forEach(([type, lines]) => {
      out.push("", type.toUpperCase());
      [...lines]
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .forEach((l) => out.push(`${l.quantity} x ${l.name}`));
    });

  return out.join("\n");
}
