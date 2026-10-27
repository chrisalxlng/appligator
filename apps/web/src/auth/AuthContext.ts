import { createContext, useContext } from "react";
import type { Auth } from "./authenticate.ts";

export const AuthContext = createContext<Auth | null>(null);

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used within an AuthContext");
  return auth;
}
