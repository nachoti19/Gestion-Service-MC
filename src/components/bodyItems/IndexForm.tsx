import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

type Props = {
  OnClose?: () => void;
};

function IndexForm({ OnClose }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const itemEditar = location.state?.item;
  const esEdicion = Boolean(itemEditar);

  console.log(esEdicion);

  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    type: "",
    quantity: 0,
    url_image: "",
  });

  useEffect(() => {
    if (itemEditar) {
      setFormData({
        name: itemEditar.name || "",
        price: itemEditar.price || 0,
        type: itemEditar.type || "",
        quantity: itemEditar.quantity || 0,
        url_image: itemEditar.url_image || "",
      });
    }
  }, [itemEditar]);

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

    console.log("esEdicion:", esEdicion);
    console.log("itemEditar:", itemEditar);
    console.log("formData:", formData);

    try {
      if (esEdicion) {
        console.log("Guardando cambios del item existente:", formData);
        const result = await window.electronAPI.updateItem({
          id: itemEditar.id,
          name: formData.name,
          price: Number(formData.price),
          quantity: Number(formData.quantity),
          type: formData.type,
          url_image: formData.url_image,
          old_url_image: itemEditar.url_image || "imagen",
        });
        console.log("item actualizado", result);
      } else {
        const result = await window.electronAPI.addItem({
          name: formData.name,
          price: Number(formData.price),
          quantity: Number(formData.quantity),
          type: formData.type,
          url_image: formData.url_image,
        });

        console.log("Item creado correctamente:", result);
      }

      // Si el formulario está dentro del modal,
      // cerramos el modal y recargamos el stock.
      if (OnClose) {
        OnClose();
      } else {
        navigate("/stock");
      }
    } catch (error) {
      console.error("Error al guardar el item:", error);
    }
  };

  const handleCancel = () => {
    if (OnClose) {
      OnClose();
    } else {
      navigate("/stock");
    }
  };

  const handleDelete = async () => {
    if (!itemEditar) return;

    const confirmar = window.confirm(
      `Esta seguro que quiere eliminar el item "${itemEditar.name}"`,
    );

    if (!confirmar) return;

    try {
      const result = await window.electronAPI.deleteItem(itemEditar.id);

      if (result.changes > 0) {
        console.log("se elimino el item");
        navigate("/stock");
      } else {
        console.log("no se encontro el item");
      }
    } catch (error) {
      console.log("error al eliminar el item", error);
    }
  };

  // =========================
  // SELECCIONAR IMAGEN
  // =========================

  const handleSelectImage = async () => {
    try {
      const image = await window.electronAPI.selectImage();

      if (image) {
        setFormData((prev) => ({
          ...prev,
          url_image: image,
        }));
      }
    } catch (error) {
      console.error("Error al elegir la imagen:", error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="modal-title fs-5">
        {esEdicion ? "Editar item" : "Agregar item"}
      </h1>

      <form className="form" onSubmit={handleSubmit}>
        {/* NOMBRE */}
        <div className="mb-3">
          <label className="form-label">Nombre Objeto a agregar</label>

          <input
            name="name"
            type="text"
            className="form-control"
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        {/* PRECIO */}
        <div className="mb-3">
          <label className="form-label">Precio</label>

          <input
            name="price"
            type="number"
            className="form-control"
            value={formData.price}
            onChange={handleChange}
          />
        </div>

        {/* TIPO */}
        <div className="mb-3">
          <label htmlFor="inputState" className="form-label">
            Equipo del repuesto
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

        {/* STOCK */}
        <div className="mb-3">
          <label htmlFor="inputStock" className="form-label">
            Stock disponible
          </label>

          <input
            name="quantity"
            id="inputStock"
            type="number"
            className="form-control"
            value={formData.quantity}
            onChange={handleChange}
          />
        </div>

        {/* IMAGEN */}
        <div className="mb-3">
          <label className="form-label d-block">Imagen del repuesto</label>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSelectImage}
          >
            Seleccionar Imagen
          </button>
        </div>

        {/* MOSTRAR IMAGEN SELECCIONADA */}
        {formData.url_image && (
          <div className="mt-2 mb-3">
            <small className="text-muted">
              Imagen seleccionada: {formData.url_image}
            </small>
          </div>
        )}

        {/* BOTÓN AGREGAR */}
        <button type="submit" className="btn btn-success me-1">
          {esEdicion ? "Guardar Cambios" : "Agregar"}
        </button>

        {/* BOTÓN CANCELAR */}
        {OnClose ? (
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleCancel}
          >
            Cancelar
          </button>
        ) : (
          <>
            <NavLink
              to="/stock"
              className="btn btn-danger me-1"
              onClick={handleCancel}
            >
              cancelar
            </NavLink>
            <button
              className="btn btn-danger"
              type="button"
              onClick={handleDelete}
            >
              Eliminar
            </button>
          </>
        )}
      </form>
    </div>
  );
}

export default IndexForm;
