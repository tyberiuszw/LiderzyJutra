/**
 * Trilingual Youth Safeguarding Profanity Filter (PL, EN, UK)
 * Protects youth participants (ages 13-21) across public chat, guesses, and custom prompt submissions.
 */

const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "!": "i",
  "3": "e",
  "4": "a",
  "@": "a",
  "5": "s",
  "$": "s",
  "7": "t",
  "8": "b",
};

const CYRILLIC_TO_LATIN: Record<string, string> = {
  "\u0430": "a",
  "\u0435": "e",
  "\u0456": "i",
  "\u043E": "o",
  "\u0440": "p",
  "\u0441": "c",
  "\u0445": "x",
  "\u0443": "y",
  "\u043A": "k",
};

function normalizeHomoglyphs(str: string): string {
  let res = "";
  for (const ch of str) {
    res += CYRILLIC_TO_LATIN[ch] || ch;
  }
  return res;
}

const PROFANITY_PATTERNS: RegExp[] = [
  // Polish vulgar roots & derivatives
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

  // English vulgar roots & derivatives
  /f+[uio]+c+k+[a-z]*/i,
  /f+c+k+[a-z]*/i,
  /s+h+i+t+[a-z]*/i,
  /b+i+t+c+h+[a-z]*/i,
  /a+s+s+h+o+l+e+[a-z]*/i,
  /c+u+n+t+[a-z]*/i,
  /d+i+c+k+[a-z]*/i,
  /b+a+s+t+a+r+d+[a-z]*/i,
  /w+h+o+r+e+[a-z]*/i,

  // Ukrainian vulgar roots (homoglyph, cyrillic & leet normalized)
  /[xх]+[yу]+й+[а-яіїєґa-z]*/i,
  /б+л+я+[дть]+[а-яіїєґa-z]*/i,
  /є+б+[а-яіїєґa-z]*/i,
  /ї+б+[а-яіїєґa-z]*/i,
  /п+и+з+д+[а-яіїєґa-z]*/i,
  /м+[yу]+д+[aа]+[кk]+[а-яіїєґa-z]*/i,
  /г+[aа]+н+д+[oо]+н+[а-яіїєґa-z]*/i,
  /[cс]+[yу]+[кk]+[aа]+[а-яіїєґa-z]*/i,
];

export function normalizeText(text: string): string {
  const normalized = text.toLowerCase();
  let mapped = "";
  for (const ch of normalized) {
    mapped += LEET_MAP[ch] || ch;
  }
  return normalizeHomoglyphs(mapped);
}

export function containsProfanity(rawText: string): boolean {
  if (!rawText || typeof rawText !== "string") return false;

  const text = rawText.trim();
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  const leetText = normalizeText(text);
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(leetText)) return true;
  }

  // Check for spaced evasion: only compact if text consists of single characters separated by spaces/symbols
  // or contains a sequence of 3+ spaced single characters (e.g. "k u r w a" or "s.h.i.t")
  const hasSpacedEvasion = /(?:^|\s|[.,\-_*])(?:[a-ząćęłńóśźżа-яіїєґ0-9][\s.,\-_*]+){2,}[a-ząćęłńóśźżа-яіїєґ0-9]/i.test(text);

  if (hasSpacedEvasion || !text.includes(" ")) {
    const compactText = leetText.replace(/[\s\.\-_,*]+/g, "");
    for (const pattern of PROFANITY_PATTERNS) {
      if (pattern.test(compactText)) return true;
    }
  }

  return false;
}

export function cleanText(rawText: string, maskType: "asterisk" | "chameleon" = "chameleon"): string {
  if (!rawText) return "";
  const mask = maskType === "chameleon" ? "🦎🦎🦎" : "***";

  // Check if entire text is a single compacted profanity (e.g. "k u r w a" or "s.h.i.t")
  if (containsProfanity(rawText) && !rawText.includes(" ")) {
    return mask;
  }

  // Tokenize preserving whitespace and punctuation
  const tokens = rawText.split(/(\s+|[.,!?;:()]+)/);
  const cleaned = tokens.map((token) => {
    if (!token.trim()) return token;
    if (containsProfanity(token)) {
      return mask;
    }
    return token;
  });

  const result = cleaned.join("");

  // If there was an evasion attempt spanning multiple spaced tokens (e.g. "k u r w a" inside a sentence)
  if (containsProfanity(rawText) && !result.includes(mask)) {
    return mask;
  }

  return result;
}

export const sanitizeText = cleanText;

const LOCALIZED_WARNINGS: Record<string, string> = {
  pl: "Dbajmy o kulturę i przyjazną atmosferę w zespole.",
  en: "Please keep our team space positive, safe, and respectful.",
  uk: "Дбаймо про культуру спілкування та дружню атмосферу в команді.",
};

export function validateSubmission(rawText: string, locale = "pl"): { isValid: boolean; error?: string } {
  if (containsProfanity(rawText)) {
    const error = LOCALIZED_WARNINGS[locale] || LOCALIZED_WARNINGS.pl;
    return { isValid: false, error };
  }
  return { isValid: true };
}
