import { useState } from "react";
import "./ItemCard.css";
import type { Item } from "../../models/Item";
import TypeSelect from "../common/TypeSelect";
import { useConfirm } from "../common/ConfirmDialog";
import { LOW_STOCK_THRESHOLD } from "../../constants";
import { errorMessage, fileName, money } from "../../utils/format";

type Props = {
  item: Item;
  types: string[];
  isSelling?: boolean;
  inCart?: number;
  onAddToCart?: (item: Item) => void;
  onChanged: () => void;
  onNotice: (kind: "success" | "danger", text: string) => void;
};

const toForm = (item: Item) => ({
  name: item.name,
  price: String(item.price),
  quantity: String(item.quantity),
  type: item.type,
  url_image: item.url_image,
});

function ItemCard({
  item,
  types,
  isSelling = false,
  inCart = 0,
  onAddToCart,
  onChanged,
  onNotice,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(toForm(item));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { confirm, dialog } = useConfirm();

  const isEditing = editing && !isSelling;
  const outOfStock = item.quantity === 0;
  const lowStock = !outOfStock && item.quantity <= LOW_STOCK_THRESHOLD;
  const maxInCart = inCart >= item.quantity;

  const borderClass = outOfStock
    ? "border-danger"
    : lowStock
      ? "border-warning"
      : "";

  const startEdit = () => {
    setForm(toForm(item));
    setError("");
    setEditing(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectImage = async () => {
    const image = await window.electronAPI.selectImage();

    if (image) {
      setForm((prev) => ({ ...prev, url_image: image }));
    }
  };

  const handleSave = async () => {
    const price = Number(form.price);
    const quantity = Number(form.quantity);

    if (!form.name.trim()) return setError("El nombre es obligatorio");
    if (!form.type.trim()) return setError("Elegí el equipo del repuesto");
    if (form.price === "" || !Number.isFinite(price) || price < 0)
      return setError("Ingresá un precio válido");
    if (!Number.isInteger(quantity) || quantity < 0)
      return setError("El stock debe ser un número entero (0 o más)");

    setBusy(true);
    setError("");

    try {
      await window.electronAPI.updateItem({
        id: item.id,
        name: form.name.trim(),
        price,
        quantity,
        type: form.type.trim(),
        url_image: form.url_image,
        old_url_image: item.url_image,
      });

      setEditing(false);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!(await confirm(`¿Seguro que querés eliminar "${item.name}"?`, { danger: true, confirmLabel: "Eliminar" })))
      return;

    setBusy(true);

    try {
      const result = await window.electronAPI.deleteItem(item.id);

      if (result.archived) {
        onNotice(
          "success",
          `"${item.name}" ya se usó en ventas o presupuestos, así que se ocultó del stock pero se conserva en el historial.`,
        );
      }

      onChanged();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="col pt-4">
      {dialog}
      <div className={`card h-100 shadow-sm ${borderClass}`}>
        {item.imageData ? (
          <img
            src={item.imageData}
            className="m-0 img-fluid card-img-top w-100"
            alt={item.name}
            style={{ height: "220px", objectFit: "contain" }}
          />
        ) : (
          <div
            className="d-flex align-items-center justify-content-center text-muted"
            style={{ height: "220px" }}
          >
            <i className="bi bi-image fs-1"></i>
          </div>
        )}

        <div className="card-body">
          {isEditing ? (
            <>
              <div className="mb-2">
                <label className="form-label mb-0 small">Nombre</label>
                <input
                  name="name"
                  type="text"
                  className="form-control form-control-sm"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
              <div className="mb-2">
                <label className="form-label mb-0 small">Precio</label>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control form-control-sm"
                  value={form.price}
                  onChange={handleChange}
                />
              </div>
              <div className="mb-2">
                <label className="form-label mb-0 small">
                  Equipo del repuesto
                </label>
                <TypeSelect
                  types={types}
                  value={form.type}
                  onChange={(type) => setForm((prev) => ({ ...prev, type }))}
                />
              </div>
              <div className="mb-2">
                <label className="form-label mb-0 small">
                  Stock disponible
                </label>
                <input
                  name="quantity"
                  type="number"
                  min="0"
                  step="1"
                  className="form-control form-control-sm"
                  value={form.quantity}
                  onChange={handleChange}
                />
              </div>
              <div className="mb-3">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={handleSelectImage}
                >
                  Cambiar imagen
                </button>
                {form.url_image !== item.url_image && (
                  <small className="ms-2 text-muted">
                    {fileName(form.url_image)}
                  </small>
                )}
              </div>

              {error && (
                <div className="alert alert-danger py-1 px-2 small">{error}</div>
              )}

              <div className="d-flex flex-wrap gap-1">
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  disabled={busy}
                  onClick={handleSave}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy}
                  onClick={() => setEditing(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm ms-auto"
                  disabled={busy}
                  onClick={handleDelete}
                >
                  <i className="bi bi-trash"></i> Eliminar
                </button>
              </div>
            </>
          ) : (
            <>
              <h4 className="card-title">{item.name}</h4>
              <h5>{money(item.price)}</h5>
              <p className="mb-2">
                <span className="badge text-bg-secondary">{item.type}</span>
              </p>
              <h5 className="mb-3">
                Stock disponible: {item.quantity}{" "}
                {outOfStock && (
                  <span className="badge text-bg-danger">Sin stock</span>
                )}
                {lowStock && (
                  <span className="badge text-bg-warning">Stock bajo</span>
                )}
              </h5>

              {isSelling ? (
                <button
                  className="btn btn-primary me-1"
                  type="button"
                  disabled={outOfStock || maxInCart}
                  onClick={() => onAddToCart?.(item)}
                >
                  <i className="bi bi-cart-plus me-1"></i>
                  {maxInCart && !outOfStock
                    ? "Máximo en carrito"
                    : "Agregar al carrito"}
                  {inCart > 0 && (
                    <span className="badge text-bg-light ms-2">{inCart}</span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-success me-1"
                  onClick={startEdit}
                >
                  Editar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ItemCard;
