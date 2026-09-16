import { useState, useEffect } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";

type Props = {
  onClose?: () => void;
};

function IndexForm({ onClose }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const clienteEditar = location.state?.client;
  const esEdicion = Boolean(clienteEditar);

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    phone: "",
    adress: "",
    details: "",
    city: "",
  });

  useEffect(() => {
    if (clienteEditar) {
      setFormData({
        name: clienteEditar.name || "",
        surname: clienteEditar.surname || "",
        adress: clienteEditar.adress || "",
        phone: clienteEditar.phone || "",
        details: clienteEditar.details || "",
        city: clienteEditar.city || "",
      });
    }
  }, [clienteEditar]);

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
        console.log("Guardando cambios del cliente:", formData);

        const result = await window.electronAPI.updateClient({
          id: clienteEditar.id,
          name: formData.name,
          surname: formData.surname,
          phone: Number(formData.phone),
          adress: formData.adress,
          details: formData.details,
          city: formData.city,
        });

        console.log("Cliente actualizado:", result);
      } else {
        const result = await window.electronAPI.addClient({
          name: formData.name,
          surname: formData.surname,
          phone: Number(formData.phone),
          adress: formData.adress,
          details: formData.details,
          city: formData.city,
        });

        console.log("Cliente agregado:", result);
      }

      if (onClose) {
        onClose();
      } else {
        navigate("/client");
      }
    } catch (error) {
      console.error("Error al guardar el cliente:", error);
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    } else {
      navigate("/client");
    }
  };

  const handleDelete = async () => {
    if (!clienteEditar) {
      console.log("no hay cliente para eliminar", clienteEditar);
      return;
    }

    const confirmar = window.confirm(
      `Esta seguro que quiere eliminar el cliente "${clienteEditar.name} ${clienteEditar.surname}"`,
    );

    if (!confirmar) return;

    try {
      const result = await window.electronAPI.deleteClient(clienteEditar.id);

      if (result.changes > 0) {
        console.log("se elimino el cliente");
        navigate("/client");
      } else {
        console.log("no se encontro el cliente");
      }
    } catch (error) {
      console.log("error al borrar el cliente", clienteEditar);
    }
  };

  return (
    <div className="p-4">
      <h1 className="modal-title fs-5">
        {esEdicion ? "Editar Cliente" : "Agregar Cliente"}
      </h1>

      <form className="form" onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Nombre</label>
          <input
            name="name"
            type="text"
            className="form-control"
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Apellido</label>
          <input
            name="surname"
            type="text"
            className="form-control"
            value={formData.surname}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Direccion</label>
          <input
            name="adress"
            type="text"
            className="form-control"
            value={formData.adress}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Celular</label>

          <input
            name="phone"
            type="number"
            className="form-control"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Observaciones (para la casa)</label>

          <input
            name="details"
            type="text"
            className="form-control"
            value={formData.details}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Ciudad</label>

          <input
            name="city"
            type="text"
            className="form-control"
            value={formData.city}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label htmlFor="inputState" className="form-label">
            Aca cuando tenga la base de datos se van a mostrar los equipos que
            tiene el cliente
          </label>
          <select
            name="equipo"
            id="inputState"
            className="form-select"
            onChange={handleChange}
          >
            <option value="">Elija una opción</option>
            <option value="Horno Eléctrico">Horno eléctrico</option>
            <option value="Lavarropas">Lavarropas</option>
            <option value="Televisor">Televisor</option>
          </select>
        </div>
        <div>
          <button type="submit" className="btn btn-success me-1">
            {esEdicion ? "Guardar Cambio" : "Agregar Cliente"}
          </button>

          {onClose ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleCancel}
              data-bs-dismiss="modal"
            >
              Cancelar
            </button>
          ) : (
            <NavLink to="/client" className="btn btn-danger me-1">
              Cancelar
            </NavLink>
          )}

          <button
            className="btn btn-danger me-1"
            type="button"
            onClick={handleDelete}
          >
            Eliminar
          </button>
        </div>
      </form>
    </div>
  );
}

export default IndexForm;
