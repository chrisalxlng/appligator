import { IconButton } from "@appligator/ui";
import { IconLogout } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/useAuth.ts";
import { Page } from "./Page.tsx";
import styles from "./ProfilePage.module.css";

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <Page title={t("navigation.profile")}>
      <section className={styles.account} aria-label={t("profile.account")}>
        <div className={styles.user}>
          <p className={styles.name}>{user.name}</p>
          <p className={styles.email}>{user.email}</p>
        </div>
        <IconButton variant="surface" label={t("profile.logout")} onClick={() => void logout()}>
          <IconLogout size={20} stroke={2.4} aria-hidden />
        </IconButton>
      </section>
    </Page>
  );
}
