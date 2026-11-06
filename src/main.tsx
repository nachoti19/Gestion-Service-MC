import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./theme.css";
import { applyTheme, getInitialTheme } from "./theme";

// Se aplica antes de renderizar para evitar un destello de tema incorrecto.
applyTheme(getInitialTheme());
document.addEventListener("dragstart", (e) => {
  if (e.target instanceof HTMLImageElement) e.preventDefault();
});
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
