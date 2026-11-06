import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Client } from "../../models/Client";
import type { Appliance } from "../../models/Appliance";
import type { Item } from "../../models/Item";
import { INSURERS } from "../../models/Budget";
import PdfViewerModal from "../common/PdfViewerModal";
import { errorMessage, matchesSearch, money, normalizeText } from "../../utils/format";
import { todayISO } from "../../utils/date";

type Kind = "SIN_SEGURO" | "CON_SEGURO";

const EMPTY_INSURED = {
  claim: "",
  policy: "",
  claim_description: "",
  appliance_description: "",
  received_status: "",
  affected_parts: "",
  cause: "",
};

// Formulario de presupuesto (nuevo o edición de uno pendiente)
function BudgetForm() {
  const params = useParams();
  const navigate = useNavigate();
  const budgetId = params.budgetId ? Number(params.budgetId) : undefined;

  const [client, setClient] = useState<Client | null>(null);
  const [appliance, setAppliance] = useState<Appliance | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [reserved, setReserved] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const [kind, setKind] = useState<Kind>("SIN_SEGURO");
  const [insurer, setInsurer] = useState("");
  const [pickup, setPickup] = useState(todayISO());
  const [serial, setSerial] = useState("");
  const [repair, setRepair] = useState("");
  const [labor, setLabor] = useState("");
  const [details, setDetails] = useState("");
  const [ins, setIns] = useState(EMPTY_INSURED);
  const [lines, setLines] = useState<Record<number, number>>({});

  const [onlyType, setOnlyType] = useState(true);
  const [itemSearch, setItemSearch] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ kind: "info" | "warning"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);

  // ---------- Carga inicial ----------
  useEffect(() => {
    (async () => {
      try {
        const stock = await window.electronAPI.getAllItems();
        setItems(stock.map((i) => ({ ...i })));

        if (budgetId) {
          const detail = await window.electronAPI.getBudgetById(budgetId);

          if (!detail) return setError("El presupuesto no existe");
          if (detail.budget.state !== "pendiente")
            return setError("Solo se pueden editar presupuestos pendientes");

          setClient(detail.client);
          setAppliance(detail.appliance);
          setKind(detail.budget.type);
          setInsurer(detail.budget.insurer ?? "");
          setPickup(detail.budget.pickup_date || todayISO());
          setSerial(detail.appliance.serial_number);
          setRepair(detail.budget.repair_description);
          setLabor(String(detail.budget.labor_price));
          setDetails(detail.budget.details ?? "");

          if (detail.insured) {
            setIns({
              claim: detail.insured.claim,
              policy: detail.insured.policy,
              claim_description: detail.insured.claim_description,
              appliance_description: detail.insured.appliance_description,
              received_status: detail.insured.received_status,
              affected_parts: detail.insured.affected_parts,
              cause: detail.insured.cause,
            });
          }

          // Lo que este presupuesto ya tiene reservado cuenta como disponible
          const mine = Object.fromEntries(detail.items.map((i) => [i.item_id, i.quantity]));
          setReserved(mine);
          setLines(mine);
        } else {
          const c = await window.electronAPI.getClientById(Number(params.clientId));
          const a = await window.electronAPI.getApplianceById(Number(params.applianceId));

          if (!c || !a) return setError("No se encontró el cliente o el equipo");

          setClient(c);
          setAppliance(a);
          setSerial(a.serial_number);
        }
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [budgetId, params.clientId, params.applianceId]);

  const available = (item: Item) => item.quantity + (reserved[item.id] ?? 0);

  // ---------- Repuestos ----------
  const candidates = useMemo(
    () =>
      items.filter(
        (i) =>
          (!onlyType || !appliance || normalizeText(i.type) === normalizeText(appliance.type)) &&
          matchesSearch(`${i.name} ${i.type}`, itemSearch),
      ),
    [items, onlyType, appliance, itemSearch],
  );

  const selected = useMemo(
    () =>
      Object.entries(lines)
        .map(([id, quantity]) => ({ item: items.find((i) => i.id === Number(id)), quantity }))
        .filter((l): l is { item: Item; quantity: number } => Boolean(l.item)),
    [lines, items],
  );

  const setQty = (item: Item, quantity: number) =>
    setLines((prev) => {
      const next = { ...prev };
      const safe = Math.min(Math.max(quantity, 0), available(item));

      if (safe === 0) delete next[item.id];
      else next[item.id] = safe;

      return next;
    });

  const partsTotal = selected.reduce((s, l) => s + l.item.price * l.quantity, 0);
  const laborNumber = Number(labor) || 0;
  const total = partsTotal + laborNumber;

  // ---------- PDF de la aseguradora ----------
  const loadInsurerPdf = async () => {
    setError("");
    setNotice(null);

    const result = await window.electronAPI.parseInsurerPdf();

    if (!result.ok) {
      if (!result.canceled) setError(result.error ?? "No se pudo leer el PDF");
      return;
    }

    const d = result.data;

    setIns((prev) => ({
      claim: d.claim || prev.claim,
      policy: d.policy || prev.policy,
      claim_description: d.claim_description || prev.claim_description,
      appliance_description: d.appliance_description || prev.appliance_description,
      received_status: d.received_status || prev.received_status,
      affected_parts: d.affected_parts || prev.affected_parts,
      cause: d.cause || prev.cause,
    }));

    if (d.insurer) setInsurer(d.insurer);
    if (d.pickup_date) setPickup(d.pickup_date);
    if (d.serial_number) setSerial(d.serial_number);
    if (d.repair_description) setRepair(d.repair_description);

    const sameClient =
      client && normalizeText(d.client_name).includes(normalizeText(client.surname));

    setNotice(
      sameClient
        ? { kind: "info", text: "Datos cargados desde el PDF. Revisá y completá lo que falte." }
        : {
            kind: "warning",
            text: `Datos cargados, pero el asegurado del PDF ("${d.client_name}") no coincide con el cliente seleccionado. Verificá que sea el PDF correcto.`,
          },
    );
  };

  // ---------- Guardar ----------
  const handleSave = async () => {
    if (!client || !appliance) return;

    setSaving(true);
    setError("");

    try {
      const result = await (budgetId
        ? window.electronAPI.updateBudget
        : window.electronAPI.createBudget)({
        id: budgetId,
        type: kind,
        insurer: kind === "CON_SEGURO" ? insurer : null,
        client_id: client.id,
        appliance_id: appliance.id,
        pickup_date: pickup,
        repair_description: repair,
        labor_price: laborNumber,
        details,
        items: selected.map((l) => ({ item_id: l.item.id, quantity: l.quantity })),
        insured: kind === "CON_SEGURO" ? ins : undefined,
        appliance_serial: serial.trim() !== appliance.serial_number ? serial.trim() : undefined,
      });

      if (result.ok) setSavedId(result.id);
      else setError(result.error);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const backTo = client ? `/client/${client.id}` : "/client";

  if (loading) return <p className="mt-4 text-muted">Cargando...</p>;

  if (!client || !appliance) {
    return (
      <>
        {error && <div className="alert alert-danger mt-4">{error}</div>}
        <Link to="/history" className="btn btn-primary">Volver</Link>
      </>
    );
  }

  const insField = (
    name: keyof typeof EMPTY_INSURED,
    label: string,
    opts: { multiline?: boolean; col?: string } = {},
  ) => (
    <div className={opts.col ?? "col-12"}>
      <label className="form-label mb-0">{label}</label>
      {opts.multiline ? (
        <textarea
          className="form-control"
          rows={2}
          value={ins[name]}
          onChange={(e) => setIns((p) => ({ ...p, [name]: e.target.value }))}
        />
      ) : (
        <input
          className="form-control"
          value={ins[name]}
          onChange={(e) => setIns((p) => ({ ...p, [name]: e.target.value }))}
        />
      )}
    </div>
  );

  return (
    <div className="text-start mb-5">
      <div className="d-flex align-items-center mt-3 mb-3">
        <Link to={backTo} className="btn btn-outline-secondary btn-sm me-3">
          <i className="bi bi-arrow-left"></i> Volver
        </Link>
        <h1 className="m-0">{budgetId ? "Editar presupuesto" : "Nuevo presupuesto"}</h1>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <strong>
            {client.name} {client.surname}
          </strong>{" "}
          · {client.phone}
          <br />
          {appliance.type} {appliance.brand} {appliance.model}
        </div>
      </div>

      {/* Tipo de presupuesto */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center gap-3">
            <div className="btn-group" role="group">
              <input type="radio" className="btn-check" id="kind-no" checked={kind === "SIN_SEGURO"} onChange={() => setKind("SIN_SEGURO")} />
              <label className="btn btn-outline-primary" htmlFor="kind-no">Sin seguro</label>
              <input type="radio" className="btn-check" id="kind-yes" checked={kind === "CON_SEGURO"} onChange={() => setKind("CON_SEGURO")} />
              <label className="btn btn-outline-primary" htmlFor="kind-yes">Con seguro</label>
            </div>

            {kind === "CON_SEGURO" && (
              <>
                <select className="form-select w-auto" value={insurer} onChange={(e) => setInsurer(e.target.value)}>
                  <option value="">Elegí la aseguradora</option>
                  {INSURERS.map((i) => (
                    <option key={i.value} value={i.value}>{i.label}</option>
                  ))}
                </select>
                <button type="button" className="btn btn-secondary" onClick={loadInsurerPdf}>
                  <i className="bi bi-file-earmark-pdf me-1"></i>Cargar PDF de la aseguradora
                </button>
              </>
            )}
          </div>

          {notice && <div className={`alert alert-${notice.kind} mt-3 mb-0 py-2`}>{notice.text}</div>}
        </div>
      </div>

      {/* Datos del equipo / siniestro */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <label className="form-label mb-0">Fecha de retiro del artículo</label>
              <input type="date" className="form-control" value={pickup} onChange={(e) => setPickup(e.target.value)} />
            </div>

            {kind === "CON_SEGURO" && (
              <>
                <div className="col-md-8">
                  <label className="form-label mb-0">Número de serie del equipo</label>
                  <input className="form-control" value={serial} onChange={(e) => setSerial(e.target.value)} />
                </div>
                {insurer === "SIN_INTERMEDIARIO" ? (
                  <>
                    {insField("claim", "Compañía", { col: "col-md-6" })}
                    {insField("policy", "Póliza", { col: "col-md-6" })}
                    <div className="col-12">
                      <small className="text-muted">
                        En el PDF la dirección sale de la ficha del cliente: {client.adress}, {client.city}.
                      </small>
                    </div>
                  </>
                ) : (
                  <>
                    {insField("claim", "Siniestro", { col: "col-md-6" })}
                    {insField("policy", "Póliza", { col: "col-md-6" })}
                    {insField("claim_description", "Descripción del siniestro", { multiline: true })}
                  </>
                )}
                {insField("appliance_description", "Descripción del bien (ej: TELEVISORES - LED TV)", { multiline: true })}
                {insField("received_status", "Estado del bien recibido", { col: "col-md-6" })}
                {insField("affected_parts", "Partes afectadas", { col: "col-md-6" })}
                {insField("cause", "Causa del daño", { multiline: true })}
              </>
            )}

            <div className="col-12">
              <label className="form-label mb-0">
                Descripción del arreglo{kind === "CON_SEGURO" && " (Diagnóstico)"}
              </label>
              <textarea className="form-control" rows={3} value={repair} onChange={(e) => setRepair(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Repuestos */}
      <div className="card mb-3">
        <div className="card-body">
          <h5>Repuestos</h5>

          <div className="d-flex flex-wrap gap-3 align-items-center mb-2">
            <input
              className="form-control w-auto flex-grow-1"
              placeholder="Buscar repuesto..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
            />
            <div className="form-check m-0">
              <input className="form-check-input" type="checkbox" id="onlyType" checked={onlyType} onChange={(e) => setOnlyType(e.target.checked)} />
              <label className="form-check-label" htmlFor="onlyType">
                Solo repuestos de {appliance.type}
              </label>
            </div>
          </div>

          <div className="border rounded mb-3" style={{ maxHeight: 220, overflowY: "auto" }}>
            <table className="table table-sm table-hover align-middle m-0">
              <tbody>
                {candidates.length === 0 && (
                  <tr><td className="text-muted p-3">No hay repuestos para mostrar.</td></tr>
                )}
                {candidates.map((item) => {
                  const inBudget = lines[item.id] ?? 0;
                  const free = available(item) - inBudget;

                  return (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td><span className="badge text-bg-secondary">{item.type}</span></td>
                      <td>{money(item.price)}</td>
                      <td className={free === 0 ? "text-danger" : ""}>Disp.: {free}</td>
                      <td className="text-end">
                        <button className="btn btn-primary btn-sm" disabled={free <= 0} onClick={() => setQty(item, inBudget + 1)}>
                          Agregar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h6>En este presupuesto</h6>
          {selected.length === 0 ? (
            <p className="text-muted small">Todavía no agregaste repuestos.</p>
          ) : (
            <table className="table table-sm align-middle">
              <tbody>
                {selected.map(({ item, quantity }) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{money(item.price)}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-secondary" onClick={() => setQty(item, quantity - 1)}>−</button>
                        <span className="btn btn-outline-secondary disabled">{quantity}</span>
                        <button className="btn btn-outline-secondary" disabled={quantity >= available(item)} onClick={() => setQty(item, quantity + 1)}>+</button>
                      </div>
                    </td>
                    <td className="text-end fw-semibold">{money(item.price * quantity)}</td>
                    <td className="text-end">
                      <button className="btn btn-outline-danger btn-sm" title="Quitar" onClick={() => setQty(item, 0)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <small className="text-muted">
            Los repuestos se descuentan del stock al guardar. Si el presupuesto se rechaza, vuelven solos.
          </small>
        </div>
      </div>

      {/* Mano de obra, observaciones y totales */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label mb-0">Mano de obra ($)</label>
              <input type="number" min="0" step="0.01" className="form-control" value={labor} onChange={(e) => setLabor(e.target.value)} />
            </div>
            <div className="col-md-8">
              <label className="form-label mb-0">Observaciones <small className="text-muted">(opcional)</small></label>
              <textarea className="form-control" rows={2} value={details} onChange={(e) => setDetails(e.target.value)} />
            </div>
          </div>
          <hr />
          <div className="d-flex justify-content-end gap-4">
            <span>Repuestos: <strong>{money(partsTotal)}</strong></span>
            <span>Mano de obra: <strong>{money(laborNumber)}</strong></span>
            <span className="fs-5">Total: <strong>{money(total)}</strong></span>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <button className="btn btn-success me-2" onClick={handleSave} disabled={saving}>
        {budgetId ? "Guardar cambios" : "Guardar presupuesto"}
      </button>
      <Link to={backTo} className="btn btn-danger">Cancelar</Link>

      {savedId !== null && (
        <PdfViewerModal budgetId={savedId} onClose={() => navigate("/history")} />
      )}
    </div>
  );
}

export default BudgetForm;
