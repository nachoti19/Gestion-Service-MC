import { useState, useEffect } from "react";
import type { Appliance } from "../../models/Appliance";

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
                {appliance.brand} - {appliance.model}
              </button>
            </h2>
            <div
              id={`appliance-${appliance.id}`}
              className="accordion-collapse collapse show"
            >
              <div className="accordion-body">
                <h3>{appliance.brand}</h3>
                <h5>{appliance.model}</h5>
                <h5>{appliance.serial_number}</h5>
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
              <button className="btn btn-success m-2">Editar</button>
              <button className="btn btn-danger m-2">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default ApplianceList;
