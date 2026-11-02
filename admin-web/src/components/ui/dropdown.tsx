"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Search } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type DropdownOption<T extends string = string> = {
  value: T;
  label: string;
  /** Second line under the label (e.g. a phone number or seats left). */
  description?: string;
  /** Small leading element: a colour dot, avatar or icon. */
  icon?: React.ReactNode;
  disabled?: boolean;
};

type Placement = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

const noopSubscribe = () => () => {};
const GAP = 6;
const MAX_HEIGHT = 288;

/**
 * Styled replacement for `<select>`: a button that opens an animated list in a portal, so it
 * isn't clipped by modals or drawers and flips upward near the bottom of the screen.
 *
 * Keyboard: Enter/Space/↓/↑ open, ↑/↓/Home/End move, Enter picks, Escape closes (without
 * closing the modal behind it), Tab leaves. Typing jumps to a matching option; lists of more
 * than 8 options get a search box (`searchable` forces it on or off).
 */
export function Dropdown<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Choose…",
  disabled,
  searchable,
  className,
  id,
  "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const autoId = useId();
  const listId = `${autoId}-list`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ text: "", at: 0 });

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [place, setPlace] = useState<Placement | null>(null);

  const withSearch = searchable ?? options.length > 8;
  const selected = options.find((o) => o.value === value);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.description ?? ""}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - GAP - 8;
    const above = r.top - GAP - 8;
    const width = Math.min(Math.max(r.width, 200), window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    const up = below < 220 && above > below;
    setPlace(
      up
        ? { left, width, bottom: window.innerHeight - r.top + GAP, maxHeight: Math.min(MAX_HEIGHT, above) }
        : { left, width, top: r.bottom + GAP, maxHeight: Math.min(MAX_HEIGHT, below) },
    );
  }, []);

  const openList = (start?: "first" | "last") => {
    if (disabled) return;
    measure();
    setQuery("");
    const current = options.findIndex((o) => o.value === value);
    const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
    setActive(start === "first" ? enabled[0] ?? -1 : start === "last" ? enabled.at(-1) ?? -1 : current >= 0 ? current : enabled[0] ?? -1);
    setOpen(true);
  };

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  const pick = (option: DropdownOption<T> | undefined) => {
    if (!option || option.disabled) return;
    if (option.value !== value) onChange(option.value);
    close();
  };

  // Follow the trigger while open (the modal body or page may scroll); close on outside press.
  useLayoutEffect(() => {
    if (!open) return;
    const onMove = () => measure();
    const onPress = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !listRef.current?.parentElement?.contains(target)) close(false);
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    document.addEventListener("pointerdown", onPress, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      document.removeEventListener("pointerdown", onPress, true);
    };
  }, [open, measure, close]);

  // Focus the search box (or keep focus on the trigger) and keep the active option in view.
  useEffect(() => {
    if (open && withSearch) searchRef.current?.focus({ preventScroll: true });
  }, [open, withSearch]);
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const move = (from: number, step: 1 | -1) => {
    const list = withSearch ? visible : options;
    if (!list.length) return -1;
    let i = from;
    for (let n = 0; n < list.length; n++) {
      i = (i + step + list.length) % list.length;
      if (!list[i].disabled) return i;
    }
    return from;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const list = withSearch ? visible : options;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList(e.key === "ArrowUp" ? "last" : undefined);
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        // Stop here so a modal/drawer behind the list stays open.
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      case "Tab":
        close(false);
        return;
      case "ArrowDown":
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => move(i, e.key === "ArrowDown" ? 1 : -1));
        return;
      case "Home":
      case "End":
        if (withSearch) return; // let the search box move its caret
        e.preventDefault();
        setActive(e.key === "Home" ? move(-1, 1) : move(list.length, -1));
        return;
      case "Enter":
        e.preventDefault();
        pick(list[active]);
        return;
      case " ":
        if (withSearch) return;
        e.preventDefault();
        pick(list[active]);
        return;
    }
    // Type-ahead when there's no search box: jump to the next option starting with the typed text.
    if (!withSearch && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const now = Date.now();
      const t = typeahead.current;
      t.text = now - t.at > 700 ? e.key.toLowerCase() : t.text + e.key.toLowerCase();
      t.at = now;
      const start = active + (t.text.length === 1 ? 1 : 0);
      for (let n = 0; n < options.length; n++) {
        const i = (start + n) % options.length;
        if (!options[i].disabled && options[i].label.toLowerCase().startsWith(t.text)) {
          setActive(i);
          break;
        }
      }
    }
  };

  const activeOption = (withSearch ? visible : options)[active];

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && !withSearch && activeOption ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "group flex h-10 w-full min-w-0 cursor-pointer items-center gap-2 rounded-xl border bg-surface px-3.5 text-left text-sm outline-none transition-all duration-200",
          open ? "border-primary ring-4 ring-[var(--ring)]" : "border-line hover:border-line-strong focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-[var(--ring)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        {selected?.icon && <span className="flex shrink-0 items-center">{selected.icon}</span>}
        <span className={cn("min-w-0 flex-1 truncate", selected ? "text-ink" : "text-muted")}>{selected?.label ?? placeholder}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 420, damping: 28 }} className="shrink-0 text-muted group-hover:text-ink-2">
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && place && (
              <motion.div
                initial={{ opacity: 0, y: place.top !== undefined ? -6 : 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: place.top !== undefined ? -4 : 4, scale: 0.98, transition: { duration: 0.12 } }}
                transition={{ type: "spring", stiffness: 520, damping: 34 }}
                style={{
                  position: "fixed",
                  left: place.left,
                  width: place.width,
                  top: place.top,
                  bottom: place.bottom,
                  maxHeight: place.maxHeight,
                  transformOrigin: place.top !== undefined ? "top" : "bottom",
                }}
                className="z-[70] flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lift"
                onKeyDown={withSearch ? onKeyDown : undefined}
              >
                {withSearch && (
                  <div className="flex shrink-0 items-center gap-2 border-b border-line px-3">
                    <Search className="h-4 w-4 shrink-0 text-muted" />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setActive(0);
                      }}
                      placeholder="Search…"
                      role="searchbox"
                      aria-controls={listId}
                      aria-activedescendant={activeOption ? `${listId}-${active}` : undefined}
                      className="h-10 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                    />
                  </div>
                )}
                <ul ref={listRef} id={listId} role="listbox" aria-label={ariaLabel} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
                  {(withSearch ? visible : options).map((option, index) => {
                    const isSelected = option.value === value;
                    const isActive = index === active;
                    return (
                      <motion.li
                        key={option.value || "__empty"}
                        id={`${listId}-${index}`}
                        data-index={index}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={option.disabled || undefined}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(index, 10) * 0.018 }}
                        onPointerMove={() => !option.disabled && active !== index && setActive(index)}
                        onClick={() => pick(option)}
                        className={cn(
                          "relative flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm select-none",
                          option.disabled ? "cursor-not-allowed opacity-45" : isSelected ? "text-primary-dark" : "text-ink",
                        )}
                      >
                        {isActive && !option.disabled && (
                          <motion.span
                            layoutId={`${listId}-hover`}
                            className="absolute inset-0 rounded-xl bg-primary-soft/70"
                            transition={{ type: "spring", stiffness: 600, damping: 40 }}
                          />
                        )}
                        {option.icon && <span className="relative flex shrink-0 items-center">{option.icon}</span>}
                        <span className="relative min-w-0 flex-1">
                          <span className={cn("block truncate", isSelected && "font-semibold")}>{option.label}</span>
                          {option.description && <span className="block truncate text-xs text-muted">{option.description}</span>}
                        </span>
                        <AnimatePresence>
                          {isSelected && (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="relative shrink-0 text-primary">
                              <Check className="h-4 w-4" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.li>
                    );
                  })}
                  {withSearch && !visible.length && <li className="px-3 py-6 text-center text-sm text-muted">No matches</li>}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
