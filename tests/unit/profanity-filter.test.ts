import { describe, it, expect } from "vitest";
import {
  containsProfanity,
  cleanText,
  sanitizeText,
  validateSubmission,
} from "../../src/lib/game/profanity-filter";

describe("Trilingual Youth Safeguarding Profanity Filter (PL, EN, UK)", () => {
  // =========================================================================
  // 1. Polish Vulgarities & Inflections
  // =========================================================================
  describe("Polish Vulgarities", () => {
    it("detects canonical Polish vulgar roots", () => {
      expect(containsProfanity("kurwa")).toBe(true);
      expect(containsProfanity("chuj")).toBe(true);
      expect(containsProfanity("huj")).toBe(true);
      expect(containsProfanity("jebać")).toBe(true);
      expect(containsProfanity("pierdolić")).toBe(true);
      expect(containsProfanity("pizda")).toBe(true);
      expect(containsProfanity("skurwiel")).toBe(true);
      expect(containsProfanity("szmata")).toBe(true);
      expect(containsProfanity("cwel")).toBe(true);
      expect(containsProfanity("dupek")).toBe(true);
    });

    it("detects Polish inflections and prefixes", () => {
      expect(containsProfanity("wkurwiony")).toBe(true);
      expect(containsProfanity("zajebiście")).toBe(true);
      expect(containsProfanity("odpierdol")).toBe(true);
      expect(containsProfanity("skurwysyn")).toBe(true);
    });
  });

  // =========================================================================
  // 2. English Vulgarities & Inflections
  // =========================================================================
  describe("English Vulgarities", () => {
    it("detects canonical English vulgar roots", () => {
      expect(containsProfanity("fuck")).toBe(true);
      expect(containsProfanity("shit")).toBe(true);
      expect(containsProfanity("bitch")).toBe(true);
      expect(containsProfanity("asshole")).toBe(true);
      expect(containsProfanity("cunt")).toBe(true);
      expect(containsProfanity("dick")).toBe(true);
      expect(containsProfanity("bastard")).toBe(true);
      expect(containsProfanity("whore")).toBe(true);
    });

    it("detects English inflections", () => {
      expect(containsProfanity("fucking")).toBe(true);
      expect(containsProfanity("bullshit")).toBe(true);
      expect(containsProfanity("bitching")).toBe(true);
    });
  });

  // =========================================================================
  // 3. Ukrainian Vulgarities & Inflections
  // =========================================================================
  describe("Ukrainian Vulgarities", () => {
    it("detects canonical Ukrainian vulgar roots", () => {
      expect(containsProfanity("хуй")).toBe(true);
      expect(containsProfanity("блядь")).toBe(true);
      expect(containsProfanity("їбати")).toBe(true);
      expect(containsProfanity("єбати")).toBe(true);
      expect(containsProfanity("пизда")).toBe(true);
      expect(containsProfanity("мудак")).toBe(true);
      expect(containsProfanity("гандон")).toBe(true);
      expect(containsProfanity("сука")).toBe(true);
    });

    it("detects Ukrainian mixed/homoglyph bypass (e.g. Cyrillic/Latin mixes)", () => {
      // Mixed typing: 'y' and 'a' Latin in Cyrillic "мудак"
      expect(containsProfanity("мyдaк")).toBe(true);
      expect(containsProfanity("хyй")).toBe(true);
    });
  });

  // =========================================================================
  // 4. Evasion Strategies (Leetspeak, Punctuation, Spacing)
  // =========================================================================
  describe("Adversarial Evasion Bypass Detection", () => {
    it("catches leetspeak substitutions (0->o, 1->i, @->a, 3->e, 5->s, etc.)", () => {
      expect(containsProfanity("k00rw@")).toBe(true);
      expect(containsProfanity("f1ck")).toBe(true);
      expect(containsProfanity("sh!t")).toBe(true);
      expect(containsProfanity("b!tch")).toBe(true);
      expect(containsProfanity("d1ck")).toBe(true);
    });

    it("catches spaced-out and punctuation-separated evasion attempts", () => {
      expect(containsProfanity("k u r w a")).toBe(true);
      expect(containsProfanity("k.u.r.w.a")).toBe(true);
      expect(containsProfanity("k-u-r-w-a")).toBe(true);
      expect(containsProfanity("f_u_c_k")).toBe(true);
      expect(containsProfanity("s h i t")).toBe(true);
      expect(containsProfanity("м у д а к")).toBe(true);
    });
  });

  // =========================================================================
  // 5. Text Sanitization & Masking (cleanText / sanitizeText)
  // =========================================================================
  describe("Sanitization & Masking", () => {
    it("masks vulgar words with the chameleon emoji mask 🦎🦎🦎 by default", () => {
      expect(cleanText("To jest kurwa super")).toBe("To jest 🦎🦎🦎 super");
      expect(cleanText("what the fuck is this")).toBe("what the 🦎🦎🦎 is this");
      expect(cleanText("Ти мудак і все")).toBe("Ти 🦎🦎🦎 і все");
    });

    it("masks vulgar words with asterisk mask when specified", () => {
      expect(cleanText("To jest kurwa super", "asterisk")).toBe("To jest *** super");
      expect(cleanText("what the fuck is this", "asterisk")).toBe("what the *** is this");
    });

    it("masks spaced evasion attempt spanning whole text", () => {
      expect(cleanText("k u r w a")).toBe("🦎🦎🦎");
      expect(cleanText("f u c k", "asterisk")).toBe("***");
    });

    it("provides sanitizeText as an identical drop-in alias for cleanText", () => {
      expect(sanitizeText("To jest kurwa")).toBe(cleanText("To jest kurwa"));
      expect(sanitizeText("shit happens", "asterisk")).toBe(cleanText("shit happens", "asterisk"));
    });
  });

  // =========================================================================
  // 6. Submission Validation & Localized Safety Warnings
  // =========================================================================
  describe("Submission Validation & Educational Localized Warnings", () => {
    it("approves clean, respectful submissions across all languages", () => {
      expect(validateSubmission("Dzień dobry drużyno!", "pl")).toEqual({ isValid: true });
      expect(validateSubmission("Great teamwork everyone!", "en")).toEqual({ isValid: true });
      expect(validateSubmission("Чудова спільна робота команди!", "uk")).toEqual({ isValid: true });
    });

    it("rejects profanity and returns localized educational warning for Polish", () => {
      const res = validateSubmission("to jest chujowe", "pl");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Dbajmy o kulturę i przyjazną atmosferę w zespole.");
    });

    it("rejects profanity and returns localized educational warning for English", () => {
      const res = validateSubmission("this is bullshit", "en");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Please keep our team space positive, safe, and respectful.");
    });

    it("rejects profanity and returns localized educational warning for Ukrainian", () => {
      const res = validateSubmission("ти йди на хуй", "uk");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Дбаймо про культуру спілкування та дружню атмосферу в команді.");
    });
  });

  // =========================================================================
  // 7. False-Positive Prevention on Innocent Common Words
  // =========================================================================
  describe("False-Positive Protection on Innocent Words", () => {
    it("does not block legitimate words with overlapping substrings", () => {
      expect(containsProfanity("kura")).toBe(false); // hen (PL)
      expect(containsProfanity("chudy")).toBe(false); // slim (PL)
      expect(containsProfanity("pisać")).toBe(false); // to write (PL)
      expect(containsProfanity("fakultet")).toBe(false); // faculty
      expect(containsProfanity("assistant")).toBe(false); // contains "ass"
      expect(containsProfanity("pass")).toBe(false);
      expect(containsProfanity("classic")).toBe(false);
      expect(containsProfanity("document")).toBe(false);
      expect(containsProfanity("button")).toBe(false);
      expect(containsProfanity("куріпка")).toBe(false);

      // Innocent multi-word sentences with cross-word je+b or є+б phonetic boundaries
      expect(containsProfanity("Ona wstaje bardzo rano")).toBe(false);
      expect(containsProfanity("On daje buziaka psu")).toBe(false);
      expect(containsProfanity("Ten program nadaje bardzo dobrą muzykę")).toBe(false);
      expect(containsProfanity("Ona zostaje bez pracy")).toBe(false);
      expect(containsProfanity("Kto dostaje brawa?")).toBe(false);
      expect(containsProfanity("Ця дівчина гуляє біля річки")).toBe(false);
      expect(containsProfanity("Він знає багато слів")).toBe(false);
      expect(containsProfanity("Команда має багато ідей")).toBe(false);
      expect(containsProfanity("Він співає біля школи")).toBe(false);
      expect(containsProfanity("Він читає багато книг")).toBe(false);

      expect(cleanText("Ona wstaje bardzo rano")).toBe("Ona wstaje bardzo rano");
      expect(cleanText("Ця дівчина гуляє біля річки")).toBe("Ця дівчина гуляє біля річки");
    });
  });
});
