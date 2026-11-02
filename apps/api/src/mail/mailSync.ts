import type { MailErrorCode } from "@appligator/shared";
import { and, eq, lt, sql } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import type { SecretCipher } from "../crypto/secretCipher.ts";
import type { Database } from "../db/database.ts";
import { mailAccounts, mailMessages } from "../db/schema.ts";
import { ingestMail, type RawMail } from "./ingestMail.ts";
import { toMailErrorCode } from "./mailAccess.ts";
import type { ReadNewMail } from "./mailReader.ts";

const minute = 60 * 1000;
const day = 24 * 60 * minute;
const syncIntervalMs = 10 * minute;
const maxBackoffMs = 6 * 60 * minute;
const leaseMs = 15 * minute;
const maxLoginFailures = 3;
const retentionMs = 30 * day;

type MailAccountRow = typeof mailAccounts.$inferSelect;

export interface MailSyncOptions {
  db: Database;
  passwordCipher: SecretCipher;
  readNewMail: ReadNewMail;
  log: FastifyBaseLogger;
}

export type MailSync = ReturnType<typeof createMailSync>;

type MailSyncResult = { newMails: number } | { error: MailErrorCode };

function nextAttemptAfterFailure(code: string, failures: number) {
  // Repeated logins with a wrong password could get the mailbox locked by its provider.
  if (code === "loginRejected" && failures >= maxLoginFailures) return null;
  return new Date(Date.now() + Math.min(syncIntervalMs * 2 ** failures, maxBackoffMs));
}

export function createMailSync({ db, passwordCipher, readNewMail, log }: MailSyncOptions) {
  // The lease keeps other API instances away for the duration of the sync, without holding a
  // transaction open during the network requests, and lets them retry if this one crashes.
  async function claimDueAccount() {
    const [account] = await db
      .update(mailAccounts)
      .set({ nextSyncAt: new Date(Date.now() + leaseMs) })
      .where(
        eq(
          mailAccounts.userId,
          sql`(
            select ${mailAccounts.userId} from ${mailAccounts}
            where ${mailAccounts.nextSyncAt} <= now()
            order by ${mailAccounts.nextSyncAt}
            limit 1
            for update skip locked
          )`,
        ),
      )
      .returning();
    return account;
  }

  async function ingestSafely(userId: string, mail: RawMail) {
    try {
      return await ingestMail(db, userId, mail);
    } catch (error) {
      // An email that can't be read must not block the ones after it forever.
      log.error({ err: error, folder: mail.folder }, "Ingesting an email failed");
      return false;
    }
  }

  // An access changed during the sync gets its own sync, so this result must not overwrite it.
  function saveResult(account: MailAccountRow, result: Partial<MailAccountRow>) {
    return db
      .update(mailAccounts)
      .set(result)
      .where(
        and(
          eq(mailAccounts.userId, account.userId),
          eq(mailAccounts.accessUpdatedAt, account.accessUpdatedAt),
        ),
      );
  }

  async function removeMailsOfDisconnectedAccount(userId: string) {
    const [account] = await db
      .select({ userId: mailAccounts.userId })
      .from(mailAccounts)
      .where(eq(mailAccounts.userId, userId));
    if (!account) await db.delete(mailMessages).where(eq(mailMessages.userId, userId));
  }

  function readPassword({ encryptedPassword, userId }: MailAccountRow) {
    try {
      return passwordCipher.decrypt(encryptedPassword, userId);
    } catch (error) {
      log.error(error, "Decrypting the stored mail password failed");
      return undefined;
    }
  }

  async function syncAccount(account: MailAccountRow): Promise<MailSyncResult> {
    const { userId, host, username, cursors, syncFailures } = account;
    const password = readPassword(account);
    // Only entering the password again helps, so retrying would be pointless.
    if (!password) {
      await saveResult(account, { nextSyncAt: null, syncError: "loginRejected" });
      return { error: "loginRejected" };
    }

    let newMails = 0;
    try {
      const result = await readNewMail({ host, username, password }, cursors, async (mail) => {
        if (await ingestSafely(userId, mail)) newMails++;
      });
      await saveResult(account, {
        cursors: result.cursors,
        nextSyncAt: result.hasMore ? new Date() : new Date(Date.now() + syncIntervalMs),
        lastSyncedAt: new Date(),
        syncError: null,
        syncFailures: 0,
      });
      return { newMails };
    } catch (error) {
      const code = toMailErrorCode(error);
      const failures = syncFailures + 1;
      log.warn({ code, failures }, "Mail sync failed");
      await saveResult(account, {
        nextSyncAt: nextAttemptAfterFailure(code, failures),
        syncError: code,
        syncFailures: failures,
      });
      return { error: code };
    } finally {
      await removeMailsOfDisconnectedAccount(userId);
    }
  }

  function deleteExpiredMails() {
    return db
      .delete(mailMessages)
      .where(lt(mailMessages.createdAt, new Date(Date.now() - retentionMs)));
  }

  return {
    // Running alongside a scheduled sync of the same account is harmless: emails are only stored
    // once, and the older of the two positions just means looking at a few emails again.
    async syncAccountOf(userId: string): Promise<MailSyncResult | undefined> {
      const [account] = await db.select().from(mailAccounts).where(eq(mailAccounts.userId, userId));
      if (!account) return undefined;
      if (account.nextSyncAt === null) return { error: "loginRejected" };
      return syncAccount(account);
    },

    async syncDueAccounts(shouldStop: () => boolean = () => false) {
      await deleteExpiredMails();
      while (!shouldStop()) {
        const account = await claimDueAccount();
        if (!account) return;
        await syncAccount(account);
      }
    },
  };
}

export function startMailSync(sync: MailSync, log: FastifyBaseLogger) {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  let running = Promise.resolve();

  function schedule() {
    timer = setTimeout(() => {
      running = sync
        .syncDueAccounts(() => stopped)
        .catch((error: unknown) => log.error(error, "Mail sync run failed"))
        .finally(() => {
          if (!stopped) schedule();
        });
    }, minute);
  }
  schedule();

  return async function stop() {
    stopped = true;
    clearTimeout(timer);
    await running;
  };
}
