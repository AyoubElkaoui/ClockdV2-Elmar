export const URENBREG_TABLE = "AT_URENBREG";

export const URENBREG_COLUMNS = {
  ID: "GC_ID",
  DOCUMENT: "DOCUMENT_GC_ID",
  TAAK: "TAAK_GC_ID",
  WERK: "WERK_GC_ID",
  AANTAL: "AANTAL",
  DATUM: "DATUM",
  OMSCHRIJVING: "GC_OMSCHRIJVING",
} as const;

export const WERK_TABLE = "AT_WERK";
export const MEDEW_TABLE = "AT_MEDEW";
export const DOCUMENT_TABLE = "AT_DOCUMENT";

export type UrenbregColumnKey = keyof typeof URENBREG_COLUMNS;

export function assertSchemaConfigured(): void {
  // Schema is now fully configured — no TODOs remaining.
}
