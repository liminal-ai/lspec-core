import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const reportSource = await readFile(resolve(root, "src/report.js"), "utf8");
const summarySource = await readFile(resolve(root, "src/summary.js"), "utf8");
const animals = JSON.parse(
  await readFile(resolve(root, "data/animals.json"), "utf8")
);

if (!reportSource.includes("formatSpeciesReport")) {
  throw new Error("Expected src/report.js to export formatSpeciesReport.");
}

if (!summarySource.includes("summarizeAnimals")) {
  throw new Error("Expected src/summary.js to export summarizeAnimals.");
}

if (!Array.isArray(animals) || animals.length < 3) {
  throw new Error("Expected at least three animal records in data/animals.json.");
}
