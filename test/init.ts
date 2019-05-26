import { JSDOM } from "jsdom";

import rangeToString from "./range-to-string";

const window = new JSDOM().window;
const { Node, DOMParser, Document } = window;

class FakeRange {
  startContainer: Node | null;
  startOffset: number;
  endContainer: Node | null;
  endOffset: number;

  constructor() {
    this.startContainer = null;
    this.startOffset = 0;
    this.endContainer = null;
    this.endOffset = 0;
  }

  setStart(container: Node, offset: number) {
    this.startContainer = container;
    this.startOffset = offset;
  }

  setEnd(container: Node, offset: number) {
    this.endContainer = container;
    this.endOffset = offset;
  }

  toString() {
    return rangeToString(this as any);
  }
}

Document.prototype.createRange = () => new FakeRange() as any;

Object.assign(global, { Node, DOMParser, Document });
