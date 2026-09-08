const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");

const dbPath = path.join(app.getPath("userData"), "database.sqlite");
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

function initializeDatabase() {
  //TABLE : APPLIANCE

  db.exec(`
        CREATE TABLE IF NOT EXISTS appliance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand TEXT NOT NULL, 
        model TEXT, 
        serial_number TEXT NOT NULL, 
        client_id INTEGER NOT NULL, 
        
        FOREIGN KEY (client_id)
            REFERENCES client(id)
        ON UPDATE CASCADE);`);

  //TABLE : CLIENT

  db.exec(`
        CREATE TABLE IF NOT EXISTS client(
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        name TEXT NOT NULL, 
        surname TEXT NOT NULL, 
        number INTEGER NOT NULL, 
        adress TEXT NOT NULL, 
        details TEXT NOT NULL, 
        city TEXT DEFAULT 'tandil'
        );`);

  //TABLE : ITEM

  db.exec(`
        CREATE TABLE IF NOT EXISTS item(
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        name TEXT NOT NULL, 
        price REAL NOT NULL DEFAULT 0, 
        quantity NUMBER NOT NULL DEFAULT 0, 
        url_image TEXT NOT NULL DEFAULT 'imagen', 
        type TEXT NOT NULL);`);

  //TABLE : BUDGET

  db.exec(`
        CREATE TABLE IF NOT EXISTS budget(
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        type TEXT NOT NULL, 
        state TEXT NOT NULL, 
        client_id INTEGER NOT NULL, 
        appliance_id INTEGER NOT NULL, 
        date DATE NOT NULL, 
        price REAL NOT NULL DEFAULT 0, 
        details TEXT, 
        
        FOREIGN KEY(client_id)
            REFERENCES client(id)
        ON UPDATE CASCADE, 
        FOREIGN KEY(appliance_id)
            REFERENCES appliance(id)
        ON UPDATE CASCADE);`);

  //TABLE : INSURED_BUDGET

  db.exec(`
        CREATE TABLE IF NOT EXISTS insured_budget(
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        budget_id INTEGER NOT NULL, 
        claim TEXT NOT NULL, 
        claim_description TEXT, 
        policy TEXT NOT NULL, 
        appliance_description TEXT, 
        received_status TEXT NOT NULL, 
        affected_parties TEXT NOT NULL, 
        reason TEXT NOT NULL, 
        
        FOREIGN KEY (budget_id)
            REFERENCES budget(id)
        ON UPDATE CASCADE);`);

  //TABLE : BUDGET_ITEM

  db.exec(`
        CREATE TABLE IF NOT EXISTS budget_item(
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        item_id INTEGER NOT NULL, 
        budget_id INTEGER NOT NULL, 
        quantity INTEGER NOT NULL, 
        unique_price REAL NOT NULL, 
        total REAL NOT NULL, 
        
        FOREIGN KEY (item_id)
            REFERENCES item(id)
        ON UPDATE CASCADE, 
        FOREIGN KEY (budget_id)
            REFERENCES budget(id)
        ON UPDATE CASCADE);`);

  console.log("las bases se crearon");
  console.log("ubicacion: ", dbPath);
}

initializeDatabase();

module.exports = {
  db,
  dbPath,
  initializeDatabase,
};
