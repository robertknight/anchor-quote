/**
 * Data structure providing an efficient mapping between (node, offset) and
 * text positions.
 */
interface TextContentOffsetMap {
  rootNode: Node;

  /**
   * A list of descendant nodes of the root node, in the order they would be
   * visited when accessing `rootNode.textContent`.
   */
  nodes: Node[];

  /**
   * The text content of the root node.
   */
  text: string;

  /**
   * A monotonically increasing list of text offsets corresponding to nodes in
   * `nodes` and the corresponding UTF-16 position offsets in `text`.
   */
  offsets: number[];
}

export function createTextContentOffsetMap(
  root: HTMLElement
): TextContentOffsetMap {
  const nodes = [] as Node[];
  const textValues = [] as string[];

  // See https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent
  function getTextContent(node: Node) {
    if (
      node.nodeType === Node.DOCUMENT_NODE ||
      node.nodeType === Node.DOCUMENT_TYPE_NODE ||
      node.nodeType === Node.NOTATION_NODE
    ) {
      return;
    }
    switch (node.nodeType) {
      case Node.DOCUMENT_NODE:
      case Node.DOCUMENT_TYPE_NODE:
      case Node.NOTATION_NODE:
        return;
      case Node.CDATA_SECTION_NODE:
      case Node.COMMENT_NODE:
      case Node.PROCESSING_INSTRUCTION_NODE:
      case Node.TEXT_NODE:
        nodes.push(node);
        textValues.push(node.nodeValue!);
        return;
      default: {
        for (let i = 0; i < node.childNodes.length; i++) {
          const child = node.childNodes[i];
          if (
            child.nodeType === Node.COMMENT_NODE ||
            child.nodeType === Node.PROCESSING_INSTRUCTION_NODE
          ) {
            continue;
          }
          getTextContent(child);
        }
      }
    }
  }
  getTextContent(root);

  const offsets = [] as number[];
  let lastOffset = 0;
  for (let i = 0; i < textValues.length; i++) {
    offsets.push(lastOffset);
    lastOffset += textValues[i].length;
  }
  const text = textValues.join("");

  return { rootNode: root, nodes, offsets, text };
}

/**
 * Find highest index in `ary` with `ary[index]` <= `value`.
 */
function findLastNotGreaterThan(ary: number[], value: number) {
  let high = ary.length;
  let low = 0;

  while (high - low > 1) {
    const mid = Math.round((high + low) / 2);
    if (ary[mid] > value) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return low;
}

/**
 * Map start and end offsets within the `textContent` of a node to a DOM
 * `Range`.
 */
export function rangeFromTextOffsets(
  offsetMap: TextContentOffsetMap,
  start: number,
  end: number
): Range {
  const { nodes, offsets, rootNode } = offsetMap;
  const range = rootNode.ownerDocument!.createRange();
  if (nodes.length === 0) {
    // Return a collapsed range if the document region is empty.
    range.setStart(offsetMap.rootNode, 0);
    range.setEnd(offsetMap.rootNode, 0);
    return range;
  }

  const startNodeIndex = findLastNotGreaterThan(offsets, start);
  const endNodeIndex = findLastNotGreaterThan(offsets, end);

  const startNodeOffset = offsets[startNodeIndex];
  const endNodeOffset = offsets[endNodeIndex];

  range.setStart(nodes[startNodeIndex], start - startNodeOffset);
  range.setEnd(nodes[endNodeIndex], end - endNodeOffset);
  return range;
}
