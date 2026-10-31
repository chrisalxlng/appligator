import type { Attachment } from "@appligator/shared";
import { IconFile, IconMail, IconWorld } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { hostname } from "../details/format.ts";

const icons = { link: IconWorld, email: IconMail, file: IconFile };

function splitExtension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? [name.slice(0, dot), name.slice(dot + 1).toUpperCase()] : [name, ""];
}

export function useDescribeAttachment() {
  const { t } = useTranslation();

  return (attachment: Attachment) => {
    const icon = icons[attachment.kind];
    switch (attachment.kind) {
      case "link":
        return {
          icon,
          title: attachment.title || hostname(attachment.url),
          meta: hostname(attachment.url),
        };
      case "email":
        return {
          icon,
          title: attachment.subject || t("attachments.email.noSubject"),
          meta: attachment.from,
        };
      case "file": {
        const [name, extension] = splitExtension(attachment.name);
        return { icon, title: attachment.title || name, meta: extension || attachment.mimeType };
      }
    }
  };
}
