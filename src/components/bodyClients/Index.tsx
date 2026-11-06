import { useCallback, useEffect, useMemo, useState } from "react";
import CardClient from "./CardClient";
import ClientForm from "./ClientForm";
import IndexSearch from "../searchBar/Index";
import IndexModal from "../modal/Index";
import { useConfirm } from "../common/ConfirmDialog";
import type { Client } from "../../models/Client";
import { errorMessage, matchesSearch } from "../../utils/format";

const Index = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [deletedClients, setDeletedClients] = useState<Client[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      const [active, deleted] = await Promise.all([
        window.electronAPI.getAllClients(),
        window.electronAPI.getDeletedClients(),
      ]);
      setClients(active);
      setDeletedClients(deleted);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = showDeleted ? deletedClients : clients;

  const visible = useMemo(
    () =>
      list.filter((c) =>
        matchesSearch(
          `${c.name} ${c.surname} ${c.phone} ${c.adress} ${c.city} ${c.details ?? ""}`,
          search,
        ),
      ),
    [list, search],
  );

  const restore = async (client: Client) => {
    await window.electronAPI.restoreClient(client.id);
    load();
  };

  const deletePermanently = async (client: Client) => {
    const name = `${client.name} ${client.surname}`;

    const first = await confirm(
      `BORRADO COMPLETO de ${name}.\n\nSe eliminarán también sus equipos y TODOS sus presupuestos. Esta acción no se puede deshacer.`,
      { danger: true, confirmLabel: "Continuar" },
    );
    if (!first) return;

    const second = await confirm(
      `¿Seguro que querés borrar definitivamente a ${name}?`,
      {
        danger: true,
        confirmLabel: "Borrar definitivamente",
      },
    );
    if (!second) return;

    try {
      await window.electronAPI.deleteClientPermanently(client.id);
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <>
      {dialog}
      <IndexSearch
        actions={["client"]}
        onAdd={() => setShowForm(true)}
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Buscar cliente..."
      />

      <div className="form-check form-switch text-start mt-3">
        <input
          className="form-check-input"
          type="checkbox"
          id="showDeleted"
          checked={showDeleted}
          onChange={(e) => setShowDeleted(e.target.checked)}
        />
        <label className="form-check-label" htmlFor="showDeleted">
          Mostrar clientes eliminados ({deletedClients.length})
        </label>
      </div>

      {error && <div className="alert alert-danger mt-3">{error}</div>}

      {visible.length === 0 && (
        <p className="text-muted mt-4">
          {list.length === 0
            ? showDeleted
              ? "No hay clientes eliminados."
              : "Todavía no hay clientes cargados."
            : "No se encontraron clientes con esa búsqueda."}
        </p>
      )}

      <div className="row row-cols-1 row-cols-md-4 g-4 mb-5">
        {visible.map((client) => (
          <CardClient
            key={client.id}
            client={client}
            isDeleted={showDeleted}
            onRestore={restore}
            onDeletePermanently={deletePermanently}
          />
        ))}
      </div>

      {showForm && (
        <IndexModal>
          <ClientForm
            onClose={(saved) => {
              setShowForm(false);
              if (saved) load();
            }}
          />
        </IndexModal>
      )}
    </>
  );
};

export default Index;
