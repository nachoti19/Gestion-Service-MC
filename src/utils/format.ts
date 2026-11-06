const moneyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export const money = (value: number) => moneyFormatter.format(value || 0);

// Quita el prefijo técnico que agrega Electron a los errores del proceso principal.
export const errorMessage = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
};

// Minúsculas y sin tildes, para buscar sin importar acentos ni mayúsculas.
export const normalizeText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

// Todas las palabras buscadas deben aparecer en el texto.
export const matchesSearch = (text: string, search: string) => {
  const haystack = normalizeText(text);
  return normalizeText(search)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
};

export const fileName = (path: string) => path.split(/[\\/]/).pop() || path;
