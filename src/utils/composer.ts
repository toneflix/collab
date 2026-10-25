import { notify } from './helpers';
import { wordSoundsRequest, type WordSound } from './requests/composer';

/** The HTTP status of a failed request: the API puts it in `status_code` */
export const requestStatus = (e: unknown) => Number((e as { status_code?: number })?.status_code) || 0;

/** Whether the request layer already showed this error; it shows all but 401, 403 and 422 */
export const errorShown = (e: unknown) => requestStatus(e) >= 400 && ![401, 403, 422].includes(requestStatus(e));

/** Shows a failed request's message, unless the request layer already did */
export const notifyError = (e: unknown, fallback: string) => {
  if (!errorShown(e)) notify((e as { message?: string })?.message || fallback, 'error');
};

/** A line that only names a section, like "[Verse 1]" or "[Hook x2]" */
export const isSectionLine = (line: string) => /^\s*\[[^\]]*\]\s*$/.test(line);

/** Each word of a line with where it sits, lowercased, apostrophes kept ("you're") */
export const tokensOf = (line: string) => {
  if (isSectionLine(line)) return [];
  const tokens: { word: string; from: number; to: number }[] = [];
  for (const match of line.matchAll(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu)) {
    tokens.push({ word: match[0].toLowerCase(), from: match.index, to: match.index + match[0].length });
  }
  return tokens;
};

/** The words of a line, lowercased */
export const wordsOf = (line: string) => tokensOf(line).map((t) => t.word);

/** The last word of a line, for its rhymes */
export const lastWordOf = (line: string) => wordsOf(line).at(-1) ?? '';

/** Syllables from spelling, for words the dictionary hasn't answered yet (matches the API's guess) */
export const guessSyllables = (word: string) => {
  const letters = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!letters) return 0;
  let count = letters.match(/[aeiouy]+/g)?.length ?? 0;
  if (/[^aeiouy]e$/.test(letters) && !/[^aeiouy]le$/.test(letters)) count--;
  if (/[^aeiouytdszxgc]e[sd]$/.test(letters)) count--;
  return Math.max(1, count);
};

/** A rhyme sound from spelling: the last vowel group and what follows ("ot" for hot) */
export const guessVowelKey = (word: string) => {
  const match = word.toLowerCase().replace(/[^a-z]/g, '').match(/[aeiouy]+[^aeiouy]*$/);
  return match ? `~${match[0]}` : '';
};

/**
 * Syllable counts and rhyme sounds for the words a writer uses. Unknown words
 * are guessed at once and asked for in batches; listeners hear when answers land.
 */
export class WordSounds {
  protected sounds = new Map<string, WordSound>();
  protected pending = new Set<string>();
  protected asked = new Set<string>();
  protected timer: ReturnType<typeof setTimeout> | null = null;
  protected listeners = new Set<() => void>();

  constructor(protected delay = 350) {}

  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  syllables(word: string) {
    return this.sounds.get(word)?.syllables ?? guessSyllables(word);
  }

  vowelKey(word: string) {
    return this.sounds.get(word)?.vowelKey || guessVowelKey(word);
  }

  stress(word: string) {
    return this.sounds.get(word)?.stress ?? null;
  }

  lineSyllables(line: string) {
    return wordsOf(line).reduce((sum, word) => sum + this.syllables(word), 0);
  }

  /** Asks for every word in the text the API hasn't answered yet */
  want(text: string) {
    text.split('\n').forEach((line) =>
      wordsOf(line).forEach((word) => {
        if (!this.sounds.has(word) && !this.asked.has(word)) this.pending.add(word);
      }),
    );
    if (this.pending.size && !this.timer) this.timer = setTimeout(() => void this.flush(), this.delay);
  }

  protected async flush() {
    this.timer = null;
    const batch = [...this.pending].slice(0, 200);
    batch.forEach((word) => {
      this.pending.delete(word);
      this.asked.add(word);
    });
    if (!batch.length) return;

    try {
      const res = await wordSoundsRequest(batch).send();
      res.data.forEach((sound) => this.sounds.set(sound.word, sound));
      this.listeners.forEach((listener) => listener());
    } catch {
      // Guesses stay in place; these words are tried again on the next edit.
      batch.forEach((word) => this.asked.delete(word));
    }

    if (this.pending.size) this.timer = setTimeout(() => void this.flush(), this.delay);
  }
}

/** Little words left uncoloured inside lines, so colours mark real rhymes */
const FILLER = new Set(['a', 'an', 'the', 'i', 'to', 'of', 'and', 'but', 'or', 'in', 'on', 'at', 'it', 'is', 'as', 'for', 'with', 'from', 'by', 'that', 'this', 'was', 'be', 'are']);

/** How many rhyme families get their own colour before colours repeat */
export const RHYME_FAMILIES = 8;

/**
 * Rhyme families in each section: end words that share a sound with another
 * end word in the same section get a colour, and so do words inside lines
 * that share it. Returns the colour index for "line:word" positions.
 */
export const rhymeFamilies = (lines: string[], sounds: WordSounds) => {
  const marks = new Map<string, number>();
  let start = 0;

  const close = (end: number) => {
    const counts = new Map<string, number>();
    for (let i = start; i < end; i++) {
      const last = lastWordOf(lines[i] ?? '');
      if (last) {
        const key = sounds.vowelKey(last);
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    const families = [...counts.entries()].filter(([, n]) => n > 1).map(([key]) => key);

    for (let i = start; i < end; i++) {
      const words = wordsOf(lines[i] ?? '');
      words.forEach((word, w) => {
        if (w < words.length - 1 && FILLER.has(word)) return;
        const family = families.indexOf(sounds.vowelKey(word));
        if (family >= 0) marks.set(`${i}:${w}`, family % RHYME_FAMILIES);
      });
    }
  };

  lines.forEach((line, i) => {
    if (isSectionLine(line)) {
      close(i);
      start = i + 1;
    }
  });
  close(lines.length);

  return marks;
};
