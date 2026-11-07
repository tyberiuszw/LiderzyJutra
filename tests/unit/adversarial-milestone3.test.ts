import { describe, it, expect } from "vitest";
import { matchGuess } from "../../src/lib/game/fuzzy-matcher";
import {
  containsProfanity,
  cleanText,
  validateSubmission,
} from "../../src/lib/game/profanity-filter";
import plMessages from "../../messages/pl.json";
import enMessages from "../../messages/en.json";
import ukMessages from "../../messages/uk.json";
import wordsPl from "../../messages/content/words.pl.json";
import wordsEn from "../../messages/content/words.en.json";
import wordsUk from "../../messages/content/words.uk.json";
import icebreakersPl from "../../messages/content/icebreakers.pl.json";
import icebreakersEn from "../../messages/content/icebreakers.en.json";
import icebreakersUk from "../../messages/content/icebreakers.uk.json";

describe("Milestone 3 Adversarial Challenge: Linguistic Precision, Youth Safeguarding & Trilingual Parity", () => {
  // =========================================================================
  // MISSION 1: Adversarially Stress-Test fuzzy-matcher.ts
  // =========================================================================
  describe("Mission 1: Fuzzy Guess Matcher Adversarial Stress Testing", () => {
    describe("1.1 Ukrainian Cyrillic Phoneme Preservation", () => {
      it("strictly rejects exact match between 'кіт' (cat) and 'кит' (whale) in both directions", () => {
        const catVsWhale = matchGuess("кіт", "кит");
        expect(catVsWhale.isExact).toBe(false);
        expect(catVsWhale.distance).toBe(1);
        expect(catVsWhale.isClose).toBe(false); // L=3 <= 4, no clue leak

        const whaleVsCat = matchGuess("кит", "кіт");
        expect(whaleVsCat.isExact).toBe(false);
        expect(whaleVsCat.distance).toBe(1);
        expect(whaleVsCat.isClose).toBe(false);
      });

      it("strictly rejects exact match between 'дім' (house) and 'дим' (smoke) in both directions", () => {
        const houseVsSmoke = matchGuess("дім", "дим");
        expect(houseVsSmoke.isExact).toBe(false);
        expect(houseVsSmoke.distance).toBe(1);
        expect(houseVsSmoke.isClose).toBe(false);

        const smokeVsHouse = matchGuess("дим", "дім");
        expect(smokeVsHouse.isExact).toBe(false);
        expect(smokeVsHouse.distance).toBe(1);
        expect(smokeVsHouse.isClose).toBe(false);
      });

      it("strictly rejects exact match between 'син' (son) and 'сін' (hay) in both directions", () => {
        const sonVsHay = matchGuess("син", "сін");
        expect(sonVsHay.isExact).toBe(false);
        expect(sonVsHay.distance).toBe(1);
        expect(sonVsHay.isClose).toBe(false);

        const hayVsSon = matchGuess("сін", "син");
        expect(hayVsSon.isExact).toBe(false);
        expect(hayVsSon.distance).toBe(1);
        expect(hayVsSon.isClose).toBe(false);
      });

      it("strictly preserves Ukrainian 'ї' vs 'и', 'є' vs 'е', and 'і' vs 'и' across various word lengths", () => {
        // "їжак" (L=4) vs "ижак"
        const yizhak = matchGuess("їжак", "ижак");
        expect(yizhak.isExact).toBe(false);
        expect(yizhak.isClose).toBe(false); // L=4 <= 4

        // "єнот" (L=4) vs "енот"
        const yenot = matchGuess("єнот", "енот");
        expect(yenot.isExact).toBe(false);
        expect(yenot.isClose).toBe(false); // L=4 <= 4

        // "пінгвін" (L=7) vs "пингвин" (dist=2: і->и, і->и)
        const penguin = matchGuess("пінгвін", "пингвин");
        expect(penguin.isExact).toBe(false);
        expect(penguin.distance).toBe(2);
        // L=7 >= 7 allows dist=2 as close typo!
        expect(penguin.isClose).toBe(true);

        // Single letter substitution in long word: "підводний" (L=9) vs "пидводний" (dist=1)
        const submarine = matchGuess("підводний", "пидводний");
        expect(submarine.isExact).toBe(false);
        expect(submarine.distance).toBe(1);
        expect(submarine.isClose).toBe(true);
      });

      it("handles Ukrainian apostrophe variants and apostrophe-less typing symmetrically", () => {
        const variants = ["м'яч", "м’яч", "мʼяч", "м`яч", "мяч"];
        for (const v1 of variants) {
          for (const v2 of variants) {
            const res = matchGuess(v1, v2);
            expect(res.isExact, `Matching '${v1}' against '${v2}' must be exact`).toBe(true);
          }
        }
      });

      it("handles Ukrainian 'ґ' -> 'г' keyboard convenience", () => {
        expect(matchGuess("ґанок", "ганок").isExact).toBe(true);
        expect(matchGuess("ґудзик", "гудзик").isExact).toBe(true);
        expect(matchGuess("дзиґа", "дзига").isExact).toBe(true);
      });
    });

    describe("1.2 Levenshtein Distance Boundary Conditions ($L \\le 4$ vs $L \\ge 5$ and $L \\ge 7$)", () => {
      it("strictly blocks 'isClose: true' for all words of length L <= 4 at distance 1", () => {
        const shortPairs: [string, string][] = [
          ["a", "b"], // L=1, dist=1
          ["ab", "ac"], // L=2, dist=1
          ["cat", "cot"], // L=3, dist=1
          ["dom", "dym"], // L=3, dist=1
          ["kot", "kat"], // L=3, dist=1
          ["pies", "piec"], // L=4, dist=1
          ["auto", "auta"], // L=4, dist=1
          ["lion", "loin"], // L=4, dist=2
          ["frog", "frod"], // L=4, dist=1
          ["shoe", "shop"], // L=4, dist=1
          ["drwi", "drzw"], // L=4, dist=1
        ];

        for (const [target, guess] of shortPairs) {
          const res = matchGuess(target, guess);
          expect(res.isExact).toBe(false);
          expect(res.isClose, `Word '${target}' (L=${target.length}) vs '${guess}' must NOT be close`).toBe(false);
        }
      });

      it("strictly enables 'isClose: true' for words of length L >= 5 at distance 1", () => {
        const mediumPairs: [string, string][] = [
          ["apple", "appla"], // L=5, dist=1
          ["kotek", "kotem"], // L=5, dist=1
          ["horse", "house"], // L=5, dist=1
          ["drzewo", "drzewa"], // L=6, dist=1
          ["banana", "banane"], // L=6, dist=1
          ["rakieta", "rakiete"], // L=7, dist=1
          ["kameleon", "kameleom"], // L=8, dist=1
          ["elephant", "elephanx"], // L=8, dist=1
          ["responsibilty", "responsibility"], // L=14, dist=1
        ];

        for (const [target, guess] of mediumPairs) {
          const res = matchGuess(target, guess);
          expect(res.isExact).toBe(false);
          expect(res.distance).toBe(1);
          expect(res.isClose, `Word '${target}' (L=${target.length}) vs '${guess}' MUST be close`).toBe(true);
        }
      });

      it("enforces distance 2 rules: isClose is FALSE for L < 7, and TRUE for L >= 7", () => {
        // L=5, dist=2 -> FALSE
        const res5_2 = matchGuess("apple", "apXXe"); // dist=2, L=5
        expect(res5_2.distance).toBe(2);
        expect(res5_2.isClose).toBe(false);

        // L=6, dist=2 -> FALSE
        const res6_2 = matchGuess("drzewo", "drzwa"); // dist=2 (omits e, o->a)
        expect(res6_2.distance).toBe(2);
        expect(res6_2.isClose).toBe(false);

        // L=7, dist=2 -> TRUE
        const res7_2 = matchGuess("telefon", "telofom"); // dist=2: e->o, n->m
        expect(res7_2.distance).toBe(2);
        expect(res7_2.isClose).toBe(true);

        // L=8, dist=2 -> TRUE
        const res8_2 = matchGuess("kameleon", "kamaleom"); // dist=2: e->a, n->m
        expect(res8_2.distance).toBe(2);
        expect(res8_2.isClose).toBe(true);

        // L=8, dist=3 -> FALSE
        const res8_3 = matchGuess("kameleon", "kamalcom"); // dist=3: e->a, e->c, n->m
        expect(res8_3.distance).toBe(3);
        expect(res8_3.isClose).toBe(false);
      });

      it("evaluates boundary grid systematically across lengths 1 to 10", () => {
        for (let len = 1; len <= 10; len++) {
          const base = "x".repeat(len);
          // 1 substitution
          const d1 = "y" + "x".repeat(len - 1);
          const r1 = matchGuess(base, d1);
          expect(r1.distance).toBe(1);
          if (len >= 5) {
            expect(r1.isClose, `len=${len} dist=1 should be close`).toBe(true);
          } else {
            expect(r1.isClose, `len=${len} dist=1 should NOT be close`).toBe(false);
          }

          if (len >= 2) {
            // 2 substitutions
            const d2 = "yy" + "x".repeat(len - 2);
            const r2 = matchGuess(base, d2);
            expect(r2.distance).toBe(2);
            if (len >= 7) {
              expect(r2.isClose, `len=${len} dist=2 should be close`).toBe(true);
            } else {
              expect(r2.isClose, `len=${len} dist=2 should NOT be close`).toBe(false);
            }
          }
        }
      });
    });

    describe("1.3 Cross-Alphabet Homoglyph Attacks & Fuzzing", () => {
      it("detects cross-alphabet Cyrillic/Latin homoglyphs without crashing", () => {
        // Cyrillic letters: а, е, і, о, р, с, х, у, к
        // Target: "kameleon" (pure Latin)
        const fullyCyrillicLookalike = "\u043A\u0430m\u0435l\u0435\u043En";
        const res = matchGuess("kameleon", fullyCyrillicLookalike);
        expect(res.isExact).toBe(true);
        expect(res.matchedViaHomoglyph).toBe(true);
      });

      it("handles reverse homoglyph for Contract 4 specified characters (а, е, і, о, р, с, х)", () => {
        // Ukrainian target: "коса" (Cyrillic с-о-р-о-к) -> Latin "koca"
        expect(matchGuess("коса", "koca").isExact).toBe(true);

        // Ukrainian target: "рука" (Cyrillic р-у-к-а) -> Latin "pyka"
        expect(matchGuess("рука", "pyka").isExact).toBe(true);

        // Ukrainian target: "сорок" (Cyrillic с-о-р-о-к) -> Latin "copok"
        expect(matchGuess("сорок", "copok").isExact).toBe(true);

        // Ukrainian target: "оса" (Cyrillic о-с-а) -> Latin "oca"
        expect(matchGuess("оса", "oca").isExact).toBe(true);
      });

      it("survives 500 fuzzed pseudo-random homoglyph mutations", () => {
        const word = "kameleon";
        const homoglyphs: Record<string, string> = {
          a: "\u0430",
          e: "\u0435",
          o: "\u043E",
          k: "\u043A",
        };

        for (let i = 0; i < 500; i++) {
          let mutated = "";
          for (const ch of word) {
            if (homoglyphs[ch] && Math.random() > 0.5) {
              mutated += homoglyphs[ch];
            } else {
              mutated += ch;
            }
          }
          const res = matchGuess(word, mutated);
          expect(res.isExact, `Mutated string '${mutated}' must match '${word}'`).toBe(true);
        }
      });

      it("survives hostile inputs: empty strings, control characters, and extreme length", () => {
        expect(matchGuess("", "").isExact).toBe(true);
        expect(matchGuess("   ", "").isExact).toBe(true);
        expect(matchGuess("kot", "").isExact).toBe(false);
        expect(matchGuess("", "kot").isExact).toBe(false);

        // Control characters & null bytes
        const withNull = "ko\0t";
        const resNull = matchGuess("kot", withNull);
        expect(resNull.isExact).toBe(false);

        // Emojis & surrogate pairs
        expect(matchGuess("kameleon", "kameleon🦎").distance).toBe(2); // emoji is 2 UTF-16 code units

        // Long string
        const longA = "a".repeat(100);
        const longB = "a".repeat(99) + "b";
        const resLong = matchGuess(longA, longB);
        expect(resLong.isExact).toBe(false);
        expect(resLong.distance).toBe(1);
        expect(resLong.isClose).toBe(true); // L=100 >= 5
      });
    });

    describe("1.4 Polish Diacritic Tolerance", () => {
      it("accurately recognizes Polish words when typed without diacritics", () => {
        const pairs: [string, string][] = [
          ["żółw", "zolw"],
          ["słoń", "slon"],
          ["książka", "ksiazka"],
          ["zażółć gęślą jaźń", "zazolc gesla jazn"],
          ["pływanie", "plywanie"],
          ["śpiewanie", "spiewanie"],
          ["żonglerka", "zonglerka"],
          ["współpraca", "wspolpraca"],
          ["źródło", "zrodlo"],
        ];

        for (const [target, guess] of pairs) {
          const res = matchGuess(target, guess);
          expect(res.isExact, `Target '${target}' must match guess '${guess}'`).toBe(true);
          expect(res.distance).toBe(0);
        }
      });

      it("handles partial diacritic omission (e.g. some typed with Alt, some without)", () => {
        expect(matchGuess("żółw", "żolw").isExact).toBe(true);
        expect(matchGuess("żółw", "zółw").isExact).toBe(true);
        expect(matchGuess("książka", "ksiązka").isExact).toBe(true);
      });
    });
  });

  // =========================================================================
  // MISSION 2: Adversarially Stress-Test profanity-filter.ts
  // =========================================================================
  describe("Mission 2: Profanity Filter Adversarial Stress Testing", () => {
    describe("2.1 Evasion Bypass Attacks", () => {
      it("catches advanced leetspeak combinations across PL, EN, UK", () => {
        const leetAttacks = [
          "k00rw@",
          "k0rw@",
          "f1ck",
          "f!ck",
          "sh!t",
          "5h!t",
          "$h1t",
          "b!tch",
          "b1tch",
          "d1ck",
          "@sshole",
          "4sshole",
          "b@stard",
          "wh0re",
          "p1zd@",
          "j3b@c",
        ];

        for (const attack of leetAttacks) {
          expect(containsProfanity(attack), `Leet attack '${attack}' must be detected`).toBe(true);
        }
      });

      it("catches embedded whitespace evasion attempts", () => {
        const spaceAttacks = [
          "k u r w a",
          "k   u   r   w   a",
          "s h i t",
          "f u c k",
          "f  u  c  k",
          "b i t c h",
          "c u n t",
          "м у д а к",
          "х у й",
          "б л я д ь",
          "п и з д а",
          "s k u r w i e l",
        ];

        for (const attack of spaceAttacks) {
          expect(containsProfanity(attack), `Spaced attack '${attack}' must be detected`).toBe(true);
        }
      });

      it("catches punctuation & symbol separator evasion attempts", () => {
        const punctAttacks = [
          "k.u.r.w.a",
          "k-u-r-w-a",
          "k_u_r_w_a",
          "k,u,r,w,a",
          "k*u*r*w*a",
          "f.u.c.k",
          "f_u_c_k",
          "f-u-c-k",
          "s.h.i.t",
          "м.у.д.а.к",
          "х-у-й",
        ];

        for (const attack of punctAttacks) {
          expect(containsProfanity(attack), `Punctuation attack '${attack}' must be detected`).toBe(true);
        }
      });

      it("catches mixed Cyrillic/Latin homoglyphs in vulgar roots", () => {
        // Cyrillic 'м', Latin 'y', Cyrillic 'д', Latin 'a', Cyrillic 'к'
        expect(containsProfanity("мyдaк")).toBe(true);
        // Latin 'x', Cyrillic 'у', Cyrillic 'й'
        expect(containsProfanity("xуй")).toBe(true);
        // Cyrillic 'к', Latin 'u', Latin 'r', Latin 'w', Cyrillic 'а'
        expect(containsProfanity("\u043Aurw\u0430")).toBe(true);
      });

      it("catches elongated repetition of vulgar phonemes", () => {
        expect(containsProfanity("kuuuuurwaaaaa")).toBe(true);
        expect(containsProfanity("fuuuuuuck")).toBe(true);
        expect(containsProfanity("shiiiiit")).toBe(true);
        expect(containsProfanity("бллляяядь")).toBe(true);
        expect(containsProfanity("хууууй")).toBe(true);
      });
    });

    describe("2.2 False Positive Resistance on Legitimate Words", () => {
      it("ensures mandatory benchmark innocent words are NEVER flagged", () => {
        const innocentWords = [
          "kura", // hen (PL)
          "chudy", // slim (PL)
          "pisać", // to write (PL)
          "fakultet", // faculty
          "assistant", // contains "ass"
          "pass", // contains "ass"
          "document", // contains "cum"
          "classic", // contains "ass"
          "glass", // contains "ass"
          "grass", // contains "ass"
          "button", // contains "butt"
          "dock",
          "duck",
          "deck",
          "count",
          "country",
          "account",
          "discount",
          "pitch",
          "sheet",
          "ship",
          "shirt",
          "kurtka",
          "kurnik",
          "kucharz",
          "pismo",
          "куріпка",
          "курка",
          "кулінарія",
        ];

        for (const word of innocentWords) {
          expect(containsProfanity(word), `Innocent word '${word}' must NEVER be flagged`).toBe(false);
        }
      });

      it("verifies single-word submissions accept clean words and reject vulgar ones", () => {
        expect(validateSubmission("Dzień", "pl").isValid).toBe(true);
        expect(validateSubmission("Hello", "en").isValid).toBe(true);
        expect(validateSubmission("Привіт", "uk").isValid).toBe(true);

        const plVulgar = validateSubmission("kurwa", "pl");
        expect(plVulgar.isValid).toBe(false);
        expect(plVulgar.error).toBe("Dbajmy o kulturę i przyjazną atmosferę w zespole.");

        const enVulgar = validateSubmission("fuck", "en");
        expect(enVulgar.isValid).toBe(false);
        expect(enVulgar.error).toBe("Please keep our team space positive, safe, and respectful.");

        const ukVulgar = validateSubmission("мудак", "uk");
        expect(ukVulgar.isValid).toBe(false);
        expect(ukVulgar.error).toBe("Дбаймо про культуру спілкування та дружню атмосферу в команді.");
      });

      it("properly sanitizes toxic content using chameleon or asterisk mask", () => {
        // Individual word in sentence
        expect(cleanText("To jest kurwa super")).toBe("To jest 🦎🦎🦎 super");
        expect(cleanText("To jest kurwa super", "asterisk")).toBe("To jest *** super");

        // Spaced evasion attempt spanning entire text
        expect(cleanText("k u r w a")).toBe("🦎🦎🦎");
        expect(cleanText("s h i t", "asterisk")).toBe("***");
      });

      /**
       * ADVERSARIAL DISCOVERY / VULNERABILITY AUDIT:
       * In profanity-filter.ts, `compactText = leetText.replace(/[\s\.\-_,*]+/g, "");`
       * strips ALL whitespace across full multi-word sentences before running PROFANITY_PATTERNS.
       * 
       * Because /j+e+b+[a-ząćęłńóśźż]* / (PL) and /є+б+[а-яіїєґa-z]* / (UK) lack word-boundary guards
       * in compactText:
       * - Ukrainian: Any verb ending in 'є' followed by a word starting with 'б' (e.g. "гуляє біля",
       *   "знає багато", "має бути", "читає багато", "співає біля") causes a FALSE POSITIVE.
       * - Polish: Any verb ending in 'je' followed by a word starting with 'b' (e.g. "wstaje bardzo",
       *   "daje buziaka", "nadaje bardzo", "zostaje bez", "dostaje brawa") causes a FALSE POSITIVE.
       */
      it("empirically exposes cross-word boundary false positive in multi-word sentences", () => {
        const ukCrossWordPhrase = "Ця дівчина гуляє біля річки";
        const plCrossWordPhrase = "Ona wstaje bardzo rano";

        const ukHasProfanity = containsProfanity(ukCrossWordPhrase);
        const plHasProfanity = containsProfanity(plCrossWordPhrase);

        // Verified: mitigation prevents cross-word false positives on innocent multi-word sentences
        expect(ukHasProfanity).toBe(false);
        expect(plHasProfanity).toBe(false);
        expect(cleanText(ukCrossWordPhrase)).toBe(ukCrossWordPhrase);
        expect(cleanText(plCrossWordPhrase)).toBe(plCrossWordPhrase);
      });
    });
  });

  // =========================================================================
  // MISSION 3: Verify Trilingual Content Parity across PL, EN, UK
  // =========================================================================
  describe("Mission 3: Trilingual Parity & Catalog Integrity", () => {
    function getAllKeys(obj: Record<string, unknown>, prefix = ""): string[] {
      let keys: string[] = [];
      for (const k of Object.keys(obj)) {
        const next = prefix ? `${prefix}.${k}` : k;
        if (obj[k] && typeof obj[k] === "object" && !Array.isArray(obj[k])) {
          keys = keys.concat(getAllKeys(obj[k] as Record<string, unknown>, next));
        } else {
          keys.push(next);
        }
      }
      return keys;
    }

    const plPaths = getAllKeys(plMessages as unknown as Record<string, unknown>).sort();
    const enPaths = getAllKeys(enMessages as unknown as Record<string, unknown>).sort();
    const ukPaths = getAllKeys(ukMessages as unknown as Record<string, unknown>).sort();

    it("has identical 201 UI keys across PL, EN, UK", () => {
      expect(plPaths.length).toBe(201);
      expect(enPaths.length).toBe(201);
      expect(ukPaths.length).toBe(201);
      expect(enPaths).toEqual(plPaths);
      expect(ukPaths).toEqual(plPaths);
    });

    it("has zero empty strings across all 3 message catalogs", () => {
      function checkNonEmpty(obj: Record<string, unknown>, path = "") {
        for (const [k, v] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${k}` : k;
          if (typeof v === "object" && v !== null && !Array.isArray(v)) {
            checkNonEmpty(v as Record<string, unknown>, currentPath);
          } else {
            expect(typeof v, `${currentPath} must be a string`).toBe("string");
            expect((v as string).trim().length, `${currentPath} must not be empty`).toBeGreaterThan(0);
          }
        }
      }

      checkNonEmpty(plMessages as unknown as Record<string, unknown>);
      checkNonEmpty(enMessages as unknown as Record<string, unknown>);
      checkNonEmpty(ukMessages as unknown as Record<string, unknown>);
    });

    it("preserves identical interpolation parameters across PL, EN, UK", () => {
      function getVal(obj: Record<string, unknown>, path: string): unknown {
        return path.split(".").reduce((acc, k) => (acc ? (acc as Record<string, unknown>)[k] : undefined), obj as unknown);
      }

      for (const p of plPaths) {
        const plVal = getVal(plMessages as unknown as Record<string, unknown>, p) as string;
        const enVal = getVal(enMessages as unknown as Record<string, unknown>, p) as string;
        const ukVal = getVal(ukMessages as unknown as Record<string, unknown>, p) as string;

        const plMatches = (plVal.match(/\{(\w+)\}/g) || []).sort();
        const enMatches = (enVal.match(/\{(\w+)\}/g) || []).sort();
        const ukMatches = (ukVal.match(/\{(\w+)\}/g) || []).sort();

        expect(enMatches, `Placeholder mismatch in EN for key '${p}'`).toEqual(plMatches);
        expect(ukMatches, `Placeholder mismatch in UK for key '${p}'`).toEqual(plMatches);
      }
    });

    it("verifies drawing word bank parity across PL, EN, UK", () => {
      expect(wordsPl.length).toBe(6);
      expect(wordsEn.length).toBe(6);
      expect(wordsUk.length).toBe(6);

      const expectedCategories = ["animals", "everyday", "actions", "tech", "leadership", "ai_future"];
      const plCats = wordsPl.map((c) => c.category);
      const enCats = wordsEn.map((c) => c.category);
      const ukCats = wordsUk.map((c) => c.category);

      expect(plCats).toEqual(expectedCategories);
      expect(enCats).toEqual(expectedCategories);
      expect(ukCats).toEqual(expectedCategories);

      // Verify every category has at least 8 words in each language
      for (let i = 0; i < 6; i++) {
        expect(wordsPl[i].words.length).toBeGreaterThanOrEqual(8);
        expect(wordsEn[i].words.length).toBeGreaterThanOrEqual(8);
        expect(wordsUk[i].words.length).toBeGreaterThanOrEqual(8);
      }
    });

    it("verifies icebreaker decks parity across all 6 games in PL, EN, UK", () => {
      const activities = [
        "two_truths",
        "this_or_that",
        "story_chain",
        "hot_seat",
        "quiz_superlatives",
        "human_bingo",
      ];

      for (const act of activities) {
        expect(icebreakersPl, `PL icebreakers missing ${act}`).toHaveProperty(act);
        expect(icebreakersEn, `EN icebreakers missing ${act}`).toHaveProperty(act);
        expect(icebreakersUk, `UK icebreakers missing ${act}`).toHaveProperty(act);
      }

      // Verify human bingo has exactly 60 curated traits in all three languages
      const plBingo = (icebreakersPl as { human_bingo: { traits: string[] } }).human_bingo.traits;
      const enBingo = (icebreakersEn as { human_bingo: { traits: string[] } }).human_bingo.traits;
      const ukBingo = (icebreakersUk as { human_bingo: { traits: string[] } }).human_bingo.traits;

      expect(plBingo.length).toBe(60);
      expect(enBingo.length).toBe(60);
      expect(ukBingo.length).toBe(60);

      // Verify no empty traits
      for (const t of plBingo) expect(t.trim().length).toBeGreaterThan(0);
      for (const t of enBingo) expect(t.trim().length).toBeGreaterThan(0);
      for (const t of ukBingo) expect(t.trim().length).toBeGreaterThan(0);
    });
  });
});
