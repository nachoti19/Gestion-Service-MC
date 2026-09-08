import "./ItemCard.css";
import type { Item } from "../../models/Item";
import { NavLink } from "react-router-dom";

type Props = {
  item: Item;
  isSelling?: boolean;
};

function ItemCard({ item, isSelling }: Props) {
  return (
    <>
      <div className="col pt-4">
        <div className="card h-100 shadow-sm">
          <img
            src={item.url_image}
            className="img-fluid card-img-top w-100 h-100"
            alt="Logo"
            style={{ height: "200px", objectFit: "contain" }}
          />
          <div className="card-body">
            <h4 className="card-title">{item.name}</h4>
            <h6>{item.id}</h6>
            <h5>{item.price}</h5>
            <h5>{item.type}</h5>
            <h4>Stock disponible: {item.quantity}</h4>
            <NavLink
              to={`/stock/edit/${item.id}`}
              className="btn btn-success me-1"
              state={{ item }}
            >
              editar
            </NavLink>
            {isSelling && (
              <button className="btn btn-primary me-1" type="button">
                Agregar al carrito
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ItemCard;
