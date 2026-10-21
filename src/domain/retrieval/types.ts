/** A retrievable document: text plus where it came from and when we observed it. */
export interface RetrievalDoc {
  id: string;
  sourceId: string;
  observedAt: string;
  text: string;
}
