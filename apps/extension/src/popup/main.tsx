import "@appligator/ui/styles.css";
import "../i18n/i18n.ts";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Popup } from "./Popup.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
