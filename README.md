# anchor-quote

A library for fast and error-tolerant mapping of quotes in context (eg. as used
  by the [W3C Web Annotations
  standard](https://www.w3.org/TR/annotation-model/#text-quote-selector)) to
  DOM ranges.

This is an experiment to create a successor to (or possibly major new version
of) [dom-anchor-text-quote](https://github.com/tilgovi/dom-anchor-text-quote)
based on experiences using it in the [Hypothesis
client](https://github.com/hypothesis/client).

## Goals

This library is exploring improvements to quote anchoring in the following areas:

- **Functionality**
  - Support a more readily quantifiable definition of the amount of "fuzziness"
    allowed when doing fuzzy matching
  - Support normalizing quotes and document content in order to ignore differences
    such as case, spacing etc. This is expected to be important especially for
    anchoring quotes in formats such as PDF where different viewers may output
    different inter/intra-word spacing for the same content
- **Performance**
  - Anchoring should be fast whether quotes can be located in the document or
    not. dom-anchor-text-quote relies on the diff-match-patch library which exhibits
    very poor performance in certain cases when the text is not found
  - Efficient anchoring of batches of selectors. dom-anchor-text-quote anchors
    one selector at a time, with the result that some work is repeated for each
    annotation that is anchored. This library aims to support more efficient
    anchoring of batches of selectors

## Usage

A quote selector in the [Web
  Annotations](https://www.w3.org/TR/annotation-model/#text-quote-selector)
  data model format can be located in a web document as a DOM Range using the
  `anchor` function:

```js
import { anchor } from "anchor-quote";

const selector = {
  type: 'TextQuoteSelector',
  exact: 'score and seven',
};
const element = document.createElement('div');
element.innerHTML = 'four score and seven years ago';
const range = anchor(element, selector);
console.log(range.toString());
```

The `anchor` function takes a third argument which specifies anchoring options,
such as the maximum amount of errors to allow (`maxErrorRate`) between the quote
and the document content and how to normalize the quote/document content before
searching (`normalize`).

The reverse process of serializing a DOM Range to a selector can be done using
the `describe` function:

```js
import { describe } from "anchor-quote";

const range = window.getSelection().getRangeAt(0);
const selector = describe(range);
```

## API

The package includes documentation in the form of TypeScript annotations and
JSDoc comments. See the `anchor` and `describe` functions in src/index.ts for
details.

## Benchmarking

There are a set of scripts in the `tools/` directory for checking anchoring
results and performance on web content.

```sh
curl https://example.com > example.com.html
./tools/fetch-annotations.py https://example.com > example.com.json
./tools/run-benchmarks.ts example.com.html example.com.json
```

Will output something such as:

```
Read 1270 HTML chars and 37 annotations/highlights with 12 anchorable quotes
dom-anchor-text-quote: anchored 12, orphans 0 in 6ms
anchor-quote: anchored 12, orphans 0 in 9ms
Difference report written to difference-report.txt
```

The Difference Report contains details of quotes which anchored using certain
methods but not others.

Samples of data from various highly annotated pages are available in the
`sample-data/` directory.

To fetch the current set of public annotations at a given URL and compare
anchoring results using different methods, use the `compare-url.sh` script:

```sh
# Web page
tools/compare-url.sh https://example.com

# PDF
tools/compare-pdf-url.sh https://somedomain.com/article.pdf
```

## Benchmark Results

Some initial results from a heavily annotated page on my 2016 MacBook Pro:

```
./tools/run-benchmark.ts sample-data/american-yawp-01-the-new-world.html sample-data/american-yawp-01-the-new-world.json
Read 103494 HTML chars and 830 annotations/highlights with 453 anchorable quotes
dom-anchor-text-quote: anchored 318, orphans 135 in 13342ms
anchor-quote: anchored 331, orphans 122 in 936ms
Difference report written to difference-report.csv
```
