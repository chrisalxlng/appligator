import { escapeHtml } from "@appligator/shared";
import { HTMLElement, NodeType, parse, type Node } from "node-html-parser";

export type BlockKind = "heading" | "listItem" | "paragraph";

export interface Block {
  kind: BlockKind;
  text: string;
}

export interface JobPosting {
  details: Record<string, unknown>;
  blocks: Block[];
}

export interface JobPage {
  title: string;
  posting: JobPosting | null;
  blocks: Block[];
}

const ignoredTags = new Set([
  "button",
  "head",
  "iframe",
  "nav",
  "noscript",
  "script",
  "select",
  "style",
  "svg",
  "template",
]);
const headingTags = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const blockTags = new Set([
  ...headingTags,
  "address",
  "article",
  "aside",
  "blockquote",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "footer",
  "header",
  "li",
  "main",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "td",
  "th",
  "tr",
  "ul",
]);
const titleSeparator = /(\s+[|–—·-]\s+|\s*\|\s*)/;
const minSiteNameLength = 4;

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === NodeType.ELEMENT_NODE;
}

function isHidden(element: HTMLElement) {
  return element.hasAttribute("hidden") || element.getAttribute("aria-hidden") === "true";
}

function blockKind(tagName: string, parentKind: BlockKind): BlockKind {
  if (headingTags.has(tagName)) return "heading";
  return tagName === "li" ? "listItem" : parentKind;
}

function readBlocks(root: HTMLElement) {
  const blocks: Block[] = [];
  let pendingText = "";

  function flush(kind: BlockKind) {
    const text = pendingText.replace(/\s+/g, " ").trim();
    pendingText = "";
    if (text && text !== blocks.at(-1)?.text) blocks.push({ kind, text });
  }

  function walk(parent: HTMLElement, kind: BlockKind) {
    for (const node of parent.childNodes) {
      if (!isElement(node)) {
        if (node.nodeType === NodeType.TEXT_NODE) pendingText += node.text;
        continue;
      }

      const tagName = node.tagName.toLowerCase();
      if (ignoredTags.has(tagName) || isHidden(node)) continue;
      if (tagName === "br") {
        flush(kind);
      } else if (blockTags.has(tagName)) {
        const childKind = blockKind(tagName, kind);
        flush(kind);
        walk(node, childKind);
        flush(childKind);
      } else {
        walk(node, kind);
      }
    }
  }

  walk(root, "paragraph");
  flush("paragraph");
  return blocks;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findJobPosting(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) return value.map(findJobPosting).find(Boolean);
  if (!isRecord(value)) return undefined;

  const types = [value["@type"]].flat();
  return types.includes("JobPosting") ? value : findJobPosting(value["@graph"]);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function readDescriptionBlocks(description: string) {
  const html = parse(description);
  const hasMarkup = html.childNodes.some(isElement);
  return readBlocks(hasMarkup ? html : parse(html.text));
}

function readJobPosting(document: HTMLElement): JobPosting | null {
  const posting = document
    .querySelectorAll('script[type="application/ld+json"]')
    .map((script) => findJobPosting(parseJson(script.text)))
    .find(Boolean);
  if (typeof posting?.description !== "string") return null;

  const { description, ...details } = posting;
  const blocks = readDescriptionBlocks(description);
  return blocks.length > 0 ? { details, blocks } : null;
}

function normalize(text: string) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function siteNames(document: HTMLElement, link: string) {
  const siteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute("content");
  const domainName = new URL(link).hostname.split(".").at(-2);
  return [siteName, domainName]
    .map((name) => normalize(name ?? ""))
    .filter((name) => name.length >= minSiteNameLength);
}

function cleanTitle(title: string, names: string[]) {
  const parts = title.split(titleSeparator);
  const isSiteName = (segment: string) => names.some((name) => normalize(segment).includes(name));

  while (parts.length > 1 && isSiteName(parts.at(-1)!)) parts.splice(-2);
  while (parts.length > 1 && isSiteName(parts[0]!)) parts.splice(0, 2);
  return parts.join("").trim();
}

export function readJobPage(html: string, link: string): JobPage {
  const document = parse(html);
  const title = document.querySelector("title")?.text.replace(/\s+/g, " ").trim() ?? "";

  return {
    title: cleanTitle(title, siteNames(document, link)),
    posting: readJobPosting(document),
    blocks: readBlocks(document.querySelector("body") ?? document),
  };
}

export function blocksToHtml(blocks: Block[]) {
  return blocks
    .map(({ kind, text }, index) => {
      const content = escapeHtml(text);
      if (kind === "heading") return `<h2>${content}</h2>`;
      if (kind === "paragraph") return `<p>${content}</p>`;

      const opensList = blocks[index - 1]?.kind !== "listItem";
      const closesList = blocks[index + 1]?.kind !== "listItem";
      return `${opensList ? "<ul>" : ""}<li><p>${content}</p></li>${closesList ? "</ul>" : ""}`;
    })
    .join("");
}
