import { useCallback, useEffect, useMemo, useState } from "react";
import PdfViewerModal from "../common/PdfViewerModal";
import TypeMultiSelect from "../common/TypeMultiSelect";
import { useConfirm } from "../common/ConfirmDialog";
import { errorMessage } from "../../utils/format";
import { firstDayOfMonthISO, formatDate, todayISO } from "../../utils/date";
import { buildPartsReportText } from "../../utils/partsReportText";

type Row = Awaited<
  ReturnType<typeof window.electronAPI.getPartsReport>
>[number];
type SavedReport = Awaited<
  ReturnType<typeof window.electronAPI.getPartsReports>
>[number];

// Informe de repuestos usados entre dos fechas, para pedirle al proveedor
const Index = () => {
  const { confirm, dialog } = useConfirm();

  const [from, setFrom] = useState(firstDayOfMonthISO());
  const [to, setTo] = useState(todayISO());
  // Al abrir, solo está marcado Lavarropas
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["Lavarropas"]);
  const [rows, setRows] = useState<Row[]>([]);
  const [includePending, setIncludePending] = useState<Record<number, boolean>>(
    {},
  );
  const [history, setHistory] = useState<SavedReport[]>([]);
  const [viewing, setViewing] = useState<{ id: number; text: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await window.electronAPI.getPartsReports());
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const load = useCallback(async () => {
    if (!from || !to) return;

    if (from > to) {
      setError('La fecha "Desde" no puede ser posterior a "Hasta"');
      setRows([]);
      return;
    }

    try {
      setError("");
      setRows(await window.electronAPI.getPartsReport(from, to));
      setIncludePending({});
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  // Solo se ofrecen los tipos que tuvieron movimiento en las fechas elegidas
  const typeOptions = useMemo(
    () =>
      [...new Set(rows.map((r) => r.type))].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [rows],
  );

  const activeTypes = useMemo(
    () => selectedTypes.filter((t) => typeOptions.includes(t)),
    [selectedTypes, typeOptions],
  );

  const visibleRows = useMemo(
    () => rows.filter((r) => activeTypes.includes(r.type)),
    [rows, activeTypes],
  );

  const confirmed = (r: Row) => r.sold + r.budgeted;
  const toOrder = (r: Row) =>
    confirmed(r) + (includePending[r.item_id] ? r.pending : 0);

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of visibleRows)
      map.set(r.type, [...(map.get(r.type) ?? []), r]);
    return [...map.entries()];
  }, [visibleRows]);

  const lines = visibleRows
    .filter((r) => toOrder(r) > 0)
    .map((r) => ({ type: r.type, name: r.name, quantity: toOrder(r) }));

  const totalToOrder = lines.reduce((s, l) => s + l.quantity, 0);
  const withPending = visibleRows.filter((r) => r.pending > 0);

  const generate = async () => {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const result = await window.electronAPI.createPartsReport({
        date_from: from,
        date_to: to,
        types: activeTypes,
        lines,
      });

      if (result.ok) {
        setNotice("Informe generado y guardado en el historial.");
        await loadHistory();
        setViewing({
          id: result.id,
          text: buildPartsReportText({
            created_at: todayISO(),
            date_from: from,
            date_to: to,
            lines,
          }),
        });
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const openSaved = async (id: number) => {
    const report = await window.electronAPI.getPartsReportById(id);

    if (!report) return setError("El informe no existe");

    setViewing({ id, text: buildPartsReportText(report) });
  };

  const removeSaved = async (report: SavedReport) => {
    const ok = await confirm(
      `¿Eliminar el informe del ${formatDate(report.created_at)}?`,
      { danger: true, confirmLabel: "Eliminar" },
    );

    if (!ok) return;

    await window.electronAPI.deletePartsReport(report.id);
    loadHistory();
  };

  return (
    <div className="text-start mb-5">
      {dialog}
      <h1 className="text-center">INFORME DE REPUESTOS</h1>

      <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
        <label className="m-0">Desde</label>
        <input
          type="date"
          className="form-control w-auto"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <label className="m-0">Hasta</label>
        <input
          type="date"
          className="form-control w-auto"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
        <strong>Electrodomésticos:</strong>
        <TypeMultiSelect
          options={typeOptions}
          selected={activeTypes}
          onChange={setSelectedTypes}
        />
      </div>

      {error && <div className="alert alert-danger mt-3">{error}</div>}
      {notice && <div className="alert alert-success mt-3">{notice}</div>}

      <p className="text-muted mt-3">
        Repuestos usados entre el {formatDate(from)} y el {formatDate(to)}:
        ventas particulares y presupuestos aceptados (por fecha de creación del
        presupuesto). Los presupuestos rechazados no se cuentan.
      </p>

      {visibleRows.length === 0 && !error && (
        <p className="text-muted">
          No se usaron repuestos en ese período para los electrodomésticos
          elegidos.
        </p>
      )}

      {withPending.length > 0 && (
        <div className="alert alert-warning">
          Hay <strong>{withPending.length}</strong> repuesto(s) en presupuestos
          que todavía no se aceptaron. Tildá "Incluir pendientes" en los que
          quieras sumar al pedido.
        </div>
      )}

      {groups.map(([type, list]) => (
        <div key={type} className="mb-4">
          <h5 className="border-bottom pb-1">{type}</h5>
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>Repuesto</th>
                <th className="text-end">Stock actual</th>
                <th className="text-end">Ventas</th>
                <th className="text-end">Presupuestos aceptados</th>
                <th className="text-end">Pendientes</th>
                <th className="text-center">Incluir pendientes</th>
                <th className="text-end">A pedir</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.item_id}>
                  <td>{r.name}</td>
                  <td className="text-end">{r.stock}</td>
                  <td className="text-end">{r.sold}</td>
                  <td className="text-end">{r.budgeted}</td>
                  <td className="text-end">{r.pending}</td>
                  <td className="text-center">
                    {r.pending > 0 && (
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={Boolean(includePending[r.item_id])}
                        onChange={(e) =>
                          setIncludePending((p) => ({
                            ...p,
                            [r.item_id]: e.target.checked,
                          }))
                        }
                      />
                    )}
                  </td>
                  <td className="text-end fw-bold">{toOrder(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="d-flex align-items-center justify-content-end gap-3 mt-3">
        <span className="fs-5">
          Total de unidades a pedir: <strong>{totalToOrder}</strong>
        </span>
        <button
          className="btn btn-success"
          onClick={generate}
          disabled={lines.length === 0 || saving}
        >
          <i className="bi bi-file-earmark-pdf me-1"></i>Generar informe
        </button>
      </div>

      {/* Historial de informes generados */}
      <hr className="my-5" />
      <h2 className="fs-4">Historial de pedidos</h2>

      {history.length === 0 ? (
        <p className="text-muted">Todavía no generaste ningún informe.</p>
      ) : (
        <ul className="list-group">
          {history.map((r) => (
            <li
              key={r.id}
              className="list-group-item d-flex align-items-center gap-2"
            >
              <span className="me-auto">
                Pedido del {formatDate(r.created_at)}
              </span>
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => openSaved(r.id)}
              >
                Ver más
              </button>
              <button
                className="btn btn-outline-danger btn-sm"
                title="Eliminar"
                onClick={() => removeSaved(r)}
              >
                <i className="bi bi-trash"></i>
              </button>
            </li>
          ))}
        </ul>
      )}

      {viewing && (
        <PdfViewerModal
          reportId={viewing.id}
          textContent={viewing.text}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
};

export default Index;
