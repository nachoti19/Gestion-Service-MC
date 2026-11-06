export const INSURERS = [
  { value: "SIN_INTERMEDIARIO", label: "Sin intermediario" },
  { value: "FEDERACION_PATRONAL", label: "Federación Patronal" },
  { value: "MERCANTIL_ANDINA", label: "Mercantil Andina" },
] as const;

export const insurerLabel = (value: string | null) =>
  INSURERS.find((i) => i.value === value)?.label ?? "";

// Estados de un presupuesto y a cuáles puede pasar
export const BUDGET_STATES = ["pendiente", "rechazado", "en reparacion", "finalizado"];

export const stateLabel = (state: string) =>
  ({
    pendiente: "Pendiente",
    rechazado: "Rechazado",
    "en reparacion": "En reparación...",
    finalizado: "Finalizado",
    "VENTA PARTICULAR": "VENTA PARTICULAR",
  })[state] ?? state;

export const stateBadge = (state: string) =>
  ({
    pendiente: "text-bg-warning",
    rechazado: "text-bg-danger",
    "en reparacion": "text-bg-primary",
    finalizado: "text-bg-success",
    "VENTA PARTICULAR": "text-bg-info",
  })[state] ?? "text-bg-secondary";

export const NEXT_STATES: Record<string, string[]> = {
  pendiente: ["en reparacion", "rechazado"],
  "en reparacion": ["finalizado"],
  rechazado: [],
  finalizado: [],
};
