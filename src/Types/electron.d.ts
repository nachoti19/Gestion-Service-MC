export {};

declare global {
  interface Window {
    electronAPI: {
      //INICIO SECCION ITEMS

      addItem: (item: {
        name: string;
        price: number;
        quantity: number;
        type: string;
        url_image: string;
      }) => Promise<{
        id: number;
      }>;

      getAllItems: () => Promise<
        {
          id: number;
          name: string;
          price: number;
          quantity: number;
          url_image: string;
          type: string;
        }[]
      >;

      updateItem: (item: {
        id: number;
        name: string;
        price: number;
        quantity: number;
        type: string;
        url_image: string;
        old_url_image: string;
      }) => Promise<{ changes: number }>;

      deleteItem: (id: number) => Promise<{
        changes: number;
      }>;

      selectImage: () => Promise<string | null>;

      getImageData: (nombreImage: string) => Promise<string | null>;

      //INICIO DE SECCION DE CLIENTES

      addClient: (client: {
        name: string;
        surname: string;
        phone: number;
        adress: string;
        details: string;
        city: string;
      }) => Promise<{
        id: number;
      }>;

      getAllClients: () => Promise<
        {
          id: number;
          name: string;
          surname: string;
          phone: number;
          adress: string;
          details: string;
          city: string;
        }[]
      >;

      updateClient: (client: {
        id: number;
        name: string;
        surname: string;
        phone: number;
        adress: string;
        details: string;
        city: string;
      }) => Promise<{ changes: number }>;

      deleteClient: (id: number) => Promise<{ changes: number }>;
    };
  }
}
