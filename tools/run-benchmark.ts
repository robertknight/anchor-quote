#!/usr/bin/env node -r ts-node/register

/**
 * Script for comparing anchoring results and performance for a given web page
 * and set of annotations.
 *
 * Usage:
 *
 *   node -r ts-node/register run-benchmark.ts <HTML file> <JSON file>
 */

import { readFileSync, writeFileSync } from "fs";

// @ts-ignore
import csvStringify from "csv-stringify/lib/sync";

import { JSDOM } from "jsdom";
import { toRange } from "dom-anchor-text-quote";
import { get as editDistance } from "fast-levenshtein";

import { FakeRange } from "../test/util";
import { anchor, ignoreCaseAndWhitespace } from "../src";

/**
 * Compare the anchoring results and performance from different `TextQuoteSelector`
 * anchoring libraries.
 *
 * @param html - The HTML content of the document
 * @param annotations - Annotations on the web page in the format used by the Hypothesis API
 */
function compareAnchoringResults(html: string, annotations: any[]) {
  const quotes = annotations
    .map(ann => ann.target[0].selector)
    .filter(Array.isArray)
    .map(selectors => selectors.find(s => s.type === "TextQuoteSelector"))
    .filter(quote => !!quote);

  console.log(
    `Read ${html.length} HTML chars and ${
      annotations.length
    } annotations/highlights with ${quotes.length} anchorable quotes`
  );

  const dom = new JSDOM(html);
  const body = dom.window.document.body;

  // @ts-ignore
  global.Node = dom.window.Node;
  dom.window.Document.prototype.createRange = () => new FakeRange() as any;

  // Anchor using dom-anchor-text-quote
  let start = new Date();
  const datqRanges = quotes.map(quote => {
    try {
      return toRange(body, quote);
    } catch (e) {
      console.error("anchoring with dom-anchor-text-quote failed", e);
      return null;
    }
  });
  let elapsed = Date.now() - Number(start);
  let anchored = datqRanges.reduce(
    (count, r) => (r == null ? count : count + 1),
    0
  );
  let orphaned = datqRanges.length - anchored;

  console.log(
    `dom-anchor-text-quote: anchored ${anchored}, orphans ${orphaned} in ${elapsed}ms`
  );

  // Anchor using this library.
  start = new Date();
  const aqRanges = anchor(body, quotes, { normalize: ignoreCaseAndWhitespace });
  elapsed = Date.now() - Number(start);

  anchored = aqRanges.reduce((count, r) => (r == null ? count : count + 1), 0);
  orphaned = aqRanges.length - anchored;
  console.log(
    `anchor-quote: anchored ${anchored}, orphans ${orphaned} in ${elapsed}ms`
  );

  // Compare orphans
  const differenceReport = [
    [
      "Quote no.",
      "Status",
      "Quote",
      "anchor-quote match",
      "dom-anchor-text-quote match"
    ]
  ];
  for (let i = 0; i < datqRanges.length; i++) {
    const quote = quotes[i].exact.trim();
    const datqMatch = datqRanges[i] ? datqRanges[i]!.toString().trim() : "";
    const aqMatch = aqRanges[i] ? aqRanges[i]!.toString().trim() : "";
    const datqEditDistance = datqMatch ? editDistance(quote, datqMatch) : 0;
    const aqEditDistance = aqMatch ? editDistance(quote, aqMatch) : 0;

    let state = null;

    if (datqMatch && aqMatch && datqEditDistance !== aqEditDistance) {
      state = "edit-distance-change";
    }

    if ((datqRanges[i] == null) !== (aqRanges[i] == null)) {
      state = "anchor/orphan-change";
      const maxSnippetLen = 300;
      const snippet = (str: string) =>
        str.length < maxSnippetLen ? str : str.slice(0, maxSnippetLen) + "…";
    }

    if (state != null) {
      differenceReport.push([i, state, quote, aqMatch, datqMatch]);
    }
  }
  const diffReportFile = "difference-report.csv";
  writeFileSync(diffReportFile, csvStringify(differenceReport));
  console.log("Difference report written to", diffReportFile);
}

const [htmlFile, annotationsFile] = process.argv.slice(2);
const html = readFileSync(htmlFile).toString();
const annotations = JSON.parse(readFileSync(annotationsFile).toString());

compareAnchoringResults(html, annotations);
