import ItemCard from "./ItemCard";
import IndexSearch from "../searchBar/Index";
import { type Item } from "../../models/Item";
import { useEffect, useState } from "react";
import IndexModal from "../modal/Index";
import IndexForm from "./IndexForm";

const Index = () => {
  const [showForm, setShowForm] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  const loadItems = async () => {
    try {
      const itemsDB = await window.electronAPI.getAllItems();

      const ItemsFromDB: Item[] = await Promise.all(
        itemsDB.map(async (item) => {
          let image = "";

          if (item.url_image && item.url_image !== "imagen") {
            const imageData = await window.electronAPI.getImageData(
              item.url_image,
            );
            if (imageData) {
              image = imageData;
            }
          }

          return {
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            url_image: image,
            type: item.type,
          };
        }),
      );

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
      <h1>CUERPO DE REGISTRO DE STOCK</h1>
      <IndexSearch
        actions={["stock"]}
        onAdd={() => setShowForm(true)}
        isSelling={isSelling}
        onToggleSell={setIsSelling}
      />
      <div className="row row-cols-1 row-cols-md-5 g-4 mb-5">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} isSelling={isSelling} />
        ))}
      </div>

      {showForm && (
        <IndexModal>
          <IndexForm
            OnClose={() => {
              setShowForm(false);
              loadItems();
            }}
          />
        </IndexModal>
      )}
    </>
  );
};

export default Index;
