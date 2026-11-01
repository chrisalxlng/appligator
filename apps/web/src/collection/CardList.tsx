import { Badge, Tooltip, type BadgeTone } from "@appligator/ui";
import {
  useEffect,
  useEffectEvent,
  useId,
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
import a11y from "../styles/visuallyHidden.module.css";

const focusTargets: Record<string, (current: number, last: number) => number> = {
  ArrowDown: (current, last) => Math.min(current + 1, last),
  ArrowUp: (current) => Math.max(current - 1, 0),
  Home: () => 0,
  End: (_, last) => last,
};

function moveFocus(event: KeyboardEvent<HTMLElement>) {
  const target = focusTargets[event.key];
  if (!target || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

  const list = event.currentTarget.closest(`.${styles.container}`)!;
  const links = [...list.querySelectorAll<HTMLElement>("li > a")];
  event.preventDefault();
  links[target(links.indexOf(event.currentTarget), links.length - 1)]?.focus();
}

export interface CardItem {
  id: string;
  company: string;
  position: string;
  isNew?: boolean;
  pinned: boolean;
  createdAt: string;
}

// The list, including its pinned section, is a single tab stop: the focused card, else the opened
// one, else the first one.
function useTabStop(items: CardItem[], openedId: string | undefined) {
  const [focusedId, setFocusedId] = useState<string>();
  const tabStopId =
    [focusedId, openedId].find((id) => items.some((item) => item.id === id)) ?? items[0]?.id;

  function leaveList(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.closest(`.${styles.container}`)!.contains(event.relatedTarget)) {
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
  pinnedCollapsed: boolean;
  onPinnedCollapsedChange: (collapsed: boolean) => void;
  onEndReached?: () => void;
}

export function CardList<Item extends CardItem>({
  items,
  openedId,
  status,
  renderLink,
  pinnedCollapsed,
  onPinnedCollapsedChange,
  onEndReached,
}: CardListProps<Item>) {
  const { t } = useTranslation();
  const createdLabel = useCreatedLabel();
  const pinnedListId = useId();
  const pinnedItems = items.filter((item) => item.pinned);
  const otherItems = items.filter((item) => !item.pinned);
  const visibleItems = pinnedCollapsed ? otherItems : items;
  const { tabStopId, focusItem, leaveList } = useTabStop(visibleItems, openedId);

  function renderCards(sectionItems: Item[]) {
    return (
      <ul className={styles.list}>
        {sectionItems.map((item) => {
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
                    <span className={styles.position}>
                      {item.isNew && (
                        <Tooltip label={t("common.newHint")}>
                          <span className={styles.newIndicator}>
                            <span className={a11y.visuallyHidden}>{t("common.new")}</span>
                          </span>
                        </Tooltip>
                      )}
                      {item.position}
                    </span>
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
    );
  }

  return (
    <div className={styles.container}>
      {pinnedItems.length > 0 ? (
        <>
          <Section
            title={t("common.pinned")}
            count={pinnedItems.length}
            action={
              <button
                type="button"
                className={styles.sectionToggle}
                aria-label={t(pinnedCollapsed ? "common.showPinned" : "common.hidePinned")}
                aria-expanded={!pinnedCollapsed}
                aria-controls={pinnedCollapsed ? undefined : pinnedListId}
                onClick={() => onPinnedCollapsedChange(!pinnedCollapsed)}
              >
                {t(pinnedCollapsed ? "common.show" : "common.hide")}
              </button>
            }
          >
            {!pinnedCollapsed && <div id={pinnedListId}>{renderCards(pinnedItems)}</div>}
          </Section>
          {otherItems.length > 0 && (
            <Section title={t("common.unpinned")}>{renderCards(otherItems)}</Section>
          )}
        </>
      ) : (
        renderCards(items)
      )}
      {onEndReached && <EndTrigger onReached={onEndReached} />}
    </div>
  );
}

interface SectionProps {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}

function Section({ title, count, action, children }: SectionProps) {
  const titleId = useId();

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <div className={styles.sectionHeader}>
        <h2 id={titleId} className={styles.sectionTitle}>
          {title}
        </h2>
        {count !== undefined && <span className={styles.sectionCount}>{count}</span>}
        {action}
      </div>
      {children}
    </section>
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
