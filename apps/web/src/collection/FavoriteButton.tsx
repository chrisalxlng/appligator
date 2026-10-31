import { IconButton } from "@appligator/ui";
import { IconStar, IconStarFilled } from "@tabler/icons-react";
import type { UseMutationResult } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import styles from "./FavoriteButton.module.css";

interface FavoriteButtonProps {
  favorite: boolean;
  markFavorite: UseMutationResult<void, Error, boolean>;
}

// Shows the requested state while it is being saved, so the star responds to the click at once.
export function FavoriteButton({ favorite, markFavorite }: FavoriteButtonProps) {
  const { t } = useTranslation();
  const isFavorite = markFavorite.isPending ? markFavorite.variables : favorite;

  return (
    <IconButton
      variant="surface"
      label={t("common.markFavorite")}
      aria-pressed={isFavorite}
      onClick={() => markFavorite.mutate(!isFavorite)}
    >
      {isFavorite ? (
        <IconStarFilled size={20} className={styles.star} aria-hidden />
      ) : (
        <IconStar size={20} stroke={2} aria-hidden />
      )}
    </IconButton>
  );
}
