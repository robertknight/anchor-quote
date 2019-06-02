import {
  Match,
  Region,
  multiSearch,
  default as search
} from "approx-string-match";

import {
  createTextContentOffsetMap,
  rangeFromTextOffsets
} from "./text-content";

export const DEFAULT_MAX_ERROR_RATE = 0.22;

export interface QuoteSelector {
  prefix?: string;
  exact: string;
  suffix?: string;
}

export function describe(range: Range): QuoteSelector {
  return { exact: range.toString() };
}

/**
 * A normalized representation of an input string with mappings back to
 * the corresponding offsets in the input string.
 */
export interface NormalizedText {
  /**
   * The normalized representation of the input.
   */
  text: string;

  /**
   * A mapping from text offsets in the source string to text offsets in the
   * normalized string.
   */
  offsets: number[];
}

export interface AnchorOptions {
  /**
   * Maximum number of errors to allow between a normalized quote and the
   * normalized content of the DOM.
   *
   * If set, this supercedes `maxErrorRate`.
   */
  maxErrorCount?: number;

  /**
   * Maximum number of errors allowed as a proportion of the quote length.
   * For example a value of `0.2` would allow the normalized quote to differ
   * up to 20% from the document content.
   *
   * Default value: `DEFAULT_MAX_ERROR_RATE`.
   */
  maxErrorRate?: number;

  /**
   * A function which converts the raw text content in the document into
   * a normalized representation which selectors are matched against.
   *
   * This can be used to ignore certain differences (eg. character case,
   * Unicode normalization form, whitespace).
   *
   * If not specified, no normalization is applied.
   */
  normalize?: (str: string) => NormalizedText;
}

function noopNormalize(str: string) {
  return {
    text: str,
    offsets: Array<number>(str.length)
      .fill(0)
      .map((_, i) => i)
  };
}

/**
 * A text normalization function for use with the `normalize` property of
 * `AnchorOptions`.
 *
 * This normalization converts all characters to lower-case and skips whitespace.
 */
export function ignoreCaseAndWhitespace(str: string): NormalizedText {
  const strLower = str.toLowerCase();

  let text = "";
  const offsets = [];
  for (let i = 0; i < strLower.length; i++) {
    if (!/\s/.test(strLower[i])) {
      text += strLower[i];
      offsets.push(i);
    }
  }

  return { text, offsets };
}

function strToTypedArray(str: string) {
  const buf = new Uint16Array(str.length);
  for (let i = 0; i < str.length; i++) {
    buf[i] = str.charCodeAt(i);
  }
  return buf;
}

function calcFilterRatio(textLen: number, regions: Region[]) {
  let searchedLen = 0;
  regions.forEach(r => (searchedLen += r.end - r.start));
  return searchedLen / textLen;
}

function unique<T>(ary: T[]) {
  return Array.from(new Set(ary));
}

function calcMaxErrors(textLen: number, options: AnchorOptions) {
  let maxErrorCount;
  if (typeof options.maxErrorCount !== "undefined") {
    maxErrorCount = options.maxErrorCount;
  } else if (typeof options.maxErrorRate !== "undefined") {
    maxErrorCount = options.maxErrorRate * textLen;
  } else {
    maxErrorCount = DEFAULT_MAX_ERROR_RATE * textLen;
  }
  return maxErrorCount;
}

/**
 * Locate the closest matches for text quotes within the text of an HTML
 * element and its descendants.
 *
 * @param root - The root element of the DOM tree to search
 * @param selectors - The quote or quotes to find
 * @return -
 *  The DOM ranges corresponding to the closest matches for the selectors or
 *  `null` if no sufficiently close match was found
 */
export function anchor(
  root: HTMLElement,
  selectors: QuoteSelector | QuoteSelector[],
  options: AnchorOptions = {}
): Array<Range | null> {
  if (!Array.isArray(selectors)) {
    selectors = [selectors];
  }

  // Extract text content from DOM and normalize it. This is independent of
  // the quote being searched for, so the cost can be amortized over the input
  // selectors.
  const offsetMap = createTextContentOffsetMap(root);
  const normalize = options.normalize || noopNormalize;
  const normalizedDoc = normalize(offsetMap.text);
  // Add a dummy offset past the end of the text in case the search matches up
  // to the end of the content.
  normalizedDoc.offsets.push(offsetMap.text.length);

  // Apply the same normalization to quote selectors.
  let normalizedSelectors = selectors.map((s, i) => ({
    index: i,
    exact: normalize(s.exact).text
  }));

  let matches: Array<Match[]> = [];

  // Fast path: Search for exact matches.
  normalizedSelectors.forEach((selector, i) => {
    const exactMatchPos = normalizedDoc.text.indexOf(selector.exact);
    if (exactMatchPos !== -1) {
      matches[selector.index] = [
        {
          start: exactMatchPos,
          end: exactMatchPos + selector.exact.length,
          errors: 0
        }
      ];
    }
  });

  // Slow path: Search for approximate matches for remaining quotes.
  //
  // Quotes are grouped into small batches by length and then passed to
  // `multiSearch`, which optimizes searching for multiple patterns at once
  // by first filtering out regions of the text which contain no matches.
  normalizedSelectors = normalizedSelectors.filter(
    s => matches[s.index] == null
  );
  normalizedSelectors.sort((a, b) => a.exact.length - b.exact.length);
  const groupSize = 5;
  for (let i = 0; i < normalizedSelectors.length; i += groupSize) {
    const group = normalizedSelectors.slice(i, i + groupSize);
    const patterns = group.map(selector => ({
      pattern: selector.exact,
      maxErrors: calcMaxErrors(selector.exact.length, options)
    }));
    const groupMatches = multiSearch(normalizedDoc.text, patterns);
    groupMatches.forEach((m, i) => {
      matches[group[i].index] = m;
    });
  }

  // Select the best matches for each quote and map them to DOM ranges.
  const ranges = matches.map(selectorMatches => {
    if (selectorMatches.length == 0) {
      return null;
    }
    // Choose the match with the lowest number of errors.
    // TODO - Take into account prefix and suffix match closeness.
    const sorted = [...selectorMatches];
    sorted.sort((a, b) => a.errors - b.errors);
    const match = sorted[0];

    // Map match back to a range in the original document.
    const srcStart = normalizedDoc.offsets[match.start];
    const srcEnd = normalizedDoc.offsets[match.end - 1];
    return rangeFromTextOffsets(offsetMap, srcStart, srcEnd + 1);
  });

  return ranges;
}
