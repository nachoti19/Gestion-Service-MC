import { useState } from "react";
import TypeSelect from "../common/TypeSelect";
import { errorMessage, fileName } from "../../utils/format";

type Props = {
  OnClose: () => void;
  types: string[];
};

// Formulario para AGREGAR un repuesto (la edición se hace en la propia card).
function IndexForm({ OnClose, types }: Props) {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    type: "",
    quantity: "0",
    url_image: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectImage = async () => {
    const image = await window.electronAPI.selectImage();

    if (image) {
      setFormData((prev) => ({ ...prev, url_image: image }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const price = Number(formData.price);
    const quantity = Number(formData.quantity);

    if (!formData.name.trim()) return setError("Ingresá el nombre del repuesto");
    if (!formData.type.trim()) return setError("Elegí el equipo del repuesto");
    if (formData.price === "" || !Number.isFinite(price) || price < 0)
      return setError("Ingresá un precio válido");
    if (!Number.isInteger(quantity) || quantity < 0)
      return setError("El stock debe ser un número entero (0 o más)");

    setSaving(true);
    setError("");

    try {
      await window.electronAPI.addItem({
        name: formData.name.trim(),
        price,
        quantity,
        type: formData.type.trim(),
        url_image: formData.url_image,
      });

      OnClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="modal-title fs-5 mb-3">Agregar ítem</h1>

      <form className="form" onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Nombre del repuesto</label>
          <input
            name="name"
            type="text"
            className="form-control"
            value={formData.name}
            onChange={handleChange}
            autoFocus
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Precio</label>
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            className="form-control"
            value={formData.price}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label htmlFor="inputType" className="form-label">
            Equipo del repuesto
          </label>
          <TypeSelect
            id="inputType"
            types={types}
            value={formData.type}
            onChange={(type) => setFormData((prev) => ({ ...prev, type }))}
          />
        </div>

        <div className="mb-3">
          <label htmlFor="inputStock" className="form-label">
            Stock disponible
          </label>
          <input
            name="quantity"
            id="inputStock"
            type="number"
            min="0"
            step="1"
            className="form-control"
            value={formData.quantity}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label className="form-label d-block">Imagen del repuesto</label>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSelectImage}
          >
            Seleccionar imagen
          </button>
          {formData.url_image && (
            <small className="ms-2 text-muted">
              {fileName(formData.url_image)}
            </small>
          )}
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <button type="submit" className="btn btn-success me-1" disabled={saving}>
          Agregar
        </button>
        <button type="button" className="btn btn-danger" onClick={OnClose}>
          Cancelar
        </button>
      </form>
    </div>
  );
}

export default IndexForm;
