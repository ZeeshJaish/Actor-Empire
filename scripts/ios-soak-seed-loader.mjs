// Preload before the bundled simulator: NPC_DATABASE is generated at module
// evaluation time, before the soak's per-week random override is installed.
// A fixed bootstrap seed makes independent process runs comparable.
let state = 0x5eeda11;
Math.random = () => {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return (state >>> 0) / 0x1_0000_0000;
};
