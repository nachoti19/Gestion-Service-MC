import { useEffect, useState } from "react";
import { errorMessage } from "../../utils/format";

type Props = {
  // Presupuesto o informe de repuestos (uno de los dos)
  budgetId?: number;
  reportId?: number;
  // Si se pasa, se ofrece también la versión en texto plano para copiar
  textContent?: string;
  onClose: () => void;
};

// Muestra el PDF dentro de la app, con opciones para guardarlo o abrirlo en
// el visor del sistema.
function PdfViewerModal({ budgetId, reportId, textContent, onClose }: Props) {
  const isReport = reportId !== undefined;
  const id = (isReport ? reportId : budgetId) as number;

  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"pdf" | "text">("pdf");

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;

    (async () => {
      try {
        const result = await (isReport
          ? window.electronAPI.getPartsReportPdf(id)
          : window.electronAPI.getBudgetPdf(id));

        if (cancelled) return;

        if (!result.ok) {
          setError(result.error);
          return;
        }

        const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        setUrl(objectUrl);
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, isReport]);

  const save = async () => {
    setMessage("");
    const result = await (isReport
      ? window.electronAPI.savePartsReportPdf(id)
      : window.electronAPI.saveBudgetPdf(id));

    if (result.ok) setMessage(`Guardado en: ${result.path}`);
    else if (!result.canceled) setError(result.error ?? "No se pudo guardar el PDF");
  };

  const openExternal = async () => {
    const result = await (isReport
      ? window.electronAPI.openPartsReportPdf(id)
      : window.electronAPI.openBudgetPdf(id));

    if (!result.ok) setError(result.error);
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(textContent ?? "");
      setMessage("Texto copiado al portapapeles");
    } catch {
      setError("No se pudo copiar el texto. Seleccionalo y copialo con Ctrl+C.");
    }
  };

  return (
    <div className="modal-backdrop-custom">
      <div
        className="bg-body rounded shadow d-flex flex-column"
        style={{ width: "min(900px, 92vw)", height: "92vh" }}
      >
        <div className="d-flex align-items-center gap-2 p-3 border-bottom">
          <h5 className="m-0 me-auto">{isReport ? "Pedido de repuestos" : "Presupuesto"}</h5>

          {textContent !== undefined && (
            <div className="btn-group btn-group-sm">
              <button
                className={`btn ${view === "pdf" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setView("pdf")}
              >
                PDF
              </button>
              <button
                className={`btn ${view === "text" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setView("text")}
              >
                Texto plano
              </button>
            </div>
          )}

          {view === "text" ? (
            <button className="btn btn-success btn-sm" onClick={copyText}>
              <i className="bi bi-clipboard me-1"></i>Copiar
            </button>
          ) : (
            <>
              <button className="btn btn-success btn-sm" onClick={save} disabled={!url}>
                <i className="bi bi-download me-1"></i>Guardar PDF
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={openExternal}>
                <i className="bi bi-box-arrow-up-right me-1"></i>Abrir con otro visor
              </button>
            </>
          )}

          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {message && <div className="alert alert-success m-3 mb-0 py-2">{message}</div>}
        {error && <div className="alert alert-danger m-3 mb-0 py-2">{error}</div>}

        <div className="flex-grow-1 p-3" style={{ minHeight: 0 }}>
          {view === "text" ? (
            <textarea
              readOnly
              className="form-control h-100"
              style={{ fontFamily: "monospace", resize: "none" }}
              value={textContent ?? ""}
            />
          ) : url ? (
            <iframe
              title="PDF"
              src={url}
              style={{ width: "100%", height: "100%", border: 0 }}
            />
          ) : (
            !error && <p className="text-muted">Generando PDF...</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PdfViewerModal;
