import { JSDOM } from "jsdom";

import { FakeRange } from "./util";

const window = new JSDOM().window;
const { Node, DOMParser, Document } = window;

Document.prototype.createRange = () => new FakeRange() as any;

Object.assign(global, { Node, DOMParser, Document });
