import { useState } from "react";

type Props = {
  types: string[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
};

const NEW_TYPE = "__new__";

// Lista de tipos de equipo guardados, con la opción de crear uno nuevo
// escribiendo su nombre (se guarda en la tabla de tipos al guardar el formulario).
function TypeSelect({ types, value, onChange, id }: Props) {
  const [creating, setCreating] = useState(false);

  return (
    <>
      <select
        id={id}
        className="form-select"
        value={creating ? NEW_TYPE : value}
        onChange={(e) => {
          if (e.target.value === NEW_TYPE) {
            setCreating(true);
            onChange("");
          } else {
            setCreating(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">Elija una opción</option>
        {!creating && value && !types.includes(value) && (
          <option value={value}>{value}</option>
        )}
        {types.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
        <option value={NEW_TYPE}>➕ Nuevo tipo de equipo…</option>
      </select>
      {creating && (
        <input
          type="text"
          className="form-control mt-2"
          placeholder="Nombre del nuevo tipo (ej: Lavavajillas)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      )}
    </>
  );
}

export default TypeSelect;
