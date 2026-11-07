// Levenshtein distance & Fuzzy Matcher Prototype Verification

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Space-optimized 2-row DP
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost // substitution
      );
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }

  return prev[n];
}

// Homoglyphs mapping: Cyrillic lookalikes to Latin
const CYRILLIC_TO_LATIN_HOMOGLYPHS = {
  '\u0430': 'a', // Cyrillic small a
  '\u0435': 'e', // Cyrillic small ie
  '\u0456': 'i', // Cyrillic small byelorussian-ukrainian i
  '\u043E': 'o', // Cyrillic small o
  '\u0440': 'p', // Cyrillic small er
  '\u0441': 'c', // Cyrillic small es
  '\u0445': 'x', // Cyrillic small ha
  '\u0443': 'y', // Cyrillic small u
};

// Polish diacritics stripping
const POLISH_DIACRITICS = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
  'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
};

// Normalize Ukrainian apostrophes to single standard quote or strip
function normalizeUkrainianApostrophe(str) {
  // Normalize U+2019, U+02BC, U+0060 to standard single quote U+0027, or remove
  return str.replace(/[\u2019\u02BC\u0060\u0027]/g, "'");
}

function normalizeUkrainianKeyboard(str) {
  // ґ (U+0491) -> г (U+0433) for keyboard convenience
  return str.replace(/\u0491/g, '\u0433');
}

function stripPolishDiacritics(str) {
  let res = '';
  for (const ch of str) {
    res += POLISH_DIACRITICS[ch] || ch;
  }
  return res;
}

function normalizeHomoglyphs(str) {
  let res = '';
  for (const ch of str) {
    res += CYRILLIC_TO_LATIN_HOMOGLYPHS[ch] || ch;
  }
  return res;
}

export function matchGuess(rawTarget, rawGuess) {
  // 1. Basic normalization
  let target = rawTarget.trim().toLowerCase().normalize('NFKC');
  let guess = rawGuess.trim().toLowerCase().normalize('NFKC');

  // Normalize Ukrainian apostrophes and keyboard convenience (ґ -> г)
  target = normalizeUkrainianKeyboard(normalizeUkrainianApostrophe(target));
  guess = normalizeUkrainianKeyboard(normalizeUkrainianApostrophe(guess));

  // 1a. Direct exact match
  if (target === guess) {
    return { isExact: true, isClose: false, distance: 0 };
  }

  // 1b. Apostrophe-less match (e.g. м'яч vs мяч)
  const targetNoApos = target.replace(/'/g, '');
  const guessNoApos = guess.replace(/'/g, '');
  if (targetNoApos === guessNoApos) {
    return { isExact: true, isClose: false, distance: 0 };
  }

  // 2. Polish diacritics fallback (e.g. zolw vs żółw)
  const targetNoPl = stripPolishDiacritics(target);
  const guessNoPl = stripPolishDiacritics(guess);
  if (targetNoPl === guessNoPl) {
    return { isExact: true, isClose: false, distance: 0, matchedViaDiacriticFallback: true };
  }

  // 3. Cross-alphabet homoglyph matching (Cyrillic a/e/o/p/c/x typed on Latin keyboard or vice-versa)
  const targetHomoglyph = normalizeHomoglyphs(targetNoPl);
  const guessHomoglyph = normalizeHomoglyphs(guessNoPl);
  if (targetHomoglyph === guessHomoglyph) {
    return { isExact: true, isClose: false, distance: 0, matchedViaHomoglyph: true };
  }

  // 4. Ukrainian Cyrillic phoneme check (Contract 4: NEVER strip/conflate і, ї, є with и, е)
  // Target "кіт" vs guess "кит" must NOT be treated as exact match!
  // Distance between кіт and кит is 1, but length is 3 <= 4, so isClose MUST be FALSE!
  
  // 5. Calculate Levenshtein distance on normalized strings
  const dist = levenshtein(targetNoPl, guessNoPl);

  // Contract 4 rules for "isClose":
  // D_L = 1 allowed ONLY if target word length L >= 5
  // D_L = 2 allowed ONLY if target word length L >= 7
  const L = target.length;
  let isClose = false;
  if (dist === 1 && L >= 5) {
    isClose = true;
  } else if (dist === 2 && L >= 7) {
    isClose = true;
  }

  return { isExact: false, isClose, distance: dist };
}

// Verification tests
console.log("=== RUNNING VERIFICATION CHECKS ===");

// 1. Exact match
console.log("1. Exact match 'kameleon' === 'kameleon':", matchGuess("kameleon", "kameleon"));

// 2. Polish diacritic fallback:
console.log("2. Polish diacritic 'żółw' vs 'zolw':", matchGuess("żółw", "zolw"));
console.log("2b. Polish diacritic 'książka' vs 'ksiazka':", matchGuess("książka", "ksiazka"));

// 3. Ukrainian Cyrillic phoneme preservation:
console.log("3a. Ukrainian 'кіт' vs 'кит' (cat vs whale):", matchGuess("кіт", "кит"));
// Expected: isExact: false, isClose: false, distance: 1 (L = 3 < 5, so NOT close!)
console.log("3b. Ukrainian 'дім' vs 'дим' (house vs smoke):", matchGuess("дім", "дим"));
// Expected: isExact: false, isClose: false (L = 3 < 5)

// 4. Ukrainian apostrophe normalization:
console.log("4a. Ukrainian 'м’яч' vs 'м\\'яч':", matchGuess("м’яч", "м'яч"));
console.log("4b. Ukrainian 'м’яч' vs 'мяч':", matchGuess("м’яч", "мяч"));
console.log("4c. Ukrainian 'комп’ютер' vs 'комп\\'ютер':", matchGuess("комп’ютер", "комп'ютер"));

// 5. Ukrainian keyboard convenience (ґ -> г):
console.log("5. Ukrainian 'ґанок' vs 'ганок':", matchGuess("ґанок", "ганок"));

// 6. Cross-alphabet homoglyph matching:
// Cyrillic 'а', 'е', 'о' inside "kаmеlеоn" matching Latin "kameleon"
const mixedCyrillicKameleon = "k\u0430m\u0435l\u0435\u043En";
console.log("6. Homoglyph mixed Cyrillic 'kаmеlеоn' vs Latin 'kameleon':", matchGuess("kameleon", mixedCyrillicKameleon));

// 7. Near miss bounds:
console.log("7a. Near miss short word 'pies' vs 'piec' (L=4, dist=1):", matchGuess("pies", "piec"));
// Expected: isClose: false
console.log("7b. Near miss short word 'cat' vs 'cot' (L=3, dist=1):", matchGuess("cat", "cot"));
// Expected: isClose: false
console.log("7c. Near miss L=5 'drzewo' vs 'drzewa' (L=6, dist=1):", matchGuess("drzewo", "drzewa"));
// Expected: isClose: true
console.log("7d. Near miss L=5 'kameleon' vs 'kameleo' (L=8, dist=1):", matchGuess("kameleon", "kameleo"));
// Expected: isClose: true
console.log("7e. Near miss L=7, dist=2 'kameleon' vs 'cameleon' (L=8, dist=2):", matchGuess("kameleon", "cameleon"));
// Wait: dist between kameleon and cameleon: k -> c (dist=1)
console.log("7f. Near miss L=7, dist=2 'satelita' vs 'setelito' (L=8, dist=2):", matchGuess("satelita", "setelito"));
// Expected: isClose: true
