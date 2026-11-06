import { useState } from "react";
import type { Appliance } from "../../models/Appliance";
import TypeSelect from "../common/TypeSelect";
import { errorMessage } from "../../utils/format";

type Props = {
  clientId: number;
  appliance?: Appliance;
  types: string[];
  onClose: (saved: boolean) => void;
};

// Formulario para agregar o editar un equipo de un cliente (dentro de un modal)
function ApplianceForm({ clientId, appliance, types, onClose }: Props) {
  const [form, setForm] = useState({
    type: appliance?.type ?? "",
    brand: appliance?.brand ?? "",
    model: appliance?.model ?? "",
    serial_number: appliance?.serial_number ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.type.trim()) return setError("Elegí el tipo de equipo");
    if (!form.brand.trim()) return setError("Ingresá la marca");

    setSaving(true);
    setError("");

    const data = {
      type: form.type.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      serial_number: form.serial_number.trim(),
      client_id: clientId,
    };

    try {
      if (appliance) {
        await window.electronAPI.updateAppliance({ id: appliance.id, ...data });
      } else {
        await window.electronAPI.addAppliance(data);
      }

      onClose(true);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="modal-title fs-5 mb-3">
        {appliance ? "Editar equipo" : "Agregar equipo"}
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <label className="form-label mb-0">Tipo de equipo</label>
          <TypeSelect
            types={types}
            value={form.type}
            onChange={(type) => setForm((prev) => ({ ...prev, type }))}
          />
        </div>
        <div className="mb-2">
          <label className="form-label mb-0">Marca</label>
          <input name="brand" className="form-control" value={form.brand} onChange={handleChange} />
        </div>
        <div className="mb-2">
          <label className="form-label mb-0">Modelo</label>
          <input name="model" className="form-control" value={form.model} onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label mb-0">
            Número de serie <small className="text-muted">(opcional, se puede completar después)</small>
          </label>
          <input
            name="serial_number"
            className="form-control"
            value={form.serial_number}
            onChange={handleChange}
          />
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <button type="submit" className="btn btn-success me-1" disabled={saving}>
          {appliance ? "Guardar cambios" : "Agregar"}
        </button>
        <button type="button" className="btn btn-danger" onClick={() => onClose(false)}>
          Cancelar
        </button>
      </form>
    </div>
  );
}

export default ApplianceForm;
