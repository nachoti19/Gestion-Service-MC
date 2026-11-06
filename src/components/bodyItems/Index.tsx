import { useCallback, useEffect, useMemo, useState } from "react";
import ItemCard from "./ItemCard";
import CartPanel, { type CartLine } from "./CartPanel";
import IndexSearch from "../searchBar/Index";
import { type Item } from "../../models/Item";
import IndexModal from "../modal/Index";
import IndexForm from "./IndexForm";
import { useConfirm } from "../common/ConfirmDialog";
import { errorMessage, matchesSearch, money } from "../../utils/format";

type Notice = { kind: "success" | "danger"; text: string };

const Index = () => {
  const [showForm, setShowForm] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [showCart, setShowCart] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const { confirm, dialog } = useConfirm();

  const loadItems = useCallback(async () => {
    try {
      const [itemsDB, typesDB] = await Promise.all([
        window.electronAPI.getAllItems(),
        window.electronAPI.getApplianceTypes(),
      ]);

      const ItemsFromDB: Item[] = await Promise.all(
        itemsDB.map(async (item) => {
          let imageData = "";

          if (item.url_image && item.url_image !== "imagen") {
            const data = await window.electronAPI.getImageData(item.url_image);
            if (data) {
              imageData = data;
            }
          }

          return {
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            url_image: item.url_image,
            imageData: imageData,
            type: item.type,
          };
        }),
      );

      setItems(ItemsFromDB);
      setTypes(typesDB.map((t) => t.name));
    } catch (error) {
      console.error("error al cargar los items", error);
      setNotice({ kind: "danger", text: errorMessage(error) });
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const visibleItems = useMemo(
    () =>
      items.filter((item) =>
        matchesSearch(`${item.name} ${item.type}`, search),
      ),
    [items, search],
  );

  // ---------- Carrito ----------

  const cartLines: CartLine[] = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => ({
          item: items.find((i) => i.id === Number(id)),
          quantity,
        }))
        .filter((line): line is CartLine => Boolean(line.item)),
    [cart, items],
  );

  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cartLines.reduce(
    (sum, line) => sum + line.item.price * line.quantity,
    0,
  );

  const addToCart = (item: Item) =>
    setCart((prev) => {
      const current = prev[item.id] ?? 0;
      if (current >= item.quantity) return prev;
      return { ...prev, [item.id]: current + 1 };
    });

  const setCartQuantity = (itemId: number, quantity: number) =>
    setCart((prev) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return prev;

      const next = { ...prev };
      const safe = Math.min(Math.max(quantity, 0), item.quantity);

      if (safe === 0) {
        delete next[itemId];
      } else {
        next[itemId] = safe;
      }

      return next;
    });

  const cancelSale = () => {
    setCart({});
    setShowCart(false);
    setIsSelling(false);
  };

  const completeSale = async () => {
    if (cartLines.length === 0 || saving) return;

    if (!(await confirm(`¿Confirmar la venta por ${money(cartTotal)}?`)))
      return;

    setSaving(true);

    try {
      const result = await window.electronAPI.createSale(
        cartLines.map((line) => ({
          item_id: line.item.id,
          quantity: line.quantity,
        })),
      );

      if (result.ok) {
        cancelSale();
        setNotice({
          kind: "success",
          text: `Venta registrada por ${money(result.total)}.`,
        });
      } else {
        setNotice({ kind: "danger", text: result.error });
        setShowCart(false);
      }

      await loadItems();
    } catch (error) {
      setNotice({ kind: "danger", text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {dialog}
      <IndexSearch
        actions={["stock"]}
        onAdd={() => setShowForm(true)}
        isSelling={isSelling}
        onToggleSell={setIsSelling}
        cartCount={cartCount}
        onOpenCart={() => setShowCart(true)}
        onCompleteSale={completeSale}
        onCancelSale={cancelSale}
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Buscar repuesto..."
      />

      {notice && (
        <div
          className={`alert alert-${notice.kind} alert-dismissible mt-3 mb-0`}
          role="alert"
        >
          {notice.text}
          <button
            type="button"
            className="btn-close"
            aria-label="Cerrar"
            onClick={() => setNotice(null)}
          ></button>
        </div>
      )}

      {visibleItems.length === 0 && (
        <p className="text-muted mt-4">
          {items.length === 0
            ? "Todavía no hay repuestos cargados."
            : "No se encontraron repuestos con esa búsqueda."}
        </p>
      )}

      <div className="row row-cols-1 row-cols-md-5 g-4 mb-5">
        {visibleItems.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            types={types}
            isSelling={isSelling}
            inCart={cart[item.id] ?? 0}
            onAddToCart={addToCart}
            onChanged={loadItems}
            onNotice={(kind, text) => setNotice({ kind, text })}
          />
        ))}
      </div>

      {showForm && (
        <IndexModal>
          <IndexForm
            types={types}
            OnClose={() => {
              setShowForm(false);
              loadItems();
            }}
          />
        </IndexModal>
      )}

      {showCart && (
        <IndexModal>
          <CartPanel
            lines={cartLines}
            total={cartTotal}
            saving={saving}
            onSetQuantity={setCartQuantity}
            onComplete={completeSale}
            onClose={() => setShowCart(false)}
            onCancelSale={cancelSale}
          />
        </IndexModal>
      )}
    </>
  );
};

export default Index;
