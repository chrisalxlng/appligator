export interface Session {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  refreshTokenExpiresAt: number;
}

export const sessionKey = "session";

export function isActive(session: Session | undefined): session is Session {
  return session !== undefined && session.refreshTokenExpiresAt > Date.now();
}

export async function readSession() {
  const { [sessionKey]: session } = await chrome.storage.local.get<{ session?: Session }>(
    sessionKey,
  );
  return session;
}

export async function saveSession(session: Session) {
  await chrome.storage.local.set({ [sessionKey]: session });
}

export async function removeSession() {
  await chrome.storage.local.remove(sessionKey);
}
