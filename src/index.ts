import { Match, default as search } from "approx-string-match";

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
    if (strLower[i] !== " ") {
      text += strLower[i];
      offsets.push(i);
    }
  }

  return { text, offsets };
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

  // Find each of the quotes within the normalized text. If a sufficiently
  // close match is found, map it to a DOM Range.
  const ranges = selectors.map(selector => {
    const normalizedQuote = normalize(selector.exact);
    // const normalizedPrefix = normalize(selector.prefix || '');
    // const normalizedSuffix = normalize(selector.suffix || '');

    let maxErrorCount;
    if (typeof options.maxErrorCount !== "undefined") {
      maxErrorCount = options.maxErrorCount;
    } else if (typeof options.maxErrorRate !== "undefined") {
      maxErrorCount = options.maxErrorRate * normalizedQuote.text.length;
    } else {
      maxErrorCount = DEFAULT_MAX_ERROR_RATE * normalizedQuote.text.length;
    }

    let matches;
    const exactMatchPos = normalizedDoc.text.indexOf(normalizedQuote.text);
    if (exactMatchPos !== -1) {
      // Fast path for when there is an exact match.
      matches = [
        {
          start: exactMatchPos,
          end: exactMatchPos + normalizedQuote.text.length,
          errors: 0
        }
      ];
    } else {
      // Slower path which attempts to find a match using approximate matching.
      matches = search(normalizedDoc.text, normalizedQuote.text, maxErrorCount);
      if (matches.length === 0) {
        return null;
      }
    }

    // Choose the match with the lowest number of errors.
    // TODO - Take into account prefix and suffix match closeness.
    const sorted = [...matches];
    sorted.sort((a, b) => a.errors - b.errors);
    const match = sorted[0];

    // Map match back to a range in the original document.
    const srcStart = normalizedDoc.offsets[match.start];
    const srcEnd = normalizedDoc.offsets[match.end];
    return rangeFromTextOffsets(offsetMap, srcStart, srcEnd);
  });

  return ranges;
}
