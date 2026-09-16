import CardClient from "./CardClient";
import type { Client } from "../../models/Client";
import NavSearch from "../searchBar/Index";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import IndexForm from "./IndexForm";
import ModalIndex from "../modal/Index";

type Props = {};

function Index({}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const location = useLocation();
  const loadClients = async () => {
    const clientDB = await window.electronAPI.getAllClients();

    const clientsFromDB: Client[] = await Promise.all(
      clientDB.map(async (client) => {
        return {
          id: client.id,
          name: client.name,
          surname: client.surname,
          phone: client.phone,
          adress: client.adress,
          details: client.details,
          city: client.city,
        };
      }),
    );
    setClients(clientsFromDB);
  };
  useEffect(() => {
    loadClients();
  }, [location.key]);
  return (
    <>
      <h1>CUERPO DE CLIENTES</h1>
      <NavSearch actions={["client"]} onAdd={() => setShowForm(true)} />
      <div className="row row-cols-1 row-cols-md-4 mb-5 g-4">
        {clients.map((client) => (
          <CardClient key={client.id} client={client} />
        ))}
      </div>
      {showForm && (
        <ModalIndex>
          <IndexForm
            onClose={() => {
              setShowForm(false);
              loadClients();
            }}
          />
        </ModalIndex>
      )}
    </>
  );
}

export default Index;
