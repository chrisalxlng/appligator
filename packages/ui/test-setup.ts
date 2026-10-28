import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vite-plus/test";

afterEach(cleanup);

// jsdom has no layout, but ProseMirror measures ranges to scroll the selection into view.
Range.prototype.getClientRects = () => Object.assign([], { item: () => null }) as DOMRectList;
Range.prototype.getBoundingClientRect = () => new DOMRect();
