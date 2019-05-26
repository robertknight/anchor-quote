# anchor-quote

A library for fast and error-tolerant mapping of quotes in context (ie. a string
of text) to DOM ranges.

This is an experiment to create a successor to (or possibly major new version
of) [dom-anchor-text-quote](https://github.com/tilgovi/dom-anchor-text-quote)
based on experiences using it in the [Hypothesis
client](https://github.com/hypothesis/client).

## Goals

This library is exploring improvements in the following areas:

- **Performance**
  - dom-anchor-text-quote relies on the diff-match-patch library which exhibits
    very poor performance in certain cases when the text is not found
  - dom-anchor-text-quote anchors one selector at a time, with the result that
    some work is repeated for each annotation that is anchored. This library
    aims to support more efficient anchoring of batches of selectors
- **Normalization**  - It should be possible to ignore differences in case,
     spacing etc. when searching for matches
- **Unicode support** 

## Usage

*TODO*

## API

*TODO*

## Benchmarks

*TODO*
