import { useEffect, useState } from "react";
import IndexModal from "../modal/Index";
import { errorMessage, money } from "../../utils/format";
import { formatDateTime } from "../../utils/date";

type Line = Awaited<ReturnType<typeof window.electronAPI.getSaleItems>>[number];

type Props = {
  saleId: number;
  date: string;
  total: number;
  onClose: () => void;
};

// Detalle de una venta particular: repuestos vendidos con sus precios y el total
function SaleDetailModal({ saleId, date, total, onClose }: Props) {
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    window.electronAPI
      .getSaleItems(saleId)
      .then(setLines)
      .catch((e) => setError(errorMessage(e)));
  }, [saleId]);

  return (
    <IndexModal>
      <div className="p-4 text-start">
        <h1 className="modal-title fs-5 mb-1">Venta particular</h1>
        <p className="text-muted">{formatDateTime(date)}</p>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Repuesto</th>
              <th className="text-end">Cant.</th>
              <th className="text-end">Precio</th>
              <th className="text-end">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.item_id}>
                <td>{l.name}</td>
                <td className="text-end">{l.quantity}</td>
                <td className="text-end">{money(l.unit_price)}</td>
                <td className="text-end">{money(l.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={3} className="text-end">Total</th>
              <th className="text-end">{money(total)}</th>
            </tr>
          </tfoot>
        </table>

        <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
      </div>
    </IndexModal>
  );
}

export default SaleDetailModal;
