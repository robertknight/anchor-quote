export function parseHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.firstElementChild as HTMLElement;
}
