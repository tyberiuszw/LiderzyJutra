// Youth Safeguarding Trilingual Profanity Filter Prototype

const LEET_MAP = {
  '0': 'o',
  '1': 'i',
  '!': 'i',
  '3': 'e',
  '4': 'a',
  '@': 'a',
  '5': 's',
  '$': 's',
  '7': 't',
  '8': 'b',
};

const CYRILLIC_TO_LATIN = {
  '\u0430': 'a',
  '\u0435': 'e',
  '\u0456': 'i',
  '\u043E': 'o',
  '\u0440': 'p',
  '\u0441': 'c',
  '\u0445': 'x',
  '\u0443': 'y',
};

function normalizeHomoglyphs(str) {
  let res = '';
  for (const ch of str) {
    res += CYRILLIC_TO_LATIN[ch] || ch;
  }
  return res;
}

// Common stems/patterns for PL, EN, UK (stored with Latin normalized homoglyphs where applicable)
const PROFANITY_PATTERNS = [
  // Polish vulgar roots
  /k+[uou]+r+w+/i,
  /c+h+u+j+/i,
  /h+u+j+/i,
  /j+e+b+[a-ząćęłńóśźż]*/i,
  /p+i+e+r+d+o+l+[a-ząćęłńóśźż]*/i,
  /p+i+z+d+[a-ząćęłńóśźż]*/i,
  /s+k+u+r+w+[a-ząćęłńóśźż]*/i,
  /s+z+m+a+t+[a-ząćęłńóśźż]*/i,
  /c+w+e+l+[a-ząćęłńóśźż]*/i,
  /d+u+p+e+k+/i,

  // English vulgar roots
  /f+u+c+k+[a-z]*/i,
  /s+h+i+t+[a-z]*/i,
  /b+i+t+c+h+[a-z]*/i,
  /a+s+s+h+o+l+e+[a-z]*/i,
  /c+u+n+t+[a-z]*/i,
  /d+i+c+k+[a-z]*/i,
  /b+a+s+t+a+r+d+[a-z]*/i,
  /w+h+o+r+e+[a-z]*/i,

  // Ukrainian vulgar roots (normalized homoglyphs)
  /x+y+й+[а-яіїєґa-z]*/i,
  /б+л+я+[дть]+[а-яіїєґa-z]*/i,
  /є+б+[а-яіїєґa-z]*/i,
  /ї+б+[а-яіїєґa-z]*/i,
  /п+и+з+д+[а-яіїєґa-z]*/i,
  /м+y+д+a+к+[а-яіїєґa-z]*/i,
  /г+a+н+д+o+н+[а-яіїєґa-z]*/i,
  /c+y+к+a+[а-яіїєґa-z]*/i,
];

function normalizeForProfanityCheck(text) {
  let normalized = text.toLowerCase();
  // Map leetspeak
  let mapped = '';
  for (const ch of normalized) {
    mapped += LEET_MAP[ch] || ch;
  }
  return normalizeHomoglyphs(mapped);
}

export function containsProfanity(rawText) {
  if (!rawText || typeof rawText !== 'string') return false;
  
  // 1. Direct check
  const text = rawText.trim();
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  // 2. Normalized leet check
  const leetText = normalizeForProfanityCheck(text);
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(leetText)) return true;
  }

  // 3. Spaced-out / dotted check (e.g. k u r w a or k.u.r.w.a)
  const compactText = leetText.replace(/[\s\.\-_,*]+/g, '');
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(compactText)) return true;
  }

  return false;
}

export function cleanText(rawText, maskType = 'chameleon') {
  if (!rawText) return '';
  const mask = maskType === 'chameleon' ? '🦎🦎🦎' : '***';

  let result = rawText;
  // Replace tokens matching profanity
  // Split by words while keeping delimiters
  const words = rawText.split(/(\s+|[.,!?;:()]+)/);
  const cleanedWords = words.map(word => {
    if (containsProfanity(word)) {
      return mask;
    }
    return word;
  });

  return cleanedWords.join('');
}

const LOCALIZED_WARNINGS = {
  pl: "Dbajmy o kulturę i przyjazną atmosferę w zespole.",
  en: "Please keep our team space positive, safe, and respectful.",
  uk: "Дбаймо про культуру спілкування та дружню атмосферу в команді.",
};

export function validateSubmission(rawText, locale = 'pl') {
  if (containsProfanity(rawText)) {
    const errorMsg = LOCALIZED_WARNINGS[locale] || LOCALIZED_WARNINGS.pl;
    return {
      isValid: false,
      error: errorMsg,
    };
  }
  return { isValid: true };
}

// Verification checks
console.log("=== RUNNING PROFANITY FILTER CHECKS ===");
console.log("1. Safe text:", containsProfanity("Cześć wszystkim, gramy w rysowanie!"));
console.log("2. Polish vulgarity:", containsProfanity("ale kurwa super gra"));
console.log("3. Polish leetspeak:", containsProfanity("k1edys k00rwa cos tam"));
console.log("4. Polish spaced:", containsProfanity("k.u.r.w.a"));
console.log("5. English vulgarity:", containsProfanity("what a fucking great game"));
console.log("6. English leetspeak:", containsProfanity("sh!t happened"));
console.log("7. Ukrainian vulgarity:", containsProfanity("це повний пиздець"));
console.log("8. Ukrainian vulgarity 2:", containsProfanity("ти мудак"));

console.log("Cleaned chameleon mask:", cleanText("O kurwa, ale to jest shit!", "chameleon"));
console.log("Cleaned asterisk mask:", cleanText("O kurwa, ale to jest shit!", "asterisk"));

console.log("Validation rejection PL:", validateSubmission("to jest kurde... kurwa", "pl"));
console.log("Validation rejection EN:", validateSubmission("this is bullshit fuck", "en"));
console.log("Validation rejection UK:", validateSubmission("це якась хуйня", "uk"));
