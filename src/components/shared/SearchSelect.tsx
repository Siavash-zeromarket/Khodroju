"use client";

import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DROPDOWN_LIST_MAX_HEIGHT = 224; // ≈ Tailwind max-h-56
const DROPDOWN_LIST_MIN_HEIGHT = 96;
const DROPDOWN_SEARCH_ROW_HEIGHT = 40; // search input row + bottom border
const DROPDOWN_ESTIMATED_HEIGHT = 280; // search row + max list + margins
const DROPDOWN_MIN_WIDTH = 160;
const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 4;

interface SearchSelectProps {
  id?: string;
  label?: string;
  value: string;
  options: string[];
  placeholder?: string;
  emptyText?: string;
  loading?: boolean;
  loadingText?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SearchSelect({
  id,
  label,
  value,
  options,
  placeholder = "انتخاب کنید…",
  emptyText = "موردی یافت نشد",
  loading = false,
  loadingText = "در حال بارگذاری…",
  onChange,
  disabled = false,
  className,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [listMaxHeight, setListMaxHeight] = useState(DROPDOWN_LIST_MAX_HEIGHT);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const highlightMatch = useCallback(
    (text: string) => {
      const q = query.trim();
      if (!q) return text;
      const idx = text.toLowerCase().indexOf(q.toLowerCase());
      if (idx === -1) return text;
      return (
        <>
          {text.slice(0, idx)}
          <mark className="bg-primary/15 text-primary rounded-sm px-0.5">
            {text.slice(idx, idx + q.length)}
          </mark>
          {text.slice(idx + q.length)}
        </>
      );
    },
    [query],
  );

  const updateDropdownPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const width = Math.max(rect.width, DROPDOWN_MIN_WIDTH);
    const spaceBelow = viewportHeight - rect.bottom - TRIGGER_GAP;
    const spaceAbove = rect.top - TRIGGER_GAP;
    const openUp =
      spaceBelow < DROPDOWN_ESTIMATED_HEIGHT && spaceAbove > spaceBelow;

    const available = openUp ? spaceAbove : spaceBelow;
    const nextListMaxHeight = Math.min(
      DROPDOWN_LIST_MAX_HEIGHT,
      Math.max(
        DROPDOWN_LIST_MIN_HEIGHT,
        available - DROPDOWN_SEARCH_ROW_HEIGHT,
      ),
    );

    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rect.left),
      Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN),
    );

    setListMaxHeight(nextListMaxHeight);
    setDropdownStyle({
      position: "fixed",
      width,
      left,
      ...(openUp
        ? { top: "auto", bottom: viewportHeight - rect.top + TRIGGER_GAP }
        : { top: rect.bottom + TRIGGER_GAP, bottom: "auto" }),
    });
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      updateDropdownPosition();
      requestAnimationFrame(() => inputRef.current?.focus());
      window.addEventListener("scroll", updateDropdownPosition, true);
      window.addEventListener("resize", updateDropdownPosition);
    }
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        // Also check if click is inside the portal dropdown
        const dropdown = document.querySelector("[data-search-select-dropdown]");
        if (dropdown && dropdown.contains(e.target as Node)) return;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  const select = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const dropdownContent = (
    <div
      data-search-select-dropdown
      ref={listRef}
      className="fixed z-[60] overflow-hidden bg-popover border border-border rounded-lg shadow-lg"
      style={dropdownStyle}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Search size={14} className="shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجو…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          dir="rtl"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div
        className="overflow-y-auto overscroll-contain py-1"
        style={{ maxHeight: listMaxHeight }}
      >
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => select(opt)}
              className={`w-full text-right px-4 py-2 text-sm transition-colors duration-100 ${
                opt === value
                  ? "bg-primary/10 text-primary font-600"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {highlightMatch(opt)}
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={className ?? ""}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-bold text-foreground mb-1.5"
        >
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled || loading}
        onClick={() => !disabled && !loading && setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 vazir-matn ${
          value ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <span className="truncate">
          {loading ? loadingText : value || placeholder}
        </span>
        {loading ? (
          <Loader2
            size={16}
            className="shrink-0 text-muted-foreground animate-spin"
          />
        ) : (
          <ChevronDown
            size={16}
            className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && createPortal(dropdownContent, document.body)}
    </div>
  );
}