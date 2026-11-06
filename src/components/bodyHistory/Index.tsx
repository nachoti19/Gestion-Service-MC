import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import IndexSearch from "../searchBar/Index";
import PdfViewerModal from "../common/PdfViewerModal";
import SaleDetailModal from "./SaleDetailModal";
import { useConfirm } from "../common/ConfirmDialog";
import {
  NEXT_STATES,
  insurerLabel,
  stateBadge,
  stateLabel,
} from "../../models/Budget";
import { errorMessage, matchesSearch, money } from "../../utils/format";
import { dateOnly, formatDate } from "../../utils/date";

type Row = Awaited<ReturnType<typeof window.electronAPI.getHistory>>[number];
type DateMode = "all" | "exact" | "range";
type StatusFilter =
  | "all"
  | "pendiente"
  | "en reparacion"
  | "finalizado"
  | "rechazado"
  | "VENTA PARTICULAR";

const Index = () => {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [dateMode, setDateMode] = useState<DateMode>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [pdfId, setPdfId] = useState<number | null>(null);
  const [sale, setSale] = useState<Row | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setRows(await window.electronAPI.getHistory());
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () =>
      rows.filter((r) => {
        if (status !== "all" && r.state !== status) return false;

        const day = dateOnly(r.date);

        if (dateMode === "exact" && from && day !== from) return false;
        if (dateMode === "range") {
          if (from && day < from) return false;
          if (to && day > to) return false;
        }

        const text = [
          r.client_name ?? "Venta particular",
          r.appliance_type ?? "",
          r.appliance_brand ?? "",
          stateLabel(r.state),
          r.type === "CON_SEGURO" ? `seguro ${insurerLabel(r.insurer)}` : "",
          formatDate(r.date),
        ].join(" ");

        return matchesSearch(text, search);
      }),
    [rows, search, dateMode, from, to, status],
  );

  const changeState = async (row: Row, state: string) => {
    const message =
      state === "rechazado"
        ? "¿Marcar el presupuesto como RECHAZADO?\n\nLos repuestos vuelven al stock y ya no podrá modificarse."
        : state === "en reparacion"
          ? "¿Marcar el presupuesto como ACEPTADO (en reparación)?\n\nYa no podrá editarse."
          : "¿Marcar la reparación como FINALIZADA?";

    const ok = await confirm(message, {
      danger: state === "rechazado",
      confirmLabel: state === "rechazado" ? "Rechazar" : "Confirmar",
    });
    if (!ok) return;

    const result = await window.electronAPI.setBudgetState(row.id, state);

    if (!result.ok) setError(result.error);
    else setError("");

    load();
  };

  const removeBudget = async (row: Row) => {
    const ok = await confirm(
      `¿Eliminar el presupuesto de ${row.client_name} (${row.appliance_type} ${row.appliance_brand})?`,
      { danger: true, confirmLabel: "Eliminar" },
    );

    if (!ok) return;

    const result = await window.electronAPI.deleteBudget(row.id);

    if (!result.ok) setError(result.error);
    else setError("");

    load();
  };

  const actionLabel = (state: string) =>
    ({
      "en reparacion": "Aceptar",
      rechazado: "Rechazar",
      finalizado: "Finalizar",
    })[state] ?? state;

  return (
    <>
      {dialog}
      <IndexSearch
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Buscar..."
      />

      <div className="d-flex flex-wrap align-items-center gap-2 mt-3 text-start">
        <select
          className="form-select w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
        >
          <option value="all">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="en reparacion">En reparación</option>
          <option value="finalizado">Finalizados</option>
          <option value="rechazado">Rechazados</option>
          <option value="VENTA PARTICULAR">Ventas particulares</option>
        </select>

        <select
          className="form-select w-auto"
          value={dateMode}
          onChange={(e) => setDateMode(e.target.value as DateMode)}
        >
          <option value="all">Todas las fechas</option>
          <option value="exact">Fecha exacta</option>
          <option value="range">Rango de fechas</option>
        </select>

        {dateMode !== "all" && (
          <>
            <label className="m-0">
              {dateMode === "exact" ? "Fecha" : "Desde"}
            </label>
            <input
              type="date"
              className="form-control w-auto"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </>
        )}

        {dateMode === "range" && (
          <>
            <label className="m-0">Hasta</label>
            <input
              type="date"
              className="form-control w-auto"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </>
        )}

        <span className="ms-auto text-muted small">
          {visible.length} resultado(s)
        </span>
      </div>

      {error && <div className="alert alert-danger mt-3">{error}</div>}

      {visible.length === 0 && (
        <p className="text-muted mt-4">
          {rows.length === 0
            ? "Todavía no hay movimientos."
            : "No hay resultados para los filtros elegidos."}
        </p>
      )}

      <ul className="list-group mt-3 mb-5 text-start">
        {visible.map((r) => (
          <li key={`${r.kind}-${r.id}`} className="list-group-item">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="me-auto">
                <div className="fw-semibold">
                  {r.kind === "sale" ? "Venta particular" : r.client_name}
                </div>
                <div className="text-muted small">
                  {r.kind === "budget" && (
                    <>
                      {r.appliance_type} {r.appliance_brand} ·{" "}
                      {r.type === "CON_SEGURO"
                        ? `Seguro (${insurerLabel(r.insurer)})`
                        : "Sin seguro"}{" "}
                      ·{" "}
                    </>
                  )}
                  {formatDate(r.date)} · {money(r.total)}
                </div>
              </div>

              <span className={`badge ${stateBadge(r.state)}`}>
                {stateLabel(r.state)}
              </span>

              {r.kind === "budget" ? (
                <>
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setPdfId(r.id)}
                  >
                    Ver presupuesto
                  </button>
                  {r.state === "pendiente" && (
                    <button
                      className="btn btn-outline-success btn-sm"
                      onClick={() => navigate(`/budget/edit/${r.id}`)}
                    >
                      Editar
                    </button>
                  )}
                  {(r.state === "finalizado" || r.state === "rechazado") && (
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => removeBudget(r)}
                    >
                      <i className="bi bi-trash me-1"></i>Eliminar
                    </button>
                  )}
                  {(NEXT_STATES[r.state] ?? []).map((next) => (
                    <button
                      key={next}
                      className={`btn btn-sm ${next === "rechazado" ? "btn-outline-danger" : "btn-success"}`}
                      onClick={() => changeState(r, next)}
                    >
                      {actionLabel(next)}
                    </button>
                  ))}
                </>
              ) : (
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => setSale(r)}
                >
                  Ver más
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {pdfId !== null && (
        <PdfViewerModal budgetId={pdfId} onClose={() => setPdfId(null)} />
      )}

      {sale && (
        <SaleDetailModal
          saleId={sale.id}
          date={sale.date}
          total={sale.total}
          onClose={() => setSale(null)}
        />
      )}
    </>
  );
};

export default Index;
