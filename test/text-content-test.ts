import { assert } from "chai";

import {
  createTextContentOffsetMap,
  rangeFromTextOffsets
} from "../src/text-content";
import { parseHtml } from "./util";

describe("text-content", () => {
  describe("createTextContentOffsetMap", () => {
    const fixtures = [
      {
        name: "simple text",
        html: "<div>simple text</div>"
      },
      {
        name: "comment element",
        html: "<div><!-- test --></div>"
      },
      {
        name: "CDATA",
        html: "<div><![CDATA[ test foo ]]></div>"
      },
      {
        name: "processing instruction",
        html: "<div><?foo bar ?></div>"
      },
      {
        name: "mixed leaf nodes",
        html: "<div>foo<!-- bar -->baz</div>"
      },
      {
        name: "nested elements",
        html: "<div><span><b>foo</b><i>bar</i></span></div>"
      },
      {
        name: "empty",
        html: "<div></div>"
      }
    ];

    it("sets root node", () => {
      const dom = parseHtml("<div>foo <b>bar</b></div>");
      const offsetMap = createTextContentOffsetMap(dom);
      assert.equal(offsetMap.rootNode, dom);
    });

    fixtures.forEach(fixture => {
      it(`returns correct text and offsets (${fixture.name})`, () => {
        const dom = parseHtml(fixture.html);
        const offsetMap = createTextContentOffsetMap(dom);
        assert.equal(
          offsetMap.text,
          dom.textContent,
          "extracted text does not match `textContent`"
        );

        assert.equal(
          offsetMap.nodes.length,
          offsetMap.offsets.length,
          "`nodes` and `offsets` have different lengths"
        );
        if (offsetMap.offsets.length > 0) {
          assert.equal(offsetMap.offsets[0], 0, "first offset is non-zero");
        }
        for (let i = 1; i < offsetMap.offsets.length; i++) {
          assert.isAtLeast(
            offsetMap.offsets[i],
            offsetMap.offsets[i - 1],
            "offsets are not increasing"
          );
        }
        if (offsetMap.offsets.length > 0) {
          assert.isBelow(
            offsetMap.offsets[offsetMap.offsets.length - 1],
            offsetMap.text.length,
            "last offset is above text length"
          );
        }
      });
    });
  });

  describe("rangeFromTextOffsets", () => {
    const fixtures = [
      {
        name: "simple",
        html: "<div>foo bar<span>test</span></div>",
        start: 3,
        end: 8
      },
      {
        name: "full document",
        html: "<div>baba</div>",
        start: 0,
        end: 4
      },
      {
        name: "empty document",
        html: "<div></div>",
        start: 0,
        end: 0
      },
      {
        name: "empty region",
        html: "<div>hello</div>",
        start: 2,
        end: 2
      }
    ];

    fixtures.forEach(({ name, html, start, end }) => {
      it(`converts offsets to correct range (${name})`, () => {
        const dom = parseHtml(html);
        const offsetMap = createTextContentOffsetMap(dom);
        const range = rangeFromTextOffsets(offsetMap, start, end);
        assert.ok(range);
        assert.equal(range.toString(), dom.textContent!.slice(start, end));
      });
    });
  });
});
