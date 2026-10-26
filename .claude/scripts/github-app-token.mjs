#!/usr/bin/env node
// Mints a short-lived GitHub App installation token for the Claude bot.
//
// Usage:
//   github-app-token.mjs              -> prints the token
//   github-app-token.mjs credential get -> git credential helper protocol
//
// Required env (set in .claude/settings.local.json):
//   APPLIGATOR_BOT_APP_ID, APPLIGATOR_BOT_INSTALLATION_ID, APPLIGATOR_BOT_KEY_PATH

import { createSign } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const { APPLIGATOR_BOT_APP_ID, APPLIGATOR_BOT_INSTALLATION_ID, APPLIGATOR_BOT_KEY_PATH } =
  process.env;

if (!APPLIGATOR_BOT_APP_ID || !APPLIGATOR_BOT_INSTALLATION_ID || !APPLIGATOR_BOT_KEY_PATH) {
  console.error("github-app-token: APPLIGATOR_BOT_* env vars are not set");
  process.exit(1);
}

const cacheDir = join(homedir(), ".cache", "appligator-bot");
const cacheFile = join(cacheDir, "token.json");
const refreshBeforeExpiryMs = 5 * 60 * 1000;

function readCachedToken() {
  try {
    const cached = JSON.parse(readFileSync(cacheFile, "utf8"));
    if (new Date(cached.expires_at).getTime() - Date.now() > refreshBeforeExpiryMs) {
      return cached.token;
    }
  } catch {}
  return undefined;
}

function createJwt() {
  const now = Math.floor(Date.now() / 1000);
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  // iat is backdated to tolerate clock drift; GitHub allows at most 10 minutes lifetime.
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iat: now - 60,
    exp: now + 9 * 60,
    iss: APPLIGATOR_BOT_APP_ID,
  })}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(readFileSync(APPLIGATOR_BOT_KEY_PATH, "utf8"), "base64url");
  return `${unsigned}.${signature}`;
}

async function fetchToken() {
  const res = await fetch(
    `https://api.github.com/app/installations/${APPLIGATOR_BOT_INSTALLATION_ID}/access_tokens`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${createJwt()}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!res.ok) {
    console.error(`github-app-token: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const { token, expires_at } = await res.json();
  mkdirSync(cacheDir, { recursive: true, mode: 0o700 });
  writeFileSync(cacheFile, JSON.stringify({ token, expires_at }), { mode: 0o600 });
  return token;
}

const token = readCachedToken() ?? (await fetchToken());

if (process.argv[2] === "credential") {
  // git only expects output for "get"; "store" and "erase" are no-ops.
  if (process.argv[3] === "get") {
    process.stdout.write(`username=x-access-token\npassword=${token}\n`);
  }
} else {
  process.stdout.write(token);
}
