import type { Item } from "../../models/Item";
import { money } from "../../utils/format";

export type CartLine = { item: Item; quantity: number };

type Props = {
  lines: CartLine[];
  total: number;
  saving: boolean;
  onSetQuantity: (itemId: number, quantity: number) => void;
  onComplete: () => void;
  onClose: () => void;
  onCancelSale: () => void;
};

function CartPanel({
  lines,
  total,
  saving,
  onSetQuantity,
  onComplete,
  onClose,
  onCancelSale,
}: Props) {
  return (
    <div className="p-4">
      <h1 className="modal-title fs-5 mb-3">
        <i className="bi bi-cart3 me-2"></i>Carrito de venta
      </h1>

      {lines.length === 0 ? (
        <p className="text-muted">
          El carrito está vacío. Usá "Agregar al carrito" en los repuestos.
        </p>
      ) : (
        <ul className="list-group mb-3">
          {lines.map(({ item, quantity }) => (
            <li
              key={item.id}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <div className="me-3">
                <div className="fw-semibold">{item.name}</div>
                <small className="text-muted">
                  {money(item.price)} c/u · disponibles: {item.quantity}
                </small>
              </div>
              <div className="d-flex align-items-center">
                <div className="btn-group btn-group-sm me-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => onSetQuantity(item.id, quantity - 1)}
                  >
                    −
                  </button>
                  <span className="btn btn-outline-secondary disabled">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={quantity >= item.quantity}
                    onClick={() => onSetQuantity(item.id, quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <strong className="me-3">{money(item.price * quantity)}</strong>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  title="Quitar del carrito"
                  onClick={() => onSetQuantity(item.id, 0)}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="fs-5">Total</span>
        <span className="fs-4 fw-bold">{money(total)}</span>
      </div>

      <button
        type="button"
        className="btn btn-success me-1"
        disabled={lines.length === 0 || saving}
        onClick={onComplete}
      >
        Completar venta
      </button>
      <button type="button" className="btn btn-secondary me-1" onClick={onClose}>
        Seguir agregando
      </button>
      <button type="button" className="btn btn-danger" onClick={onCancelSale}>
        Cancelar venta
      </button>
    </div>
  );
}

export default CartPanel;
