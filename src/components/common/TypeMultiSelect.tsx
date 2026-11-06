import { useEffect, useMemo, useRef, useState } from "react";
import { matchesSearch } from "../../utils/format";

type Props = {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
};

// Desplegable con casillas y buscador para elegir varios tipos de electrodoméstico.
// La lista tiene scroll, así que sigue siendo cómoda aunque haya muchos tipos.
function TypeMultiSelect({ options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Se cierra al hacer clic afuera
  useEffect(() => {
    if (!open) return;

    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const visible = useMemo(
    () => options.filter((o) => matchesSearch(o, search)),
    [options, search],
  );

  const allSelected = options.length > 0 && selected.length === options.length;

  const summary =
    options.length === 0
      ? "Sin movimientos"
      : selected.length === 0
        ? "Ninguno"
        : allSelected
          ? `Todos (${options.length})`
          : selected.length === 1
            ? selected[0]
            : `${selected.length} de ${options.length} seleccionados`;

  const toggle = (option: string) =>
    onChange(
      selected.includes(option)
        ? selected.filter((s) => s !== option)
        : [...selected, option],
    );

  return (
    <div className="position-relative d-inline-block" ref={ref}>
      <button
        type="button"
        className="btn btn-outline-secondary dropdown-toggle"
        onClick={() => setOpen((o) => !o)}
        disabled={options.length === 0}
      >
        {summary}
      </button>

      {open && (
        <div
          className="position-absolute bg-body border rounded shadow p-2 mt-1"
          style={{ zIndex: 200, minWidth: 260 }}
        >
          <input
            className="form-control form-control-sm mb-2"
            placeholder="Buscar electrodoméstico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          <div className="d-flex justify-content-between mb-1">
            <button
              type="button"
              className="btn btn-link btn-sm p-0"
              onClick={() => onChange(options)}
            >
              Marcar todos
            </button>
            <button
              type="button"
              className="btn btn-link btn-sm p-0"
              onClick={() => onChange([])}
            >
              Quitar todos
            </button>
          </div>

          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {visible.length === 0 && (
              <div className="text-muted small p-1">Sin resultados</div>
            )}
            {visible.map((option) => (
              <div className="form-check" key={option}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`ms-${option}`}
                  checked={selected.includes(option)}
                  onChange={() => toggle(option)}
                />
                <label
                  className="form-check-label w-100"
                  htmlFor={`ms-${option}`}
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TypeMultiSelect;
