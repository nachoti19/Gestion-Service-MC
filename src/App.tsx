import NavBar from "./components/navBar/Index";
import BodyItems from "./components/bodyItems/Index";
import BodyClients from "./components/bodyClients/Index";
import ViewClient from "./components/bodyClients/DetailsClient";
import BudgetForm from "./components/bodyBudget/BudgetForm";
import BodyHistory from "./components/bodyHistory/Index";
import BodyPartsReport from "./components/bodyPartsReport/Index";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

function App() {
  return (
    <HashRouter>
      <div className="d-flex">
        <NavBar />
        <main className="w-100 main-background">
          <div className="ps-5 pe-5 mt-5">
            <Routes>
              <Route path="/" element={<Navigate to="/stock" replace />} />
              {/* STOCK */}
              <Route path="/stock" element={<BodyItems />} />
              {/* CLIENTES Y EQUIPOS */}
              <Route path="/client" element={<BodyClients />} />
              <Route path="/client/:id" element={<ViewClient />} />
              {/* PRESUPUESTOS */}
              <Route
                path="/budget/new/:clientId/:applianceId"
                element={<BudgetForm />}
              />
              <Route path="/budget/edit/:budgetId" element={<BudgetForm />} />
              {/* HISTORIAL E INFORME */}
              <Route path="/history" element={<BodyHistory />} />
              <Route path="/parts-report" element={<BodyPartsReport />} />
              <Route path="*" element={<Navigate to="/stock" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
