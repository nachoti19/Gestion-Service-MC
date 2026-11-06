const { ipcMain } = require("electron");

const { db, localNow } = require("./database.cjs");

const INSURERS = [
  "SIN_INTERMEDIARIO",
  "FEDERACION_PATRONAL",
  "MERCANTIL_ANDINA",
];

// Estados: pendiente -> rechazado | en reparacion -> finalizado
const NEXT_STATES = {
  pendiente: ["rechazado", "en reparacion"],
  "en reparacion": ["finalizado"],
  rechazado: [],
  finalizado: [],
};

const round2 = (n) => Math.round(n * 100) / 100;

const text = (value) => String(value ?? "").trim();

// ---------------------------------------------------------------
// Repuestos del presupuesto (stock)
// ---------------------------------------------------------------

// Devuelve al stock los repuestos de un presupuesto y borra sus renglones.
function restockAndClearItems(budgetId) {
  const rows = db
    .prepare("SELECT item_id, quantity FROM budget_item WHERE budget_id = ?")
    .all(budgetId);

  const restock = db.prepare(
    "UPDATE item SET quantity = quantity + ? WHERE id = ?",
  );

  for (const row of rows) {
    restock.run(row.quantity, row.item_id);
  }

  db.prepare("DELETE FROM budget_item WHERE budget_id = ?").run(budgetId);
}

// Valida stock y calcula los renglones. NO modifica nada.
function prepareItems(items) {
  const merged = new Map();

  for (const line of items || []) {
    const qty = Number(line.quantity);

    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error("Hay una cantidad de repuesto inválida");
    }

    merged.set(line.item_id, (merged.get(line.item_id) || 0) + qty);
  }

  const rows = [];
  let parts = 0;

  for (const [itemId, qty] of merged) {
    const item = db
      .prepare(
        "SELECT id, name, price, quantity FROM item WHERE id = ? AND deleted = 0",
      )
      .get(itemId);

    if (!item) {
      throw new Error("Un repuesto elegido ya no existe");
    }

    if (item.quantity < qty) {
      throw new Error(
        `Stock insuficiente de "${item.name}" (disponible: ${item.quantity})`,
      );
    }

    const total = round2(item.price * qty);
    parts += total;
    rows.push({ item, qty, total });
  }

  return { rows, parts: round2(parts) };
}

function applyItems(budgetId, rows) {
  const insert = db.prepare(
    `INSERT INTO budget_item (budget_id, item_id, quantity, unique_price, total)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const discount = db.prepare(
    "UPDATE item SET quantity = quantity - ? WHERE id = ?",
  );

  for (const { item, qty, total } of rows) {
    insert.run(budgetId, item.id, qty, item.price, total);
    discount.run(qty, item.id);
  }
}

// Al borrar definitivamente un cliente o equipo, lo reservado en presupuestos
// pendientes vuelve al stock.
const restockPendingBudgetsOf = db.transaction((column, id) => {
  if (column !== "client_id" && column !== "appliance_id") {
    throw new Error("Columna no válida");
  }

  const pending = db
    .prepare(
      `SELECT id FROM budget WHERE ${column} = ? AND state = 'pendiente'`,
    )
    .all(id);

  for (const { id: budgetId } of pending) {
    restockAndClearItems(budgetId);
  }
});

// ---------------------------------------------------------------
// Validación
// ---------------------------------------------------------------

function validatePayload(p) {
  if (p.type !== "SIN_SEGURO" && p.type !== "CON_SEGURO") {
    throw new Error("Elegí si el presupuesto es con o sin seguro");
  }

  if (p.type === "CON_SEGURO" && !INSURERS.includes(p.insurer)) {
    throw new Error("Elegí la aseguradora");
  }

  const client = db
    .prepare("SELECT id FROM client WHERE id = ?")
    .get(p.client_id);
  if (!client) throw new Error("El cliente no existe");

  const appliance = db
    .prepare("SELECT id, client_id FROM appliance WHERE id = ?")
    .get(p.appliance_id);

  if (!appliance || appliance.client_id !== p.client_id) {
    throw new Error("El equipo no pertenece a este cliente");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text(p.pickup_date))) {
    throw new Error("Ingresá la fecha de retiro del artículo");
  }

  if (!text(p.repair_description)) {
    throw new Error("Ingresá la descripción del arreglo");
  }

  const labor = Number(p.labor_price);
  if (!Number.isFinite(labor) || labor < 0) {
    throw new Error("El precio de la mano de obra no es válido");
  }

  if (p.type === "CON_SEGURO") {
    const ins = p.insured || {};
    const missing = [
      [
        "claim",
        p.insurer === "SIN_INTERMEDIARIO" ? "la compañía" : "el siniestro",
      ],
      ["policy", "la póliza"],
      ["received_status", "el estado recibido"],
      ["affected_parts", "las partes afectadas"],
      ["cause", "la causa"],
    ].filter(([key]) => !text(ins[key]));

    if (missing.length > 0) {
      throw new Error(`Falta completar ${missing.map((m) => m[1]).join(", ")}`);
    }
  }
}

function saveInsured(budgetId, p) {
  db.prepare("DELETE FROM insured_budget WHERE budget_id = ?").run(budgetId);

  if (p.type !== "CON_SEGURO") return;

  const ins = p.insured || {};

  db.prepare(
    `INSERT INTO insured_budget (
       budget_id, claim, policy, coverage, claim_description,
       appliance_description, received_status, affected_parts, cause
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    budgetId,
    text(ins.claim),
    text(ins.policy),
    text(ins.coverage),
    text(ins.claim_description),
    text(ins.appliance_description),
    text(ins.received_status),
    text(ins.affected_parts),
    text(ins.cause),
  );
}

function updateApplianceSerial(p) {
  const serial = text(p.appliance_serial);

  if (serial) {
    db.prepare("UPDATE appliance SET serial_number = ? WHERE id = ?").run(
      serial,
      p.appliance_id,
    );
  }
}

// ---------------------------------------------------------------
// Operaciones
// ---------------------------------------------------------------

const createBudget = db.transaction((p) => {
  validatePayload(p);

  const { rows, parts } = prepareItems(p.items);
  const labor = round2(Number(p.labor_price));

  const result = db
    .prepare(
      `INSERT INTO budget (
         type, insurer, state, client_id, appliance_id, date, pickup_date,
         repair_description, parts_price, labor_price, price, details
       ) VALUES (?, ?, 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      p.type,
      p.type === "CON_SEGURO" ? p.insurer : null,
      p.client_id,
      p.appliance_id,
      localNow(),
      text(p.pickup_date),
      text(p.repair_description),
      parts,
      labor,
      round2(parts + labor),
      text(p.details),
    );

  const budgetId = Number(result.lastInsertRowid);

  applyItems(budgetId, rows);
  saveInsured(budgetId, p);
  updateApplianceSerial(p);

  return budgetId;
});

const updateBudget = db.transaction((p) => {
  const current = db
    .prepare("SELECT id, state FROM budget WHERE id = ?")
    .get(p.id);

  if (!current) throw new Error("El presupuesto no existe");

  if (current.state !== "pendiente") {
    throw new Error("Solo se pueden editar presupuestos pendientes");
  }

  validatePayload(p);

  // Primero se devuelve lo reservado y después se vuelve a descontar:
  // si algo falla, la transacción deshace todo.
  restockAndClearItems(p.id);

  const { rows, parts } = prepareItems(p.items);
  const labor = round2(Number(p.labor_price));

  db.prepare(
    `UPDATE budget SET
       type = ?, insurer = ?, client_id = ?, appliance_id = ?, pickup_date = ?,
       repair_description = ?, parts_price = ?, labor_price = ?, price = ?,
       details = ?
     WHERE id = ?`,
  ).run(
    p.type,
    p.type === "CON_SEGURO" ? p.insurer : null,
    p.client_id,
    p.appliance_id,
    text(p.pickup_date),
    text(p.repair_description),
    parts,
    labor,
    round2(parts + labor),
    text(p.details),
    p.id,
  );

  applyItems(p.id, rows);
  saveInsured(p.id, p);
  updateApplianceSerial(p);

  return p.id;
});

const setBudgetState = db.transaction((id, newState) => {
  const budget = db
    .prepare("SELECT id, state FROM budget WHERE id = ?")
    .get(id);

  if (!budget) throw new Error("El presupuesto no existe");

  if (!(NEXT_STATES[budget.state] || []).includes(newState)) {
    throw new Error(`No se puede pasar de "${budget.state}" a "${newState}"`);
  }

  if (newState === "rechazado") {
    // Los repuestos vuelven solos al stock; los renglones quedan como registro.
    const rows = db
      .prepare("SELECT item_id, quantity FROM budget_item WHERE budget_id = ?")
      .all(id);

    const restock = db.prepare(
      "UPDATE item SET quantity = quantity + ? WHERE id = ?",
    );

    for (const row of rows) {
      restock.run(row.quantity, row.item_id);
    }
  }

  if (newState === "en reparacion") {
    db.prepare("UPDATE budget SET state = ?, accepted_at = ? WHERE id = ?").run(
      newState,
      localNow(),
      id,
    );
  } else if (newState === "finalizado") {
    db.prepare("UPDATE budget SET state = ?, finished_at = ? WHERE id = ?").run(
      newState,
      localNow(),
      id,
    );
  } else {
    db.prepare("UPDATE budget SET state = ? WHERE id = ?").run(newState, id);
  }
});

// Solo se pueden eliminar presupuestos finalizados o rechazados.
// Los repuestos NO se tocan: en los finalizados ya se usaron y en los
// rechazados ya volvieron al stock cuando se rechazaron.
const deleteClosedBudget = db.transaction((id) => {
  const budget = db
    .prepare("SELECT id, state FROM budget WHERE id = ?")
    .get(id);

  if (!budget) throw new Error("El presupuesto no existe");

  if (budget.state !== "finalizado" && budget.state !== "rechazado") {
    throw new Error(
      "Solo se pueden eliminar presupuestos finalizados o rechazados",
    );
  }

  db.prepare("DELETE FROM budget WHERE id = ?").run(id);
});

// Todos los datos de un presupuesto (también los usa el generador de PDF)
function getBudgetDetail(id) {
  const budget = db.prepare("SELECT * FROM budget WHERE id = ?").get(id);

  if (!budget) return null;

  const client = db
    .prepare("SELECT * FROM client WHERE id = ?")
    .get(budget.client_id);

  const appliance = db
    .prepare(
      `SELECT a.id, t.name AS type, a.brand, a.model, a.serial_number, a.client_id
       FROM appliance a
       JOIN appliance_type t ON t.id = a.type_id
       WHERE a.id = ?`,
    )
    .get(budget.appliance_id);

  const insured =
    db.prepare("SELECT * FROM insured_budget WHERE budget_id = ?").get(id) ||
    null;

  const items = db
    .prepare(
      `SELECT bi.item_id, i.name, bi.quantity, bi.unique_price, bi.total
       FROM budget_item bi
       JOIN item i ON i.id = bi.item_id
       WHERE bi.budget_id = ?
       ORDER BY bi.id`,
    )
    .all(id);

  return { budget, client, appliance, insured, items };
}

function registerBudgetHandlers() {
  ipcMain.handle("budget:create", (event, payload) => {
    try {
      return { ok: true, id: createBudget(payload) };
    } catch (error) {
      console.error("Error al crear el presupuesto:", error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("budget:update", (event, payload) => {
    try {
      return { ok: true, id: updateBudget(payload) };
    } catch (error) {
      console.error("Error al editar el presupuesto:", error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("budget:setState", (event, id, state) => {
    try {
      setBudgetState(id, state);
      return { ok: true };
    } catch (error) {
      console.error("Error al cambiar el estado:", error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("budget:delete", (event, id) => {
    try {
      deleteFinishedBudget(id);
      return { ok: true };
    } catch (error) {
      console.error("Error al eliminar el presupuesto:", error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("budget:getById", (event, id) => getBudgetDetail(id));

  ipcMain.handle("budget:getByAppliance", (event, applianceId) => {
    return db
      .prepare(
        `SELECT id, date, state, type, insurer, price
         FROM budget WHERE appliance_id = ?
         ORDER BY date DESC, id DESC`,
      )
      .all(applianceId);
  });

  // Historial unificado: presupuestos + ventas particulares
  ipcMain.handle("history:getAll", () => {
    return db
      .prepare(
        `SELECT 'budget' AS kind, b.id, b.date, b.state, b.type, b.insurer,
                b.price AS total,
                c.name || ' ' || c.surname AS client_name,
                t.name AS appliance_type, a.brand AS appliance_brand
         FROM budget b
         JOIN client c ON c.id = b.client_id
         JOIN appliance a ON a.id = b.appliance_id
         JOIN appliance_type t ON t.id = a.type_id
         UNION ALL
         SELECT 'sale', s.id, s.date, 'VENTA PARTICULAR', NULL, NULL, s.total,
                NULL, NULL, NULL
         FROM sale s
         ORDER BY date DESC, id DESC`,
      )
      .all();
  });

  // Informe de repuestos entre dos fechas (YYYY-MM-DD, ambas inclusive).
  // - sold: ventas particulares
  // - budgeted: presupuestos aceptados (en reparación / finalizados)
  // - pending: presupuestos todavía pendientes (el usuario decide si los pide)
  // Los presupuestos rechazados no cuentan: sus repuestos volvieron al stock.
  ipcMain.handle("report:parts", (event, from, to) => {
    const sumBy = (sql, ...params) =>
      new Map(
        db
          .prepare(sql)
          .all(...params)
          .map((r) => [r.item_id, r.q]),
      );

    const sold = sumBy(
      `SELECT si.item_id, SUM(si.quantity) AS q
       FROM sale_item si JOIN sale s ON s.id = si.sale_id
       WHERE substr(s.date, 1, 10) BETWEEN ? AND ?
       GROUP BY si.item_id`,
      from,
      to,
    );

    const budgetSql = (states) =>
      `SELECT bi.item_id, SUM(bi.quantity) AS q
       FROM budget_item bi JOIN budget b ON b.id = bi.budget_id
       WHERE substr(b.date, 1, 10) BETWEEN ? AND ?
         AND b.state IN (${states})
       GROUP BY bi.item_id`;

    const budgeted = sumBy(
      budgetSql("'en reparacion', 'finalizado'"),
      from,
      to,
    );
    const pending = sumBy(budgetSql("'pendiente'"), from, to);

    const ids = new Set([
      ...sold.keys(),
      ...budgeted.keys(),
      ...pending.keys(),
    ]);

    const info = db.prepare(
      `SELECT i.id AS item_id, i.name, t.name AS type, i.quantity AS stock
       FROM item i JOIN appliance_type t ON t.id = i.type_id WHERE i.id = ?`,
    );

    return [...ids]
      .map((id) => ({
        ...info.get(id),
        sold: sold.get(id) || 0,
        budgeted: budgeted.get(id) || 0,
        pending: pending.get(id) || 0,
      }))
      .sort(
        (a, b) =>
          a.type.localeCompare(b.type, "es") ||
          a.name.localeCompare(b.name, "es"),
      );
  });
}

module.exports = {
  registerBudgetHandlers,
  restockPendingBudgetsOf,
  getBudgetDetail,
};
