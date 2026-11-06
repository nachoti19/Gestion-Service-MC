# Gestión Service MC

Aplicación de escritorio (React + Vite + Electron + SQLite) para la gestión de un service de electrodomésticos.

## Secciones

- **Registro de Stock**: repuestos en cards con edición en la misma card, aviso de stock bajo, búsqueda y venta particular con carrito.
- **Clientes**: alta/edición, borrado lógico (con restauración y botón BORRADO COMPLETO), equipos por cliente, historial de reparaciones por equipo y generación de presupuestos.
- **Historial**: presupuestos y ventas particulares con búsqueda por texto y por fecha (exacta o rango), cambio de estado y visor del PDF.
- **Informe de Repuestos**: repuestos usados entre dos fechas, con los presupuestos pendientes aparte para decidir si se piden.

## Desarrollo

```bash
npm install
npm run dev            # terminal 1 (Vite)
npm run electron:dev   # terminal 2 (Electron)
```

Si `better-sqlite3` falla después de instalar, ejecutar `npx @electron/rebuild`.

## Compilar el instalador

```bash
npm run electron:build
```

## Estructura

- `electron/`: base de datos (`database.cjs`), handlers IPC por entidad y generación/lectura de PDF (`pdfBuilder.cjs`).
- `assets/pdf/`: plantillas del Informe Técnico (`sin_intermediario.pdf` y `seguro_base.pdf`).
- `src/components/`: pantallas de la interfaz.

## Notas

- El esquema de la base se versiona con `SCHEMA_VERSION` en `electron/database.cjs`. Subir ese número recrea las tablas (solo hacerlo mientras no haya datos reales).
- Teléfono del service para el pie de los PDF particulares y sin intermediario: `SERVICE_PHONE` en `electron/pdfBuilder.cjs`.
