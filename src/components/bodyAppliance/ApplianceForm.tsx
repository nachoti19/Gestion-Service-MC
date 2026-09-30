import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

type Props = {
  clientModal?: number;
  onClose?: () => void;
};

function ApplianceForm({ onClose, clientModal }: Props) {
  const { client_id, appliance_id } = useParams();

  const clientId = clientModal ?? Number(client_id);
  const applianceId = Number(appliance_id);

  const location = useLocation();
  const navigate = useNavigate();

  const handleCancel = () => {
    console.log("clientId:", clientId);
    console.log("applianceId:", applianceId);

    if (onClose) {
      onClose();
    } else {
      navigate(`/client/${clientId}`);
    }
  };

  const applianceEdit = location.state?.appliance;
  const esEdicion = Boolean(applianceEdit);

  const [formData, setFormData] = useState({
    type: "",
    brand: "",
    model: "",
    serial_number: "",
    client_id: clientId,
  });

  useEffect(() => {
    if (applianceEdit) {
      setFormData({
        type: applianceEdit.type || "",
        brand: applianceEdit.brand || "",
        model: applianceEdit.model || "",
        serial_number: applianceEdit.serial_number || "",
        client_id: clientId,
      });
    }
  }, [applianceEdit]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    console.log("Voy a volver a:", `/client/${clientId}`);
    console.log("clientId:", clientId);
    console.log("clientModal:", clientModal);

    if (!clientId || Number.isNaN(clientId)) {
      console.error("No se recibió un client_id válido");
      return;
    }

    try {
      if (esEdicion) {
        const result = await window.electronAPI.updateAppliance({
          id: applianceId,
          type: formData.type,
          brand: formData.brand,
          model: formData.model,
          serial_number: formData.serial_number,
          client_id: clientId,
        });

        console.log("Electrodoméstico actualizado:", result);
      } else {
        const result = await window.electronAPI.addAppliance({
          type: formData.type,
          brand: formData.brand,
          model: formData.model,
          serial_number: formData.serial_number,
          client_id: clientId,
        });

        console.log("Electrodoméstico agregado:", result);
      }

      if (onClose) {
        onClose();
      } else {
        navigate(`/client/${clientId}`);
      }
    } catch (error) {
      console.error("Error al agregar o editar el electrodoméstico:", error);
    }
  };
  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="inputState" className="form-label">
          Tipo de equipo
        </label>
        <select
          name="type"
          id="inputState"
          className="form-select"
          value={formData.type}
          onChange={handleChange}
        >
          <option value="">Elija una opción</option>
          <option value="Horno Eléctrico">Horno eléctrico</option>
          <option value="Lavarropas">Lavarropas</option>
          <option value="Televisor">Televisor</option>
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label">Marca del equipo</label>
        <input
          type="text"
          name="brand"
          className="form-control"
          value={formData.brand}
          onChange={handleChange}
          aria-describedby="emailHelp"
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Modelo</label>
        <input
          type="text"
          className="form-control"
          name="model"
          onChange={handleChange}
          value={formData.model}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Numero de Serie</label>
        <input
          type="text"
          className="form-control"
          name="serial_number"
          onChange={handleChange}
          value={formData.serial_number}
        />
        <div id="emailHelp" className="form-text">
          <strong>
            Este numero va a ser el identificador del equipo si no tiene hace
            click aca:{"  "}{" "}
            <p>
              <a
                href="#"
                className="link-dark link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
              >
                Generar numero de serie
              </a>
            </p>
          </strong>
        </div>
      </div>

      <div className="mb-3 form-check">
        <input
          type="checkbox"
          className="form-check-input"
          id="exampleCheck1"
        />
        <label className="form-check-label" htmlFor="exampleCheck1">
          Check me out
        </label>
      </div>

      {esEdicion ? (
        <button type="submit" className="btn btn-success me-1">
          Guardar Cambios
        </button>
      ) : (
        <button type="submit" className="btn btn-success me-1">
          Agregar
        </button>
      )}
      <button type="button" className="btn btn-danger" onClick={handleCancel}>
        Cancelar
      </button>
    </form>
  );
}

export default ApplianceForm;
