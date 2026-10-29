import { Button } from "@appligator/ui";
import { IconArrowRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { sendMessage } from "../messages.ts";
import styles from "./Popup.module.css";

export function LoginView() {
  const { t } = useTranslation();

  return (
    <>
      <h1 className={styles.title}>{t("login.title")}</h1>
      <p>{t("login.description")}</p>
      <Button className={styles.action} onClick={() => sendMessage({ type: "login" })}>
        <IconArrowRight size={20} stroke={2.4} aria-hidden />
        {t("login.submit")}
      </Button>
    </>
  );
}
