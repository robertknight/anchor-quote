import { assert } from "chai";
import { get as editDistance } from "fast-levenshtein";

import {
  anchor,
  describe as describeRange,
  ignoreCaseAndWhitespace
} from "../src/index";

import { parseHtml } from "./util";

describe("index", () => {
  describe("describe", () => {
    it("returns expected selector", () => {
      const html = "<div>four score and seven years ago</div>";
      const dom = parseHtml(html);
      const range = dom.ownerDocument!.createRange();
      range.setStart(dom.firstChild!, 5);
      range.setEnd(dom.firstChild!, 10);

      const selector = describeRange(range);
      assert.deepEqual(selector, {
        exact: range.toString()
      });
    });
  });

  describe("ignoreCaseAndWhitespace", () => {
    it("returns input with whitespace removed and case lowered", () => {
      const { text, offsets } = ignoreCaseAndWhitespace("foo BAR baz");
      assert.equal(text, "foobarbaz");
    });

    it("returns correct offsets", () => {
      const { text, offsets } = ignoreCaseAndWhitespace("foo bar baz");
      assert.deepEqual(offsets, [0, 1, 2, 4, 5, 6, 8, 9, 10]);
    });
  });

  describe("anchor", () => {
    it("finds exact matches", () => {
      const quote = { exact: "score and seven" };
      const html = "<div><i>four score and seven years ago</i></div>";
      const dom = parseHtml(html);

      const [range] = anchor(dom, quote);

      assert.ok(range);
      assert.equal(range!.toString(), quote.exact);
    });

    it("finds close matches", () => {
      const quote = { exact: "score and sven" };
      const html = "<div><i>four score and seven years ago</i></div>";
      const dom = parseHtml(html);

      const [range] = anchor(dom, quote);

      assert.ok(range);
      assert.equal(editDistance(range!.toString(), quote.exact), 1);
    });

    it("returns `null` if there is no match", () => {
      const quote = { exact: "the worst of times" };
      const html = "<div><i>four score and seven years ago</i></div>";
      const dom = parseHtml(html);

      const [range] = anchor(dom, quote);

      assert.isNull(range);
    });

    it("supports an array of selectors", () => {
      const quote1 = { exact: "four score" };
      const quote2 = { exact: "and seven" };
      const html = "<div><i>four score and seven years ago</i></div>";
      const dom = parseHtml(html);

      const [range1, range2] = anchor(dom, [quote1, quote2]);

      assert.ok(range1);
      assert.ok(range2);
      assert.equal(range1!.toString(), quote1.exact);
      assert.equal(range2!.toString(), quote2.exact);
    });

    it("returns match with lowest number of errors", () => {
      const quote = { exact: "Jill annd" };
      const html = "<div>Jack and Jill and Robin and Mary</div>";
      const dom = parseHtml(html);

      const [range] = anchor(dom, quote);

      assert.equal(range!.toString(), "Jill and");
    });

    it("limits max errors to `maxErrorCount`", () => {
      const quote = { exact: "fouur sccore" };
      const html = "<div>four score and seven</div>";
      const dom = parseHtml(html);

      let [range] = anchor(dom, quote, { maxErrorCount: 1 });
      assert.isNull(range);

      [range] = anchor(dom, quote, { maxErrorCount: 5 });
      assert.ok(range);
    });

    it("limits max errors to `maxErrorRate`", () => {
      const quote = { exact: "fouur sccore" };
      const html = "<div>four score and seven</div>";
      const dom = parseHtml(html);

      let [range] = anchor(dom, quote, { maxErrorRate: 0.1 });
      assert.isNull(range);

      [range] = anchor(dom, quote, { maxErrorRate: 0.3 });
      assert.ok(range);
    });

    it("normalizes input before searching for matches", () => {
      const quote = { exact: "abcd" };
      const html = "<div>a b c d</div>";
      const dom = parseHtml(html);

      const [range] = anchor(dom, quote, {
        maxErrorCount: 1,
        normalize: ignoreCaseAndWhitespace
      });

      assert.ok(range);
      assert.equal(range!.toString(), "a b c d");
    });

    it("normalizes quote before searching for matches", () => {
      const quote = { exact: "a b c d" };
      const html = "<div>abcd</div>";
      const dom = parseHtml(html);

      const [range] = anchor(dom, quote, {
        maxErrorCount: 1,
        normalize: ignoreCaseAndWhitespace
      });

      assert.ok(range);
      assert.equal(range!.toString(), "abcd");
    });

    it("returns correct match when quote ends before char removed during normalization", () => {
      const quote = { exact: "fine" };
      const html = "<div>one fine day</div>";
      const dom = parseHtml(html);

      const [range] = anchor(dom, quote, {
        normalize: ignoreCaseAndWhitespace
      });

      assert.ok(range);
      assert.equal(range!.toString(), "fine");
    });

    it.skip("finds match with best matching prefix", () => {
      // TODO
    });

    it.skip("finds match with best matching suffix", () => {
      // TODO
    });
  });
});
