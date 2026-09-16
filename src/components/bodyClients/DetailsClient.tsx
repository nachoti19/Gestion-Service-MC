import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { NavLink } from "react-router-dom";
import IndexModal from "../modal/Index";
import ApplianceForm from "./ApplianceForm";
import "./detailsClient.css";
import ApplianceList from "../bodyAppliance/ApplianceList";

type Props = {};

function DetailsClient({}: Props) {
  const { id } = useParams();
  const location = useLocation();
  const client = location.state?.client;
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!client) {
      console.log("no hay cliente para eliminar", client);
      return;
    }

    const confirmar = window.confirm(
      `Esta seguro que quiere eliminar el cliente "${client.name} ${client.surname}"`,
    );

    if (!confirmar) return;

    try {
      const result = await window.electronAPI.deleteClient(client.id);

      if (result.changes > 0) {
        console.log("se elimino el cliente");
        navigate("/client");
      } else {
        console.log("no se encontro el cliente");
      }
    } catch (error) {
      console.log("error al borrar el cliente", error);
    }
  };

  console.log("ID:", id);
  console.log("Client:", client);

  const [showForm, setShowForm] = useState(false);

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
            <button
              className="btn btn-success"
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
            client={client.id}
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
