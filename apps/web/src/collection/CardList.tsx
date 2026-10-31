import { Badge, type BadgeTone } from "@appligator/ui";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import styles from "./CardList.module.css";
import { useCreatedLabel } from "./useCreatedLabel.ts";
import a11y from "./visuallyHidden.module.css";

const focusTargets: Record<string, (current: number, last: number) => number> = {
  ArrowDown: (current, last) => Math.min(current + 1, last),
  ArrowUp: (current) => Math.max(current - 1, 0),
  Home: () => 0,
  End: (_, last) => last,
};

function moveFocus(event: KeyboardEvent<HTMLElement>) {
  const target = focusTargets[event.key];
  if (!target || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

  const links = [...event.currentTarget.closest("ul")!.querySelectorAll<HTMLElement>("a")];
  event.preventDefault();
  links[target(links.indexOf(event.currentTarget), links.length - 1)]?.focus();
}

export interface CardItem {
  id: string;
  company: string;
  position: string;
  isNew?: boolean;
  createdAt: string;
}

// The list is a single tab stop: the focused card, else the opened one, else the first one.
function useTabStop(items: CardItem[], openedId: string | undefined) {
  const [focusedId, setFocusedId] = useState<string>();
  const tabStopId =
    [focusedId, openedId].find((id) => items.some((item) => item.id === id)) ?? items[0]?.id;

  function leaveList(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.closest("ul")!.contains(event.relatedTarget)) {
      setFocusedId(undefined);
    }
  }

  return { tabStopId, focusItem: setFocusedId, leaveList };
}

interface CardLinkProps {
  className: string;
  tabIndex: number;
  onFocus: () => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  children: ReactNode;
}

interface CardListProps<Item extends CardItem> {
  items: Item[];
  openedId: string | undefined;
  status: (item: Item) => { label: string; tone: BadgeTone };
  renderLink: (item: Item, props: CardLinkProps) => ReactElement;
  onEndReached?: () => void;
}

export function CardList<Item extends CardItem>({
  items,
  openedId,
  status,
  renderLink,
  onEndReached,
}: CardListProps<Item>) {
  const { t } = useTranslation();
  const createdLabel = useCreatedLabel();
  const { tabStopId, focusItem, leaveList } = useTabStop(items, openedId);

  return (
    <div className={styles.container}>
      <ul className={styles.list}>
        {items.map((item) => {
          const { label, tone } = status(item);
          return (
            <li key={item.id}>
              {renderLink(item, {
                className: styles.card,
                tabIndex: item.id === tabStopId ? 0 : -1,
                onFocus: () => focusItem(item.id),
                onBlur: leaveList,
                onKeyDown: moveFocus,
                children: (
                  <>
                    {item.isNew && (
                      <span className={styles.newIndicator}>
                        <span className={a11y.visuallyHidden}>{t("common.new")}</span>
                      </span>
                    )}
                    <span className={styles.position}>{item.position}</span>
                    <span className={styles.company}>{item.company}</span>
                    <span className={styles.footer}>
                      <span className={styles.created}>{createdLabel(item.createdAt)}</span>
                      <Badge tone={item.id === openedId ? "active" : tone}>{label}</Badge>
                    </span>
                  </>
                ),
              })}
            </li>
          );
        })}
      </ul>
      {onEndReached && <EndTrigger onReached={onEndReached} />}
    </div>
  );
}

function EndTrigger({ onReached }: { onReached: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const reach = useEffectEvent(onReached);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) reach();
    });
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className={styles.endTrigger} aria-hidden />;
}
