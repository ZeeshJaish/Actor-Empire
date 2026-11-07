/* Some pack pages print the player's name as part of the joke. The game sets no limit on a name, so it has to fit at any length. */
export const packName = (name: string) => name.trim().replace(/\s+/g, ' ').toUpperCase() || 'YOU';

/* When the full name is too long for a line: first initial and last word, then the last word alone. */
export const packShortName = (name: string, roomFor: number) => {
  const full = packName(name);
  if (full.length <= roomFor) return full;
  const words = full.split(' ');
  const last = words[words.length - 1];
  const initialled = words.length > 1 ? `${Array.from(words[0])[0]}. ${last}` : last;
  return initialled.length <= roomFor ? initialled : last;
};

/* How far a line with the name has to shrink when it holds more characters than the design has room for. */
export const nameFit = (line: string, roomFor: number) => Math.min(1, roomFor / Math.max(1, line.length));
