export const OPTIONS = Object.freeze({
  face: ['square', 'round', 'tapered'],
  hair: ['bald', 'crop', 'swept'],
  brows: ['straight', 'angled', 'arched'],
});
export function normalizeRecipe(input = {}) {
  const recipe = { version: 1 };
  for (const [category, options] of Object.entries(OPTIONS)) {
    recipe[category] = options.includes(input?.[category]) ? input[category] : options[0];
  }
  return recipe;
}
export function enumerateRecipes() {
  return OPTIONS.face.flatMap(face => OPTIONS.hair.flatMap(hair => OPTIONS.brows.map(brows => ({ version: 1, face, hair, brows }))));
}
export function encodeRecipe(input) { return JSON.stringify(normalizeRecipe(input)); }
export function decodeRecipe(text) {
  const value = JSON.parse(text);
  if (!value || Array.isArray(value) || value.version !== 1 ||
      Object.entries(OPTIONS).some(([key, choices]) => !choices.includes(value[key]))) {
    throw new Error('This appearance file is not supported by this pilot.');
  }
  return normalizeRecipe(value);
}
