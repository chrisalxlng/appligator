import { activityInputFromMail, type ActivityType } from "@appligator/shared";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import type { LoadLanguageModel } from "../ai/storedLanguageModel.ts";
import type { Database } from "../db/database.ts";
import { applications, mailAssignments, mailMessages } from "../db/schema.ts";
import { assignMessage, counterpartOf } from "./assignMessage.ts";
import { classifyMail, type ApplicationCandidate } from "./classifyMail.ts";

const maxMailsPerRun = 10;
const maxCandidates = 50;

// Many companies send through these services, so their addresses say nothing about the company.
const sharedSenderDomains = new Set([
  "ashbyhq.com",
  "bamboohr.com",
  "greenhouse.io",
  "icims.com",
  "jobvite.com",
  "join.com",
  "lever.co",
  "myworkday.com",
  "onlyfy.jobs",
  "personio.com",
  "personio.de",
  "recruitee.com",
  "rexx-systems.com",
  "smartrecruiters.com",
  "softgarden.io",
  "softgarden.de",
  "successfactors.com",
  "successfactors.eu",
  "taleo.net",
  "teamtailor.com",
  "workable.com",
]);

function hasSharedSender(sender: string) {
  const domain = sender.split("@")[1] ?? "";
  return [...sharedSenderDomains].some(
    (shared) => domain === shared || domain.endsWith(`.${shared}`),
  );
}

type MailMessageRow = typeof mailMessages.$inferSelect;

interface AutoAssignerOptions {
  db: Database;
  loadLanguageModel: LoadLanguageModel;
  log: FastifyBaseLogger;
}

export function createMailAutoAssigner({ db, loadLanguageModel, log }: AutoAssignerOptions) {
  async function applicationOfThread({ userId, referencedHashes }: MailMessageRow) {
    if (referencedHashes.length === 0) return undefined;

    const [link] = await db
      .select({ applicationId: mailAssignments.applicationId })
      .from(mailAssignments)
      .where(
        and(
          eq(mailAssignments.userId, userId),
          inArray(mailAssignments.messageIdHash, referencedHashes),
        ),
      )
      .orderBy(desc(mailAssignments.createdAt))
      .limit(1);
    return link?.applicationId;
  }

  // A sender who wrote about several applications doesn't tell which one this email is about.
  async function applicationOfSender(message: MailMessageRow) {
    const sender = counterpartOf(message);
    if (!sender || hasSharedSender(sender)) return undefined;

    const links = await db
      .selectDistinct({ applicationId: mailAssignments.applicationId })
      .from(mailAssignments)
      .where(and(eq(mailAssignments.userId, message.userId), eq(mailAssignments.sender, sender)));
    return links.length === 1 ? links[0]!.applicationId : undefined;
  }

  function loadCandidates(userId: string) {
    return db
      .select({
        id: applications.id,
        company: applications.company,
        position: applications.position,
        status: applications.status,
      })
      .from(applications)
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.pinned), desc(applications.createdAt))
      .limit(maxCandidates);
  }

  function markClassified(message: MailMessageRow, changes: Partial<MailMessageRow> = {}) {
    return db
      .update(mailMessages)
      .set({ ...changes, classifiedAt: new Date() })
      .where(and(eq(mailMessages.id, message.id), eq(mailMessages.status, "pending")));
  }

  function assignAutomatically(message: MailMessageRow, applicationId: string, type: ActivityType) {
    return db.transaction(async (tx) => {
      await assignMessage(tx, {
        messageWhere: and(eq(mailMessages.id, message.id), eq(mailMessages.status, "pending")),
        applicationId,
        activity: activityInputFromMail(type, message.content, message.createdAt.toISOString()),
        automatic: true,
      });
      await tx
        .update(mailMessages)
        .set({ classifiedAt: new Date() })
        .where(eq(mailMessages.id, message.id));
    });
  }

  async function processMessage(
    message: MailMessageRow,
    languageModel: Awaited<ReturnType<LoadLanguageModel>>,
  ) {
    const knownApplicationId =
      (await applicationOfThread(message)) ?? (await applicationOfSender(message));

    if (!languageModel) {
      if (knownApplicationId) await assignAutomatically(message, knownApplicationId, "other");
      else await markClassified(message);
      return;
    }

    const candidates: ApplicationCandidate[] = await loadCandidates(message.userId);
    const known = candidates.find(({ id }) => id === knownApplicationId);
    const classification = await classifyMail({
      model: languageModel.model,
      content: message.content,
      isSent: message.folder === "sent",
      candidates: known ? [known] : candidates,
    }).catch((error: unknown) => {
      // Without the model, the known application is still sure, just not what the email means.
      if (knownApplicationId) return { category: "unclear" as const };
      throw error;
    });

    if (knownApplicationId) {
      const isSure = classification.category === "application" && classification.confident;
      const type = isSure ? classification.type : "other";
      await assignAutomatically(message, knownApplicationId, type);
    } else if (classification.category === "application" && classification.confident) {
      await assignAutomatically(message, classification.application.id, classification.type);
    } else if (classification.category === "application") {
      await markClassified(message, {
        suggestion: {
          applicationId: classification.application.id,
          activityType: classification.type,
        },
      });
    } else if (classification.category === "irrelevant" && classification.confident) {
      await markClassified(message, { status: "dismissed" });
    } else {
      await markClassified(message);
    }
  }

  return async function assignNewMails({
    userId,
    aiAssignment,
  }: {
    userId: string;
    aiAssignment: boolean;
  }) {
    const messages = await db
      .select()
      .from(mailMessages)
      .where(
        and(
          eq(mailMessages.userId, userId),
          eq(mailMessages.status, "pending"),
          isNull(mailMessages.classifiedAt),
        ),
      )
      .orderBy(asc(mailMessages.createdAt))
      .limit(maxMailsPerRun + 1);
    const languageModel = aiAssignment ? await loadLanguageModel(userId, log) : undefined;

    for (const message of messages.slice(0, maxMailsPerRun)) {
      try {
        await processMessage(message, languageModel);
      } catch (error) {
        // The email stays unclassified, so the next sync tries again once the provider recovered.
        log.warn({ err: error }, "Assigning an email automatically failed");
        return false;
      }
    }
    return messages.length > maxMailsPerRun;
  };
}
