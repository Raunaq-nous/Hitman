// Deliberately bad: the pure engine importing Node I/O.
import { readFileSync } from "node:fs";
export const read = (p: string): string => readFileSync(p, "utf8");
