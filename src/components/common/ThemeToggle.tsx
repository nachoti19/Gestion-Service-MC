import { useState } from "react";
import { applyTheme, getInitialTheme, saveTheme, type Theme } from "../../theme";

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    saveTheme(next);
  };

  return (
    <button
      type="button"
      className="btn btn-outline-secondary btn-sm"
      onClick={toggle}
      title="Cambiar tema"
    >
      <i className={`bi ${theme === "dark" ? "bi-sun-fill" : "bi-moon-fill"} me-1`}></i>
      {theme === "dark" ? "Tema claro" : "Tema oscuro"}
    </button>
  );
}

export default ThemeToggle;
