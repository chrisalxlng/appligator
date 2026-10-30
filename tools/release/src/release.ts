import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { bumps, isBump, nextVersion } from "./nextVersion.ts";

function git(...args: string[]) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function exit(message: string): never {
  console.error(message);
  process.exit(1);
}

const bump = process.argv[2];
if (!isBump(bump)) exit(`Usage: vp run release <${bumps.join("|")}>`);

git("fetch", "--tags", "origin", "master");

const latestTag = git("tag", "--list", "v*", "--sort=-version:refname").split("\n")[0] || undefined;
const tag = `v${nextVersion(latestTag, bump)}`;
const commit = git("log", "-1", "--format=%h %s", "origin/master");

const prompt = createInterface({ input: process.stdin, output: process.stdout });
const answer = await prompt.question(
  `Release ${tag} (latest: ${latestTag ?? "none"}) from ${commit}? [y/N] `,
);
prompt.close();
if (answer.trim().toLowerCase() !== "y") exit("Release cancelled");

git("tag", "--annotate", tag, "--message", `Release ${tag}`, "origin/master");
git("push", "origin", tag);
console.log(`Pushed ${tag}, the release workflow publishes it.`);
