declare module "dom-anchor-text-quote" {
  export interface Options {}

  export interface Selector {
    type: 'TextQuoteSelector';
    exact: string;
    prefix?: string;
    suffix?: string;
  }

  export function toRange(
    root: HTMLElement,
    selector: Selector,
    options?: Options,
  ): Range;

  export function toTextPosition(
    root: HTMLElement,
    selector: any,
    options?: Options
  ): { start: number; end: number };
}
