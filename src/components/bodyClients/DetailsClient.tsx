import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Client } from "../../models/Client";
import ClientForm from "./ClientForm";
import IndexModal from "../modal/Index";
import ApplianceList from "../bodyAppliance/ApplianceList";
import { errorMessage } from "../../utils/format";
import { useConfirm } from "../common/ConfirmDialog";

function DetailsClient() {
  const { id } = useParams();
  const clientId = Number(id);
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      const data = await window.electronAPI.getClientById(clientId);
      setClient(data ?? null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoaded(true);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!client) return;

    const ok = await confirm(
      `¿Eliminar a ${client.name} ${client.surname}?\n\nSe oculta junto con sus equipos, pero su historial se conserva y se puede restaurar desde Clientes.`,
      { danger: true, confirmLabel: "Eliminar" },
    );
    if (!ok) return;

    try {
      await window.electronAPI.deleteClient(client.id);
      navigate("/client");
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (loaded && !client) {
    return (
      <>
        <p className="mt-4">No se encontró el cliente.</p>
        <Link to="/client" className="btn btn-primary">
          Volver a clientes
        </Link>
      </>
    );
  }

  if (!client) return <p className="mt-4 text-muted">Cargando...</p>;

  return (
    <>
      {dialog}
      <div className="d-flex align-items-center mt-3 mb-3">
        <Link to="/client" className="btn btn-outline-secondary btn-sm me-3">
          <i className="bi bi-arrow-left"></i> Clientes
        </Link>
        <h1 className="m-0">
          {client.name} {client.surname}
        </h1>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card text-start mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <small className="text-muted d-block">Celular</small>
              {client.phone}
            </div>
            <div className="col-md-4">
              <small className="text-muted d-block">Dirección</small>
              {client.adress}
            </div>
            <div className="col-md-2">
              <small className="text-muted d-block">Ciudad</small>
              {client.city}
            </div>
            <div className="col-md-3">
              <small className="text-muted d-block">Observaciones</small>
              {client.details || "—"}
            </div>
          </div>
        </div>
        <div className="card-footer d-flex gap-1">
          <button className="btn btn-success btn-sm" onClick={() => setEditing(true)}>
            Editar cliente
          </button>
          <button className="btn btn-outline-danger btn-sm ms-auto" onClick={handleDelete}>
            <i className="bi bi-trash"></i> Eliminar cliente
          </button>
        </div>
      </div>

      <ApplianceList clientId={client.id} />

      {editing && (
        <IndexModal>
          <ClientForm
            client={client}
            onClose={(saved) => {
              setEditing(false);
              if (saved) load();
            }}
          />
        </IndexModal>
      )}
    </>
  );
}

export default DetailsClient;
