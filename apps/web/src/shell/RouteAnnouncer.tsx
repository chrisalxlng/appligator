import { useEffect, useState } from "react";
import a11y from "../collection/visuallyHidden.module.css";

/** Tells screen readers about a new page, which a client-side navigation does not do on its own. */
export function RouteAnnouncer() {
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    let title = document.title;
    const observer = new MutationObserver(() => {
      if (document.title === title) return;
      title = document.title;
      setAnnouncement(title);
    });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div aria-live="polite" className={a11y.visuallyHidden}>
      {announcement}
    </div>
  );
}
