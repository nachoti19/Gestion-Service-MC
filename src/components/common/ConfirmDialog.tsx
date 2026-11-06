import { useCallback, useState } from "react";

type Options = {
  confirmLabel?: string;
  danger?: boolean;
};

type State = Options & {
  message: string;
  resolve: (value: boolean) => void;
};

// Cuadro de confirmación propio de la app.
// Reemplaza a window.confirm(), que en Electron/Windows deja la ventana sin
// foco de teclado (los botones y los campos de texto dejan de responder).
//
// Uso:
//   const { confirm, dialog } = useConfirm();
//   if (!(await confirm("¿Seguro?"))) return;
//   ...
//   return (<>{dialog} ... </>);
export function useConfirm() {
  const [state, setState] = useState<State | null>(null);

  const confirm = useCallback(
    (message: string, options: Options = {}) =>
      new Promise<boolean>((resolve) => {
        setState({ message, resolve, ...options });
      }),
    [],
  );

  const answer = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  const dialog = state ? (
    <div className="modal-backdrop-custom" style={{ zIndex: 2000 }}>
      <div className="bg-body rounded shadow p-4 text-start" style={{ width: "min(480px, 92vw)" }}>
        <p style={{ whiteSpace: "pre-line" }} className="mb-4">
          {state.message}
        </p>
        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => answer(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className={`btn ${state.danger ? "btn-danger" : "btn-primary"}`}
            onClick={() => answer(true)}
            autoFocus
          >
            {state.confirmLabel ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
