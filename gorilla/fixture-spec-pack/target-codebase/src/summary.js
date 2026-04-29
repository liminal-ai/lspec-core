export function summarizeAnimals(animals) {
  return animals.map((animal) => ({
    name: animal.name,
    species: animal.species,
    habitat: animal.habitat
  }));
}
