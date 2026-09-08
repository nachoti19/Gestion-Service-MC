import NavBar from "./components/navBar/Index";
import BodyItems from "./components/bodyItems/Index";
import BodyReports from "./components/bodyReports/Index";
import BodyReportList from "./components/bodyReportList/Index";
import BodyClients from "./components/bodyClients/Index";
import ViewClient from "./components/bodyClients/DetailsClient";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import StockEditForm from "../../Turnos-Lavarropas/src/components/bodyItems/IndexForm";
import ClientFormEdit from "../../Turnos-Lavarropas/src/components/bodyClients/IndexForm";
import "./App.css";

function App() {
  return (
    <HashRouter>
      <div className="d-flex">
        <NavBar />
        <main className="w-100 main-background">
          <h1 className="app-title ps-4">
            Bienvenido a la aplicación de gestion de service Mc
          </h1>
          <div className="ps-5 pe-5">
            <Routes>
              <Route path="/" element={<Navigate to="stock" replace />} />
              {/* STOCK */}
              <Route path="/stock" element={<BodyItems />} />
              <Route path="/stock/edit/:id" element={<StockEditForm />} />
              {/* CLIENTS */}
              <Route path="/client" element={<BodyClients />} />
              <Route path="/client/:id" element={<ViewClient />} />
              <Route path="/client/edit/:id" element={<ClientFormEdit />} />
              {/* REPORTS */}
              <Route path="/report" element={<BodyReports />} />
              <Route path="/reportList" element={<BodyReportList />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
