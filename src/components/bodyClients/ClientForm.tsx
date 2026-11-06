import { useState } from "react";
import type { Client } from "../../models/Client";
import { errorMessage } from "../../utils/format";

type Props = {
  client?: Client;
  onClose: (saved: boolean) => void;
};

// Formulario para agregar o editar un cliente (se muestra dentro de un modal)
function ClientForm({ client, onClose }: Props) {
  const [form, setForm] = useState({
    name: client?.name ?? "",
    surname: client?.surname ?? "",
    phone: client?.phone ?? "",
    adress: client?.adress ?? "",
    city: client?.city ?? "Tandil",
    details: client?.details ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) return setError("Ingresá el nombre");
    if (!form.surname.trim()) return setError("Ingresá el apellido");
    if (!form.phone.trim()) return setError("Ingresá el celular");
    if (!form.adress.trim()) return setError("Ingresá la dirección");

    setSaving(true);
    setError("");

    try {
      if (client) {
        await window.electronAPI.updateClient({ id: client.id, ...form });
      } else {
        await window.electronAPI.addClient(form);
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
        {client ? "Editar cliente" : "Agregar cliente"}
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="row g-2 mb-2">
          <div className="col">
            <label className="form-label mb-0">Nombre</label>
            <input name="name" className="form-control" value={form.name} onChange={handleChange} autoFocus />
          </div>
          <div className="col">
            <label className="form-label mb-0">Apellido</label>
            <input name="surname" className="form-control" value={form.surname} onChange={handleChange} />
          </div>
        </div>

        <div className="mb-2">
          <label className="form-label mb-0">Celular</label>
          <input name="phone" type="tel" className="form-control" value={form.phone} onChange={handleChange} />
        </div>

        <div className="row g-2 mb-2">
          <div className="col-8">
            <label className="form-label mb-0">Dirección</label>
            <input name="adress" className="form-control" value={form.adress} onChange={handleChange} />
          </div>
          <div className="col-4">
            <label className="form-label mb-0">Ciudad</label>
            <input name="city" className="form-control" value={form.city} onChange={handleChange} />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label mb-0">
            Observaciones <small className="text-muted">(opcional, ej: piso/depto)</small>
          </label>
          <textarea name="details" rows={2} className="form-control" value={form.details} onChange={handleChange} />
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <button type="submit" className="btn btn-success me-1" disabled={saving}>
          {client ? "Guardar cambios" : "Agregar"}
        </button>
        <button type="button" className="btn btn-danger" onClick={() => onClose(false)}>
          Cancelar
        </button>
      </form>
    </div>
  );
}

export default ClientForm;
