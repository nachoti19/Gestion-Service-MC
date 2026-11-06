const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");

const dbPath = path.join(app.getPath("userData"), "database.sqlite");
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

// Subí este número cada vez que cambies el esquema de forma incompatible.
// Mientras no haya datos reales, un cambio de versión recrea todas las tablas.
const SCHEMA_VERSION = 1;

const DEFAULT_APPLIANCE_TYPES = [
  "Lavarropas",
  "Lavavajillas",
  "Horno Eléctrico",
  "Televisor",
];

function localNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function resetSchema() {
  db.pragma("foreign_keys = OFF");
  for (const table of [
    "parts_report",
    "budget_item",
    "insured_budget",
    "sale_item",
    "sale",
    "budget",
    "appliance",
    "client",
    "item",
    "appliance_type",
  ]) {
    db.exec(`DROP TABLE IF EXISTS ${table};`);
  }
  db.pragma("foreign_keys = ON");
}

function initializeDatabase() {
  const currentVersion = db.pragma("user_version", { simple: true });

  if (currentVersion < SCHEMA_VERSION) {
    resetSchema();
  }

  // TIPOS DE EQUIPO (compartida por repuestos y equipos de clientes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS appliance_type(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE
    );`);

  // CLIENTES (deleted = borrado lógico)
  db.exec(`
    CREATE TABLE IF NOT EXISTS client(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      surname TEXT NOT NULL,
      phone TEXT NOT NULL,
      adress TEXT NOT NULL,
      details TEXT,
      city TEXT NOT NULL DEFAULT 'Tandil',
      deleted INTEGER NOT NULL DEFAULT 0
    );`);

  // EQUIPOS DE LOS CLIENTES (deleted = borrado lógico)
  db.exec(`
    CREATE TABLE IF NOT EXISTS appliance(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type_id INTEGER NOT NULL,
      brand TEXT NOT NULL,
      model TEXT,
      serial_number TEXT NOT NULL DEFAULT '',
      client_id INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (type_id) REFERENCES appliance_type(id) ON UPDATE CASCADE,
      FOREIGN KEY (client_id) REFERENCES client(id)
        ON UPDATE CASCADE ON DELETE CASCADE
    );`);

  // REPUESTOS (STOCK)
  db.exec(`
    CREATE TABLE IF NOT EXISTS item(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 0,
      url_image TEXT NOT NULL DEFAULT 'imagen',
      type_id INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (type_id) REFERENCES appliance_type(id) ON UPDATE CASCADE
    );`);

  // VENTAS PARTICULARES
  db.exec(`
    CREATE TABLE IF NOT EXISTS sale(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      total REAL NOT NULL DEFAULT 0
    );`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sale_item(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sale(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES item(id) ON UPDATE CASCADE
    );`);

  // PRESUPUESTOS
  // type: 'SIN_SEGURO' | 'CON_SEGURO'
  // insurer: NULL | 'SIN_INTERMEDIARIO' | 'FEDERACION_PATRONAL' | 'MERCANTIL_ANDINA'
  // state: 'pendiente' | 'rechazado' | 'en reparacion' | 'finalizado'
  // date: fecha en que se hizo el presupuesto (no sale en el PDF)
  // pickup_date: "Fecha de retiro del artículo" (sí sale en el PDF)
  db.exec(`
    CREATE TABLE IF NOT EXISTS budget(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      insurer TEXT,
      state TEXT NOT NULL DEFAULT 'pendiente',
      client_id INTEGER NOT NULL,
      appliance_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      pickup_date TEXT,
      repair_description TEXT,
      parts_price REAL NOT NULL DEFAULT 0,
      labor_price REAL NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0,
      details TEXT,
      accepted_at TEXT,
      finished_at TEXT,
      FOREIGN KEY (client_id) REFERENCES client(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
      FOREIGN KEY (appliance_id) REFERENCES appliance(id)
        ON UPDATE CASCADE ON DELETE CASCADE
    );`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS insured_budget(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      budget_id INTEGER NOT NULL UNIQUE,
      claim TEXT NOT NULL DEFAULT '',
      policy TEXT NOT NULL DEFAULT '',
      coverage TEXT NOT NULL DEFAULT '',
      claim_description TEXT NOT NULL DEFAULT '',
      appliance_description TEXT NOT NULL DEFAULT '',
      received_status TEXT NOT NULL DEFAULT '',
      affected_parts TEXT NOT NULL DEFAULT '',
      cause TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (budget_id) REFERENCES budget(id)
        ON UPDATE CASCADE ON DELETE CASCADE
    );`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS budget_item(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      budget_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unique_price REAL NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (budget_id) REFERENCES budget(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES item(id) ON UPDATE CASCADE
    );`);

  // INFORMES DE REPUESTOS GUARDADOS (foto del momento en que se generaron)
  db.exec(`
    CREATE TABLE IF NOT EXISTS parts_report(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      date_from TEXT NOT NULL,
      date_to TEXT NOT NULL,
      types TEXT NOT NULL DEFAULT '[]',
      lines TEXT NOT NULL DEFAULT '[]'
    );`);

  const insertType = db.prepare(
    "INSERT OR IGNORE INTO appliance_type (name) VALUES (?)",
  );
  for (const name of DEFAULT_APPLIANCE_TYPES) {
    insertType.run(name);
  }

  db.pragma(`user_version = ${SCHEMA_VERSION}`);

  console.log("Base de datos lista en:", dbPath);
}

// Devuelve el id del tipo de equipo; si no existe lo crea.
function getOrCreateTypeId(name) {
  const clean = String(name ?? "").trim();

  if (!clean) {
    throw new Error("El tipo de equipo es obligatorio");
  }

  db.prepare("INSERT OR IGNORE INTO appliance_type (name) VALUES (?)").run(
    clean,
  );

  return db
    .prepare("SELECT id FROM appliance_type WHERE name = ?")
    .get(clean).id;
}

initializeDatabase();

module.exports = {
  db,
  dbPath,
  initializeDatabase,
  getOrCreateTypeId,
  localNow,
};
