import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Props = {
  onClose?: () => void;
  client: number;
};

function ApplianceForm({ onClose, client }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const handleCancel = () => {
    if (onClose) {
      onClose();
    } else {
      navigate("/client");
    }
  };

  const applianceEdit = location.state?.appliance;
  const esEdicion = Boolean(applianceEdit);

  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    serial_number: "",
    client_id: client,
  });

  useEffect(() => {
    if (applianceEdit) {
      setFormData({
        brand: applianceEdit.name || "",
        model: applianceEdit.model || "",
        serial_number: applianceEdit.serial_number || "",
        client_id: applianceEdit.client_id,
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

    try {
      if (esEdicion) {
        console.log("Guardando cambios en Electrodomestic: ", formData);

        const result = await window.electronAPI.updateAppliance({
          id: applianceEdit.id,
          brand: applianceEdit.brand,
          model: applianceEdit.model,
          serial_number: applianceEdit.serial_number,
          client_id: applianceEdit.client_id,
        });

        console.log("Electrodomestico actualizado: ", result);
      } else {
        const result = await window.electronAPI.addAppliance({
          brand: formData.brand,
          model: formData.model,
          serial_number: formData.serial_number,
          client_id: client,
        });
        console.log("Electrodomestico agregado: ", result);
      }

      if (onClose) {
        onClose();
      } else {
        navigate(`/client/${client}`);
      }
    } catch (error) {
      console.log("error al agregar o editar el electrodomestico", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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

      <button type="submit" className="btn btn-success me-1">
        Agregar
      </button>
      <button type="submit" className="btn btn-danger" onClick={handleCancel}>
        Cancelar
      </button>
    </form>
  );
}

export default ApplianceForm;
