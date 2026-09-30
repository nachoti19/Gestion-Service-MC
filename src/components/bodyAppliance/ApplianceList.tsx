import { useState, useEffect } from "react";
import type { Appliance } from "../../models/Appliance";
import { NavLink } from "react-router-dom";

type Props = {
  client: number;
};

function ApplianceList({ client }: Props) {
  const [appliance, setAppliance] = useState<Appliance[]>([]);

  const loadAppliance = async () => {
    const applianceDB = await window.electronAPI.getApplianceByClient(client);

    const applianceFromDB: Appliance[] = await Promise.all(
      applianceDB.map(async (appliance) => {
        return {
          id: appliance.id,
          type: appliance.type,
          brand: appliance.brand,
          model: appliance.model,
          serial_number: appliance.serial_number,
          client_id: appliance.client_id,
        };
      }),
    );
    setAppliance(applianceFromDB);
  };
  useEffect(() => {
    loadAppliance();
  });

  const handleDelete = async (appliance: Appliance) => {
    const confirmar = window.confirm(
      `¿Está seguro que quiere eliminar el electrodomestico "${appliance}"`,
    );
    if (!confirmar) return;

    try {
      const result = await window.electronAPI.deleteAppliance(appliance.id);

      if (result.changes > 0) {
        console.log("Se eliminó el electrodomestico");
      }
    } catch (error) {
      console.log("Error al borrar el electrodomestico", error);
    }
  };

  return (
    <>
      <div className="accordion" id="accordionPanelsStayOpenExample">
        {appliance.map((appliance) => (
          <div className="accordion-item" key={appliance.id}>
            <h2 className="accordion-header">
              <button
                className="accordion-button"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target={`#appliance-${appliance.id}`}
                aria-expanded="true"
                aria-controls={`appliance-${appliance.id}`}
              >
                {appliance.type} - {appliance.brand}
              </button>
            </h2>
            <div
              id={`appliance-${appliance.id}`}
              className="accordion-collapse collapse"
            >
              <div className="accordion-body">
                <h5>Marca: {appliance.brand}</h5>
                <h5>Modelo: {appliance.model}</h5>
                <h5>Numero de serie: {appliance.serial_number}</h5>
                <div className="d-flex justify-content-between">
                  <h6>Historial de Reparaciones</h6>
                  <button className="btn btn-primary">
                    Agregar Presupuesto
                  </button>
                </div>
                <ul className="list-group list-group-flush">
                  <li className="list-group-item">An item</li>
                  <li className="list-group-item">A second item</li>
                  <li className="list-group-item">A third item</li>
                  <li className="list-group-item">A fourth item</li>
                  <li className="list-group-item">And a fifth one</li>
                </ul>
              </div>
              <NavLink
                className="btn btn-success m-2"
                to={`/client/${client}/appliance/${appliance.id}/edit`}
                state={{ appliance }}
              >
                Editar
              </NavLink>
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => handleDelete(appliance)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default ApplianceList;
