/**
 * Minimal QR Code generator — pure TypeScript, zero dependencies.
 * Supports: Alphanumeric mode, Version 1 (21×21), Error Correction Level M.
 * Capacity: up to 20 alphanumeric characters (covers "SC:XXXXXX" = 9 chars).
 */

// ── GF(256) arithmetic ──────────────────────────────────────────
const GF_EXP = new Uint8Array(256);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
  }
  GF_EXP[255] = 1;
})();

function gfMul(a: number, b: number): number {
  return a && b ? GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255] : 0;
}

function rsECC(data: number[], ecLen: number): number[] {
  // Build generator polynomial
  let gen = [1];
  for (let i = 0; i < ecLen; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= gfMul(gen[j], GF_EXP[i]);
    }
    gen = next;
  }

  const result = [...data, ...new Array(ecLen).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const c = result[i];
    if (c) for (let j = 0; j < ecLen; j++) result[i + 1 + j] ^= gfMul(c, gen[j]);
  }
  return result.slice(data.length);
}

// ── Alphanumeric encoding ───────────────────────────────────────
const ALPHA = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

function toBits(text: string): number[] {
  const bits: number[] = [];
  const push = (v: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((v >> i) & 1);
  };

  push(0b0010, 4);          // mode indicator: alphanumeric
  push(text.length, 9);     // char count (9 bits for version 1)

  for (let i = 0; i + 1 < text.length; i += 2)
    push(ALPHA.indexOf(text[i]) * 45 + ALPHA.indexOf(text[i + 1]), 11);
  if (text.length & 1)
    push(ALPHA.indexOf(text[text.length - 1]), 6);

  // Terminator + byte alignment
  for (let i = 0; i < 4 && bits.length < 128; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);

  // Pad to 16 data codewords (128 bits)
  const PAD = [0xec, 0x11];
  let p = 0;
  while (bits.length < 128) push(PAD[p++ & 1], 8);

  return bits;
}

function bitsToBytes(bits: number[]): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    bytes.push(b);
  }
  return bytes;
}

// ── Matrix helpers ──────────────────────────────────────────────
const N = 21; // Version 1 size
type Cell = 0 | 1 | null;
type Matrix = Cell[][];

function newMatrix(): Matrix {
  return Array.from({ length: N }, () => new Array<Cell>(N).fill(null));
}

const FINDER = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

function placeFinder(m: Matrix, row: number, col: number): void {
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 7; c++)
      m[row + r][col + c] = FINDER[r][c] as 0 | 1;
}

function placeFunctionPatterns(m: Matrix): void {
  // Finder patterns
  placeFinder(m, 0, 0);
  placeFinder(m, 0, N - 7);
  placeFinder(m, N - 7, 0);

  // Separators (white border around finders)
  for (let i = 0; i < 8; i++) {
    m[7][i] = 0; m[i][7] = 0;             // top-left
    m[7][N - 1 - i] = 0; m[i][N - 8] = 0; // top-right
    m[N - 8][i] = 0; m[N - 1 - i][7] = 0; // bottom-left
  }

  // Timing patterns
  for (let i = 8; i < N - 8; i++) {
    m[6][i] = (i % 2 === 0) ? 1 : 0;
    m[i][6] = (i % 2 === 0) ? 1 : 0;
  }

  // Dark module (version 1: row 13, col 8)
  m[13][8] = 1;

  // Reserve format info areas (mark as 0 so they're not treated as data)
  for (let i = 0; i < 9; i++) {
    if (m[8][i] === null) m[8][i] = 0;
    if (m[i][8] === null) m[i][8] = 0;
  }
  for (let i = N - 8; i < N; i++) {
    if (m[8][i] === null) m[8][i] = 0;
    if (m[i][8] === null) m[i][8] = 0;
  }
}

// Format info for Level M + Mask 0 (pre-computed and XOR'd with 101010000010010)
// Level M=00, mask=000 → data=00000 → BCH=0000000000 → raw=000000000000000
// XOR mask 101010000010010 → 101010000010010 = 0x5412
const FORMAT_BITS = 0x5412;

function placeFormat(m: Matrix): void {
  // Format info bits, MSB first (bit 14 down to bit 0)
  // Positions around top-left finder
  const tlRow = [8, 8, 8, 8, 8, 8, 8, 8, 7, 5, 4, 3, 2, 1, 0];
  const tlCol = [0, 1, 2, 3, 4, 5, 7, 8, 8, 8, 8, 8, 8, 8, 8];
  for (let i = 0; i < 15; i++) {
    const bit = ((FORMAT_BITS >> (14 - i)) & 1) as 0 | 1;
    m[tlRow[i]][tlCol[i]] = bit;
  }
  // Positions around top-right and bottom-left finders
  for (let i = 0; i < 8; i++) {
    m[8][N - 1 - i] = ((FORMAT_BITS >> i) & 1) as 0 | 1;
  }
  for (let i = 8; i < 15; i++) {
    m[N - 15 + i][8] = ((FORMAT_BITS >> i) & 1) as 0 | 1;
  }
}

function placeData(m: Matrix, codewords: number[]): void {
  const bits: number[] = [];
  for (const b of codewords)
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);

  let bitIdx = 0;
  let goingUp = true;

  for (let rightCol = N - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol--; // skip vertical timing column

    const rows = goingUp
      ? Array.from({ length: N }, (_, i) => N - 1 - i)
      : Array.from({ length: N }, (_, i) => i);

    for (const row of rows) {
      for (const col of [rightCol, rightCol - 1]) {
        if (m[row][col] === null) {
          m[row][col] = bitIdx < bits.length ? (bits[bitIdx++] as 0 | 1) : 0;
        }
      }
    }
    goingUp = !goingUp;
  }
}

function applyMask0(m: Matrix): Matrix {
  // Mask pattern 0: (row + col) % 2 === 0
  // Only applied to data modules (null before placeData, now 0 or 1)
  // We need to know which modules are function patterns.
  // Simple approach: re-build a function-only matrix to compare.
  const fn = newMatrix();
  placeFunctionPatterns(fn);

  return m.map((row, r) =>
    row.map((cell, c) => {
      if (fn[r][c] !== null || cell === null) return cell; // function pattern: don't mask
      return ((r + c) % 2 === 0 ? (1 - cell!) : cell) as 0 | 1;
    })
  ) as Matrix;
}

// ── Public API ──────────────────────────────────────────────────

export function generateQRSvg(
  text: string,
  opts: { dark?: string; light?: string; size?: number } = {},
): string {
  const { dark = '#000000', light = '#ffffff', size = 200 } = opts;

  const bits = toBits(text.toUpperCase());
  const dataBytes = bitsToBytes(bits); // 16 bytes
  const ecBytes = rsECC(dataBytes, 10); // 10 error correction bytes
  const allBytes = [...dataBytes, ...ecBytes]; // 26 bytes

  const m = newMatrix();
  placeFunctionPatterns(m);
  placeData(m, allBytes);
  const masked = applyMask0(m);
  placeFormat(masked);

  // Render as SVG with quiet zone of 4 modules
  const qz = 4;
  const total = N + 2 * qz;
  const cell = size / total;

  let rects = `<rect width="${total}" height="${total}" fill="${light}"/>`;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (masked[r][c] === 1) {
        rects += `<rect x="${c + qz}" y="${r + qz}" width="1" height="1" fill="${dark}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}">${rects}</svg>`;
}

export function qrSvgDataUrl(text: string, opts?: { dark?: string; light?: string; size?: number }): string {
  const svg = generateQRSvg(text, opts);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
