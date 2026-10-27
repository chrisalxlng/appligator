import Keycloak from "keycloak-js";

export interface User {
  name: string;
  email: string;
}

export interface Auth {
  user: User;
  logout: () => Promise<void>;
}

export async function authenticate(): Promise<Auth> {
  const keycloak = new Keycloak({
    url: import.meta.env.VITE_KEYCLOAK_URL,
    realm: import.meta.env.VITE_KEYCLOAK_REALM,
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  });

  keycloak.onTokenExpired = () => {
    keycloak.updateToken().catch(() => keycloak.login());
  };

  await keycloak.init({ onLoad: "login-required" });

  return {
    user: {
      name: keycloak.tokenParsed?.name ?? "",
      email: keycloak.tokenParsed?.email ?? "",
    },
    logout: () => keycloak.logout({ redirectUri: window.location.origin }),
  };
}
