import McLogo from "../../assets/mc-logo.png";
import { NavLink } from "react-router-dom";
import "./Style.css";

type Props = {};

function NavBar({}: Props) {
  return (
    <div className="d-flex align-items-start service-navbar" id="nav">
      <div
        className="nav flex-column nav-pills me-3"
        id="v-pills-tab"
        role="tablist"
        aria-orientation="vertical"
      >
        <img src={McLogo} alt="Logo" />
        <NavLink
          className={({ isActive }) =>
            `navButton nav-link ${isActive ? "active" : ""}`
          }
          to="/stock"
        >
          Registro de Stock
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `navButton nav-link ${isActive ? "active" : ""}`
          }
          to="/client"
        >
          Clientes
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `navButton nav-link ${isActive ? "active" : ""}`
          }
          to="/report"
        >
          Generar Presupuesto
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `navButton nav-link ${isActive ? "active" : ""}`
          }
          to="/reportList"
        >
          Historial
        </NavLink>
      </div>
    </div>
  );
}

export default NavBar;
