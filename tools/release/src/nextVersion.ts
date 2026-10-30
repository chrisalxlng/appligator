export const bumps = ["major", "minor", "patch"] as const;

export type Bump = (typeof bumps)[number];

export function isBump(value: string | undefined): value is Bump {
  return bumps.some((bump) => bump === value);
}

export function nextVersion(latestTag: string | undefined, bump: Bump) {
  const [major, minor, patch] = latestTag ? parseVersionTag(latestTag) : [0, 0, 0];

  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

function parseVersionTag(tag: string) {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(tag);
  if (!match) throw new Error(`Tag ${tag} is not a version like v1.2.3`);
  return match.slice(1).map(Number);
}
