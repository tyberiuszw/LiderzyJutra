/**
 * Fuzzy Matcher Engine for "Rysowanie" (skribbl.io mechanics)
 * Enforces Contract 4:
 * - Ukrainian Cyrillic phoneme preservation (і, ї, є are never conflated with и, е)
 * - Ukrainian apostrophe normalization (U+0027, U+2019, U+02BC, U+0060)
 * - Ukrainian keyboard convenience (ґ -> г)
 * - Cross-alphabet Latin/Cyrillic homoglyph resolution (а, е, і, о, р, с, х, у, к <-> a, e, i, o, p, c, x, y, k)
 * - Polish diacritic tolerance (fallback after exact check)
 * - Levenshtein threshold: D_L = 1 restricted to length L >= 5; D_L = 2 restricted to length L >= 7.
 */

const CYRILLIC_TO_LATIN_HOMOGLYPHS: Record<string, string> = {
  "\u0430": "a", // Cyrillic small a
  "\u0435": "e", // Cyrillic small ie
  "\u0456": "i", // Cyrillic small byelorussian-ukrainian i
  "\u043E": "o", // Cyrillic small o
  "\u0440": "p", // Cyrillic small er
  "\u0441": "c", // Cyrillic small es
  "\u0445": "x", // Cyrillic small ha
  "\u0443": "y", // Cyrillic small u
  "\u043A": "k", // Cyrillic small ka
};

const POLISH_DIACRITICS: Record<string, string> = {
  "ą": "a",
  "ć": "c",
  "ę": "e",
  "ł": "l",
  "ń": "n",
  "ó": "o",
  "ś": "s",
  "ź": "z",
  "ż": "z",
};

export interface MatchResult {
  isExact: boolean;
  isClose: boolean;
  distance: number;
  matchedViaDiacriticFallback?: boolean;
  matchedViaHomoglyph?: boolean;
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }

  return prev[n];
}

export function normalizeUkrainianApostrophes(str: string): string {
  return str.replace(/[\u2019\u02BC\u0060\u0027]/g, "'");
}

export function normalizeUkrainianKeyboard(str: string): string {
  return str.replace(/\u0491/g, "\u0433");
}

export function stripPolishDiacritics(str: string): string {
  let res = "";
  for (const ch of str) {
    res += POLISH_DIACRITICS[ch] || ch;
  }
  return res;
}

export function normalizeHomoglyphs(str: string): string {
  let res = "";
  for (const ch of str) {
    res += CYRILLIC_TO_LATIN_HOMOGLYPHS[ch] || ch;
  }
  return res;
}

export function matchGuess(rawTarget: string, rawGuess: string): MatchResult {
  let target = rawTarget.trim().toLowerCase().normalize("NFKC");
  let guess = rawGuess.trim().toLowerCase().normalize("NFKC");

  // Keyboard convenience & apostrophes
  target = normalizeUkrainianKeyboard(normalizeUkrainianApostrophes(target));
  guess = normalizeUkrainianKeyboard(normalizeUkrainianApostrophes(guess));

  // 1. Direct exact match
  if (target === guess) {
    return { isExact: true, isClose: false, distance: 0 };
  }

  // 2. Ukrainian apostrophe-less match (м'яч vs мяч)
  const targetNoApos = target.replace(/'/g, "");
  const guessNoApos = guess.replace(/'/g, "");
  if (targetNoApos === guessNoApos) {
    return { isExact: true, isClose: false, distance: 0 };
  }

  // 3. Polish diacritics fallback (żółw vs zolw)
  const targetNoPl = stripPolishDiacritics(target);
  const guessNoPl = stripPolishDiacritics(guess);
  if (targetNoPl === guessNoPl) {
    return { isExact: true, isClose: false, distance: 0, matchedViaDiacriticFallback: true };
  }

  // 4. Cross-alphabet homoglyph matching
  const targetHomoglyph = normalizeHomoglyphs(targetNoPl);
  const guessHomoglyph = normalizeHomoglyphs(guessNoPl);
  if (targetHomoglyph === guessHomoglyph) {
    return { isExact: true, isClose: false, distance: 0, matchedViaHomoglyph: true };
  }

  // 5. Levenshtein near-miss calculation
  // Use homoglyph-normalized text so mixed typing does not inflate distance
  const dist = levenshteinDistance(targetHomoglyph, guessHomoglyph);
  const L = target.length;
  let isClose = false;

  // Contract 4: D_L = 1 only if L >= 5; D_L = 2 only if L >= 7
  if (dist === 1 && L >= 5) {
    isClose = true;
  } else if (dist === 2 && L >= 7) {
    isClose = true;
  }

  return { isExact: false, isClose, distance: dist };
}
