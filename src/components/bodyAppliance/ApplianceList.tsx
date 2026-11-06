import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Appliance } from "../../models/Appliance";
import ApplianceForm from "./ApplianceForm";
import IndexModal from "../modal/Index";
import PdfViewerModal from "../common/PdfViewerModal";
import { useConfirm } from "../common/ConfirmDialog";
import { insurerLabel, stateBadge, stateLabel } from "../../models/Budget";
import { errorMessage, money } from "../../utils/format";
import { formatDate } from "../../utils/date";

type BudgetRow = Awaited<ReturnType<typeof window.electronAPI.getBudgetsByAppliance>>[number];

type Props = {
  clientId: number;
};

// Equipos de un cliente, con su historial de reparaciones y el acceso a "Generar presupuesto"
function ApplianceList({ clientId }: Props) {
  const navigate = useNavigate();

  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [deletedAppliances, setDeletedAppliances] = useState<Appliance[]>([]);
  const [budgets, setBudgets] = useState<Record<number, BudgetRow[]>>({});
  const [types, setTypes] = useState<string[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [form, setForm] = useState<{ appliance?: Appliance } | null>(null);
  const [pdfBudgetId, setPdfBudgetId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      const [active, deleted, typesDB] = await Promise.all([
        window.electronAPI.getApplianceByClient(clientId),
        window.electronAPI.getApplianceByClient(clientId, true),
        window.electronAPI.getApplianceTypes(),
      ]);

      const all = [...active, ...deleted];
      const entries = await Promise.all(
        all.map(
          async (a) =>
            [a.id, await window.electronAPI.getBudgetsByAppliance(a.id)] as const,
        ),
      );

      setAppliances(active);
      setDeletedAppliances(deleted);
      setBudgets(Object.fromEntries(entries));
      setTypes(typesDB.map((t) => t.name));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const handleDelete = async (a: Appliance) => {
    const ok = await confirm(
      `¿Eliminar el equipo ${a.type} ${a.brand}?\n\nSe oculta pero su historial se conserva y se puede restaurar.`,
      { danger: true, confirmLabel: "Eliminar" },
    );

    if (ok) run(() => window.electronAPI.deleteAppliance(a.id));
  };

  const handleDeletePermanently = async (a: Appliance) => {
    const ok = await confirm(
      `BORRADO COMPLETO del equipo ${a.type} ${a.brand}.\n\nSe eliminarán también todos sus presupuestos. No se puede deshacer.`,
      { danger: true, confirmLabel: "Borrar definitivamente" },
    );

    if (ok) run(() => window.electronAPI.deleteAppliancePermanently(a.id));
  };

  const list = showDeleted ? deletedAppliances : appliances;

  return (
    <>
      {dialog}
      <div className="d-flex align-items-center mb-2">
        <h2 className="fs-4 m-0 me-auto">Equipos</h2>
        <div className="form-check form-switch me-3 m-0">
          <input
            className="form-check-input"
            type="checkbox"
            id="showDeletedAppliances"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="showDeletedAppliances">
            Ver eliminados ({deletedAppliances.length})
          </label>
        </div>
        <button className="btn btn-primary" onClick={() => setForm({})}>
          Agregar equipo
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {list.length === 0 && (
        <p className="text-muted text-start">
          {showDeleted ? "No hay equipos eliminados." : "Este cliente todavía no tiene equipos."}
        </p>
      )}

      <div className="mb-5">
        {list.map((a) => {
          const history = budgets[a.id] ?? [];

          return (
            <div key={a.id} className={`card text-start mb-3 ${showDeleted ? "border-danger" : ""}`}>
              <div className="card-body">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <h5 className="m-0 me-auto">
                    {a.type} {a.brand}
                    {a.model && <small className="text-muted"> · {a.model}</small>}
                    {a.serial_number && (
                      <small className="text-muted"> · N° serie {a.serial_number}</small>
                    )}
                  </h5>

                  {showDeleted ? (
                    <>
                      <button className="btn btn-success btn-sm" onClick={() => run(() => window.electronAPI.restoreAppliance(a.id))}>
                        Restaurar
                      </button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeletePermanently(a)}>
                        BORRADO COMPLETO
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/budget/new/${clientId}/${a.id}`)}
                      >
                        <i className="bi bi-file-earmark-plus me-1"></i>Generar presupuesto
                      </button>
                      <button className="btn btn-success btn-sm" onClick={() => setForm({ appliance: a })}>
                        Editar
                      </button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(a)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </>
                  )}
                </div>

                <hr />
                <h6 className="text-muted">Historial de reparaciones</h6>

                {history.length === 0 ? (
                  <p className="text-muted small m-0">Todavía no tiene presupuestos.</p>
                ) : (
                  <ul className="list-group">
                    {history.map((b) => (
                      <li
                        key={b.id}
                        className="list-group-item d-flex flex-wrap align-items-center gap-2"
                      >
                        <span className="me-auto">
                          {formatDate(b.date)} ·{" "}
                          {b.type === "CON_SEGURO"
                            ? `Seguro (${insurerLabel(b.insurer)})`
                            : "Sin seguro"}{" "}
                          · {money(b.price)}
                        </span>
                        <span className={`badge ${stateBadge(b.state)}`}>{stateLabel(b.state)}</span>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => setPdfBudgetId(b.id)}>
                          Ver presupuesto
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {form && (
        <IndexModal>
          <ApplianceForm
            clientId={clientId}
            appliance={form.appliance}
            types={types}
            onClose={(saved) => {
              setForm(null);
              if (saved) load();
            }}
          />
        </IndexModal>
      )}

      {pdfBudgetId !== null && (
        <PdfViewerModal budgetId={pdfBudgetId} onClose={() => setPdfBudgetId(null)} />
      )}
    </>
  );
}

export default ApplianceList;
