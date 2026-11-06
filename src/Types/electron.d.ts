export {};

type ApplianceRow = {
  id: number;
  type: string;
  brand: string;
  model: string;
  serial_number: string;
  client_id: number;
};

type ClientRow = {
  id: number;
  name: string;
  surname: string;
  phone: string;
  adress: string;
  details: string;
  city: string;
};

type ClientInput = Omit<ClientRow, "id">;

type ItemRow = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  url_image: string;
  type: string;
};

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

type InsuredData = {
  claim: string;
  policy: string;
  coverage?: string;
  claim_description: string;
  appliance_description: string;
  received_status: string;
  affected_parts: string;
  cause: string;
};

type BudgetPayload = {
  id?: number;
  type: "SIN_SEGURO" | "CON_SEGURO";
  insurer: string | null;
  client_id: number;
  appliance_id: number;
  pickup_date: string;
  repair_description: string;
  labor_price: number;
  details: string;
  items: { item_id: number; quantity: number }[];
  insured?: InsuredData;
  appliance_serial?: string;
};

type BudgetDetail = {
  budget: {
    id: number;
    type: "SIN_SEGURO" | "CON_SEGURO";
    insurer: string | null;
    state: string;
    client_id: number;
    appliance_id: number;
    date: string;
    pickup_date: string;
    repair_description: string;
    parts_price: number;
    labor_price: number;
    price: number;
    details: string;
    accepted_at: string | null;
    finished_at: string | null;
  };
  client: ClientRow & { deleted: number };
  appliance: ApplianceRow;
  insured: (InsuredData & { id: number; budget_id: number }) | null;
  items: {
    item_id: number;
    name: string;
    quantity: number;
    unique_price: number;
    total: number;
  }[];
};

type ParsedInsurerPdf = {
  insurer: string;
  client_name: string;
  claim: string;
  policy: string;
  claim_description: string;
  brand: string;
  model: string;
  appliance_description: string;
  pickup_date: string;
  serial_number: string;
  received_status: string;
  affected_parts: string;
  repair_description: string;
  cause: string;
};

type PartsReportData = {
  id: number;
  created_at: string;
  date_from: string;
  date_to: string;
  types: string[];
  lines: { type: string; name: string; quantity: number }[];
};

declare global {
  interface Window {
    electronAPI: {
      // ITEMS
      addItem: (item: {
        name: string;
        price: number;
        quantity: number;
        type: string;
        url_image: string;
      }) => Promise<{ id: number }>;
      getAllItems: () => Promise<ItemRow[]>;
      updateItem: (item: {
        id: number;
        name: string;
        price: number;
        quantity: number;
        type: string;
        url_image: string;
        old_url_image: string;
      }) => Promise<{ changes: number }>;
      deleteItem: (id: number) => Promise<{ changes: number; archived?: boolean }>;
      selectImage: () => Promise<string | null>;
      getImageData: (imageName: string) => Promise<string | null>;

      // CLIENTES
      addClient: (client: ClientInput) => Promise<{ id: number }>;
      getAllClients: () => Promise<ClientRow[]>;
      getDeletedClients: () => Promise<ClientRow[]>;
      updateClient: (client: ClientInput & { id: number }) => Promise<{ changes: number }>;
      deleteClient: (id: number) => Promise<{ changes: number }>;
      restoreClient: (id: number) => Promise<{ changes: number }>;
      deleteClientPermanently: (id: number) => Promise<{ changes: number }>;
      getClientById: (id: number) => Promise<ClientRow | undefined>;

      // EQUIPOS
      getAllAppliance: () => Promise<ApplianceRow[]>;
      addAppliance: (appliance: Omit<ApplianceRow, "id">) => Promise<{ id: number }>;
      updateAppliance: (appliance: ApplianceRow) => Promise<{ changes: number }>;
      deleteAppliance: (id: number) => Promise<{ changes: number }>;
      restoreAppliance: (id: number) => Promise<{ changes: number }>;
      deleteAppliancePermanently: (id: number) => Promise<{ changes: number }>;
      getApplianceByClient: (
        client_id: number,
        deleted?: boolean,
      ) => Promise<ApplianceRow[]>;
      getApplianceById: (id: number) => Promise<ApplianceRow | undefined>;

      // TIPOS DE EQUIPO
      getApplianceTypes: () => Promise<{ id: number; name: string }[]>;
      addApplianceType: (name: string) => Promise<{ id: number; name: string }>;

      // VENTAS PARTICULARES
      createSale: (
        lines: { item_id: number; quantity: number }[],
      ) => Promise<
        { ok: true; id: number; total: number } | { ok: false; error: string }
      >;
      getAllSales: () => Promise<{ id: number; date: string; total: number }[]>;
      getSaleItems: (saleId: number) => Promise<
        {
          item_id: number;
          name: string;
          quantity: number;
          unit_price: number;
          total: number;
        }[]
      >;

      // PRESUPUESTOS
      createBudget: (payload: BudgetPayload) => Promise<Result<{ id: number }>>;
      updateBudget: (payload: BudgetPayload) => Promise<Result<{ id: number }>>;
      setBudgetState: (id: number, state: string) => Promise<Result>;
      getBudgetById: (id: number) => Promise<BudgetDetail | null>;
      getBudgetsByAppliance: (applianceId: number) => Promise<
        {
          id: number;
          date: string;
          state: string;
          type: string;
          insurer: string | null;
          price: number;
        }[]
      >;
      getHistory: () => Promise<
        {
          kind: "budget" | "sale";
          id: number;
          date: string;
          state: string;
          type: string | null;
          insurer: string | null;
          total: number;
          client_name: string | null;
          appliance_type: string | null;
          appliance_brand: string | null;
        }[]
      >;
      getPartsReport: (
        from: string,
        to: string,
      ) => Promise<
        {
          item_id: number;
          name: string;
          type: string;
          stock: number;
          sold: number;
          budgeted: number;
          pending: number;
        }[]
      >;

      deleteBudget: (id: number) => Promise<Result>;

      // INFORMES DE REPUESTOS
      createPartsReport: (payload: {
        date_from: string;
        date_to: string;
        types: string[];
        lines: { type: string; name: string; quantity: number }[];
      }) => Promise<Result<{ id: number }>>;
      getPartsReports: () => Promise<
        { id: number; created_at: string; date_from: string; date_to: string }[]
      >;
      getPartsReportById: (id: number) => Promise<PartsReportData | null>;
      deletePartsReport: (id: number) => Promise<{ changes: number }>;
      getPartsReportPdf: (
        id: number,
      ) => Promise<Result<{ base64: string; fileName: string }>>;
      savePartsReportPdf: (
        id: number,
      ) => Promise<{ ok: boolean; canceled?: boolean; path?: string; error?: string }>;
      openPartsReportPdf: (id: number) => Promise<Result>;

      // PDF
      getBudgetPdf: (
        budgetId: number,
      ) => Promise<Result<{ base64: string; fileName: string }>>;
      saveBudgetPdf: (
        budgetId: number,
      ) => Promise<{ ok: boolean; canceled?: boolean; path?: string; error?: string }>;
      openBudgetPdf: (budgetId: number) => Promise<Result>;
      parseInsurerPdf: () => Promise<
        | { ok: true; data: ParsedInsurerPdf }
        | { ok: false; canceled?: boolean; error?: string }
      >;
    };
  }
}
