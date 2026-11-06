import { Link } from "react-router-dom";
import type { Client } from "../../models/Client";

type Props = {
  client: Client;
  isDeleted?: boolean;
  onRestore?: (client: Client) => void;
  onDeletePermanently?: (client: Client) => void;
};

function CardClient({ client, isDeleted = false, onRestore, onDeletePermanently }: Props) {
  return (
    <div className="col pt-4">
      <div className={`card h-100 shadow-sm ${isDeleted ? "border-danger" : ""}`}>
        <div className="card-body text-start">
          <h5 className="card-title">
            {client.name} {client.surname}
            {isDeleted && <span className="badge text-bg-danger ms-2">Eliminado</span>}
          </h5>
          <p className="mb-1">
            <i className="bi bi-telephone me-2"></i>
            {client.phone}
          </p>
          <p className="mb-1">
            <i className="bi bi-geo-alt me-2"></i>
            {client.adress}, {client.city}
          </p>
          {client.details && (
            <p className="mb-1 text-muted small">
              <i className="bi bi-info-circle me-2"></i>
              {client.details}
            </p>
          )}
        </div>
        <div className="card-footer d-flex flex-wrap gap-1">
          {isDeleted ? (
            <>
              <button className="btn btn-success btn-sm" onClick={() => onRestore?.(client)}>
                Restaurar
              </button>
              <button
                className="btn btn-outline-danger btn-sm ms-auto"
                onClick={() => onDeletePermanently?.(client)}
              >
                BORRADO COMPLETO
              </button>
            </>
          ) : (
            <Link className="btn btn-primary btn-sm" to={`/client/${client.id}`}>
              Ver más
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default CardClient;
