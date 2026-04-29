import animals from "../data/animals.json" with { type: "json" };

import { formatSpeciesReport } from "./report.js";
import { summarizeAnimals } from "./summary.js";

export function buildAnimalSummaryLines() {
  return summarizeAnimals(animals).map((animal) => formatSpeciesReport(animal));
}
