import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vite-plus/test";
import "./src/i18n/i18n.ts";

afterEach(cleanup);
