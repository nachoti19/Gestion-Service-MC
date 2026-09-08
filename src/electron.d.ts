export {};

declare global {
  interface Window {
    electronAPI: {
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
      }) => Promise<{ changes: number }>;

      deleteItem: (id: number) => Promise<{
        changes: number;
      }>;

      selectImage: () => Promise<string | null>;

      getImageData: (nombreImage: string) => Promise<string | null>;
    };
  }
}
