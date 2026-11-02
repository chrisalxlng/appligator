import type { MailMessage } from "@appligator/shared";
import { Badge, LinkChip, RichText } from "@appligator/ui";
import {
  IconBriefcase2,
  IconCalendarEvent,
  IconFolder,
  IconPaperclip,
  IconTag,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DetailView, NotSpecified, Property } from "../collection/DetailView.tsx";
import { formatDateTime } from "../details/format.ts";
import { MailMessageActions } from "./MailMessageActions.tsx";
import { useMailMessageStatus } from "./useMailMessageStatus.ts";

export function MailMessageDetail({ message }: { message: MailMessage }) {
  const { t, i18n } = useTranslation();
  const status = useMailMessageStatus()(message.status);

  return (
    <DetailView
      company={message.from}
      position={message.subject || t("inbox.noSubject")}
      actions={<MailMessageActions message={message} />}
      properties={
        <>
          <Property icon={IconTag} label={t("inbox.properties.status")}>
            <Badge tone={status.tone}>{status.label}</Badge>
          </Property>
          {message.application && (
            <Property icon={IconBriefcase2} label={t("inbox.properties.application")}>
              <LinkChip
                render={
                  <Link
                    to="/applications/$applicationId"
                    params={{ applicationId: message.application.id }}
                  />
                }
              >
                {message.application.position}
              </LinkChip>
            </Property>
          )}
          <Property icon={IconUser} label={t("attachments.email.from")}>
            {message.from || <NotSpecified />}
          </Property>
          <Property icon={IconUsers} label={t("attachments.email.to")}>
            {message.to || <NotSpecified />}
          </Property>
          <Property icon={IconCalendarEvent} label={t("attachments.email.sentAt")}>
            {message.sentAt ? formatDateTime(message.sentAt, i18n.language) : <NotSpecified />}
          </Property>
          <Property icon={IconFolder} label={t("inbox.properties.folder")}>
            {t(`inbox.folders.${message.folder}`)}
          </Property>
          {message.attachmentCount > 0 && (
            <Property icon={IconPaperclip} label={t("inbox.properties.attachments")}>
              {t("inbox.filesNotImported", { count: message.attachmentCount })}
            </Property>
          )}
        </>
      }
    >
      <RichText html={message.body} headingLevel={3} />
    </DetailView>
  );
}
