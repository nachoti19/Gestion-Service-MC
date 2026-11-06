import { useState } from "react";
import "./Index.css";

type Action = "stock" | "client";

type Props = {
  actions?: Action[];
  onAdd?: () => void;
  isSelling?: boolean;
  onToggleSell?: (val: boolean) => void;
  cartCount?: number;
  onOpenCart?: () => void;
  onCompleteSale?: () => void;
  onCancelSale?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
};

function Index({
  actions,
  onAdd,
  isSelling = false,
  onToggleSell,
  cartCount = 0,
  onOpenCart,
  onCompleteSale,
  onCancelSale,
  searchValue,
  onSearchChange,
  placeholder = "Buscar...",
}: Props) {
  // Si la pantalla no controla la búsqueda, el campo igual se puede escribir.
  const [localSearch, setLocalSearch] = useState("");
  const value = searchValue ?? localSearch;

  const handleChange = (text: string) => {
    setLocalSearch(text);
    onSearchChange?.(text);
  };

  return (
    <nav className="navbar">
      <div className="container-fluid p-0">
        <div>
          {actions && actions.includes("stock") && (
            <>
              {!isSelling ? (
                <>
                  <button
                    className="btn btn-primary me-2"
                    type="button"
                    onClick={onAdd}
                  >
                    Agregar ítem
                  </button>
                  <button
                    className="btn btn-primary me-2"
                    type="button"
                    onClick={() => onToggleSell?.(true)}
                  >
                    Registrar venta particular
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-warning me-2"
                    type="button"
                    onClick={onOpenCart}
                  >
                    <i className="bi bi-cart-check me-1"></i> Carrito (
                    {cartCount})
                  </button>
                  <button
                    className="btn btn-success me-2"
                    type="button"
                    disabled={cartCount === 0}
                    onClick={onCompleteSale}
                  >
                    Completar venta
                  </button>
                  <button
                    className="btn btn-danger me-2"
                    type="button"
                    onClick={() =>
                      onCancelSale ? onCancelSale() : onToggleSell?.(false)
                    }
                  >
                    Cancelar venta
                  </button>
                </>
              )}
            </>
          )}
          {actions && actions.includes("client") && (
            <button
              className="btn btn-primary me-2"
              type="button"
              onClick={onAdd}
            >
              Agregar cliente
            </button>
          )}
        </div>
        <form
          className="d-flex"
          role="search"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-search"></i>
            </span>
            <input
              className="form-control"
              type="search"
              placeholder={placeholder}
              aria-label="Buscar"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
            />
          </div>
        </form>
      </div>
    </nav>
  );
}

export default Index;
