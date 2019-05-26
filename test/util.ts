import rangeToString from "./range-to-string";

export function parseHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.firstElementChild as HTMLElement;
}

export class FakeRange {
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
