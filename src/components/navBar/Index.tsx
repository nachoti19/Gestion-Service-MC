import McLogo from "../../assets/mc-logo.png";
import { NavLink } from "react-router-dom";
import ThemeToggle from "../common/ThemeToggle";
import "./Style.css";

const links = [
  { to: "/stock", label: "Registro de Stock" },
  { to: "/client", label: "Clientes" },
  { to: "/history", label: "Historial" },
  { to: "/parts-report", label: "Informe de Repuestos" },
];

function NavBar() {
  return (
    <div className="d-flex align-items-start service-navbar" id="nav">
      <div
        className="nav flex-column nav-pills me-3"
        id="v-pills-tab"
        role="tablist"
        aria-orientation="vertical"
      >
        <img src={McLogo} alt="Logo" />
        {links.map((link) => (
          <NavLink
            key={link.to}
            className={({ isActive }) =>
              `navButton nav-link ${isActive ? "active" : ""}`
            }
            to={link.to}
          >
            {link.label}
          </NavLink>
        ))}
        <div className="ms-3 mt-4">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export default NavBar;
