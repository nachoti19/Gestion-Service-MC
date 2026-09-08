import { useEffect, useState } from "react";
import SearchBar from "../searchBar/Index";
import { type Item } from "../../models/Item";

type Props = {};

function IndexItems({}: Props) {
  const [items, setItems] = useState<Item[]>([]);

  const loadItems = async () => {
    try {
      const itemsDB = await window.electronAPI.getAllItems();

      const ItemsFromDB: Item[] = itemsDB.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        url_image: item.url_image,
        type: item.type,
      }));

      setItems(ItemsFromDB);
    } catch (error) {
      console.error("error al cargar los items", error);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  return (
    <>
      <SearchBar />
      <div className="overflow-y-auto mt-2 mb-2" style={{ maxHeight: "500px" }}>
        <ol className="list-group list-group mt-2 mb-2">
          {items.map((item) => (
            <li
              className="list-group-item d-flex justify-content-between align-items-center"
              key={item.id}
            >
              {item.name}, stock disponible: {item.quantity}
              <div>
                <button className="btn btn-primary">Agregar</button>
                <button className="btn btn-danger">Quitar</button>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

export default IndexItems;
