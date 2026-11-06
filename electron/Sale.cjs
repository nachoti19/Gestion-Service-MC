const { ipcMain } = require("electron");

const { db, localNow } = require("./database.cjs");

function round2(n) {
  return Math.round(n * 100) / 100;
}

const createSale = db.transaction((lines) => {
  // Unifica líneas repetidas del mismo repuesto
  const merged = new Map();

  for (const line of lines) {
    const qty = Number(line.quantity);

    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error("Hay una cantidad inválida en el carrito");
    }

    merged.set(line.item_id, (merged.get(line.item_id) || 0) + qty);
  }

  const prepared = [];
  let total = 0;

  for (const [itemId, qty] of merged) {
    const item = db
      .prepare(
        "SELECT id, name, price, quantity FROM item WHERE id = ? AND deleted = 0",
      )
      .get(itemId);

    if (!item) {
      throw new Error("Un repuesto del carrito ya no existe");
    }

    if (item.quantity < qty) {
      throw new Error(
        `Stock insuficiente de "${item.name}" (disponible: ${item.quantity})`,
      );
    }

    const lineTotal = round2(item.price * qty);
    total += lineTotal;
    prepared.push({ item, qty, lineTotal });
  }

  total = round2(total);

  const sale = db
    .prepare("INSERT INTO sale (date, total) VALUES (?, ?)")
    .run(localNow(), total);

  const saleId = Number(sale.lastInsertRowid);

  const insertLine = db.prepare(
    `INSERT INTO sale_item (sale_id, item_id, quantity, unit_price, total)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const discount = db.prepare(
    "UPDATE item SET quantity = quantity - ? WHERE id = ?",
  );

  for (const { item, qty, lineTotal } of prepared) {
    insertLine.run(saleId, item.id, qty, item.price, lineTotal);
    discount.run(qty, item.id);
  }

  return { id: saleId, total };
});

function registerSaleHandlers() {
  ipcMain.handle("sale:create", (event, lines) => {
    try {
      if (!Array.isArray(lines) || lines.length === 0) {
        return { ok: false, error: "El carrito está vacío" };
      }

      const result = createSale(lines);

      return { ok: true, id: result.id, total: result.total };
    } catch (error) {
      console.error("Error al registrar la venta:", error);
      return { ok: false, error: error.message || "No se pudo registrar la venta" };
    }
  });

  ipcMain.handle("sale:getAll", () => {
    return db
      .prepare("SELECT id, date, total FROM sale ORDER BY id DESC")
      .all();
  });

  ipcMain.handle("sale:getItems", (event, saleId) => {
    return db
      .prepare(
        `SELECT si.item_id, i.name, si.quantity, si.unit_price, si.total
         FROM sale_item si
         JOIN item i ON i.id = si.item_id
         WHERE si.sale_id = ?
         ORDER BY si.id`,
      )
      .all(saleId);
  });
}

module.exports = {
  registerSaleHandlers,
};
