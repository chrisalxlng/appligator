import { activityLimits, emailAddressesOf, textToHtml, toIsoDateTime } from "@appligator/shared";
import { parse } from "node-html-parser";
import PostalMime from "postal-mime";
import { htmlToText } from "../ai/htmlToText.ts";
import type { MailContent } from "../db/schema.ts";

const removedElements = "head,title,meta,link,script,style,img,svg,iframe,object,embed";
const maxTruncatedTextLength = activityLimits.emailBodyLength / 10;

function cleanHtml(html: string) {
  const root = parse(html);
  for (const element of root.querySelectorAll(removedElements)) element.remove();
  for (const element of root.querySelectorAll("*")) element.setAttributes({});
  return (root.querySelector("body") ?? root).innerHTML.trim();
}

// The structure of an HTML email only counts as long as it fits the limit of an email attachment.
function toBody(html: string | undefined, text: string | undefined) {
  const cleanedHtml = html ? cleanHtml(html) : "";
  if (cleanedHtml && cleanedHtml.length <= activityLimits.emailBodyLength) return cleanedHtml;

  const plainText = text ?? htmlToText(cleanedHtml);
  const body = textToHtml(plainText);
  return body.length <= activityLimits.emailBodyLength
    ? body
    : textToHtml(plainText.slice(0, maxTruncatedTextLength));
}

function toHeader(value: string) {
  return value.trim().slice(0, activityLimits.emailHeaderLength).trim();
}

export async function parseMail(source: Uint8Array) {
  const { messageId, inReplyTo, references, subject, from, to, date, html, text, attachments } =
    await PostalMime.parse(source);

  const content: MailContent = {
    subject: toHeader(subject ?? ""),
    from: toHeader(emailAddressesOf(from ? [from] : [])),
    to: toHeader(emailAddressesOf(to ?? [])),
    sentAt: toIsoDateTime(date),
    body: toBody(html, text),
    attachmentCount: attachments.filter(({ disposition }) => disposition === "attachment").length,
  };
  const referencedMessageIds = `${inReplyTo ?? ""} ${references ?? ""}`.match(/<[^<>\s]+>/g) ?? [];
  return { messageId, referencedMessageIds, content };
}
