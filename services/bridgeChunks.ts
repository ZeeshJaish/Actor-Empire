/* Perf plan (2026-11-08): a big text goes over the native bridge in pieces. One giant string (a big
   career's export can be tens of MB) is copied several times on its way to the phone's file, which can
   run the app out of memory; pieces of a few hundred KB never do. A piece never ends in the middle of
   a character (an emoji is two UTF-16 units), so the file the pieces make is exactly the text. */

export const BRIDGE_CHUNK_CHARS = 256 * 1024;

export const splitForBridge = (content: string, size = BRIDGE_CHUNK_CHARS): string[] => {
  const pieceSize = Math.max(2, Math.floor(size));
  const pieces: string[] = [];
  let start = 0;
  while (start < content.length) {
    let end = Math.min(content.length, start + pieceSize);
    if (end < content.length) {
      const last = content.charCodeAt(end - 1);
      if (last >= 0xd800 && last <= 0xdbff) end -= 1;
    }
    pieces.push(content.slice(start, end));
    start = end;
  }
  return pieces;
};
