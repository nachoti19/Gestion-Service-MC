import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { NavLink } from "react-router-dom";
import IndexModal from "../modal/Index";
import ApplianceForm from "../bodyAppliance/ApplianceForm";
import "./detailsClient.css";
import ApplianceList from "../bodyAppliance/ApplianceList";

type Props = {};

function DetailsClient({}: Props) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const loadClient = async () => {
      if (!id) return;

      try {
        const result = await window.electronAPI.getClientById(Number(id));

        console.log("Cliente obtenido:", result);

        setClient(result);
      } catch (error) {
        console.error("Error al obtener el cliente:", error);
      }
    };

    loadClient();
  }, [id]);

  console.log("ID del cliente:", id);
  console.log("Cliente:", client);

  if (!client) {
    return <div>Cargando cliente...</div>;
  }

  const handleDelete = async () => {
    const confirmar = window.confirm(
      `¿Está seguro que quiere eliminar el cliente "${client.name} ${client.surname}"?
      
ADVERTENCIA: Eliminar el cliente eliminará los electrodomésticos asociados.`,
    );

    if (!confirmar) return;

    try {
      const result = await window.electronAPI.deleteClient(client.id);

      if (result.changes > 0) {
        console.log("Se eliminó el cliente");
        navigate("/client");
      } else {
        console.log("No se encontró el cliente");
      }
    } catch (error) {
      console.log("Error al borrar el cliente", error);
    }
  };

  return (
    <>
      <div className="clientBox rounded p-3">
        <div className="d-flex justify-content-between mb-5">
          <div>
            <h1>
              <i className="bi bi-person-circle me-1"></i>
              {client?.name} {client?.surname}
            </h1>
            <p className="card-text fs-3">
              <i className="bi bi-geo-alt-fill me-1"></i>
              {client.adress}
            </p>
            <p className="card-text fs-3">
              <i className="bi bi-telephone-fill me-1"></i>
              {client.phone}
            </p>
            {client.details && (
              <p className="card-text fs-3">
                <i className="bi bi-building-fill"></i>
                {client.details}
              </p>
            )}
            <p className="card-text fs-3">
              <i className="bi bi-map me-1"></i>
              {client.city}
            </p>
          </div>
          <div>
            <NavLink
              className="btn btn-success me-1"
              to={`/client/edit/${client.id}`}
              state={{ client }}
            >
              editar
            </NavLink>
            <button
              className="btn btn-danger me-1"
              type="button"
              onClick={handleDelete}
            >
              Eliminar
            </button>
          </div>
        </div>
        <div className="d-flex justify-content-between">
          <h1>EQUIPOS DEL CLIENTE</h1>
          <div>
            <NavLink
              to={`/client/${client.id}/appliance/new`}
              className="btn btn-success me-1"
            >
              Agregar
            </NavLink>
            <button
              className="btn btn-success me-1"
              onClick={() => setShowForm(true)}
            >
              AGREGAR EQUIPO
            </button>
          </div>
        </div>
        <ApplianceList client={client.id} />
      </div>
      {showForm && (
        <IndexModal>
          <ApplianceForm
            clientModal={client.id}
            onClose={() => {
              setShowForm(false);
            }}
          />
        </IndexModal>
      )}
    </>
  );
}

export default DetailsClient;
