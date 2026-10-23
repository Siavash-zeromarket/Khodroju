"use client";

import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + window.scrollY + 4, // mt-1 = 4px
        left: rect.left + window.scrollX,
        width: rect.width,
        minWidth: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      updateDropdownPosition();
      requestAnimationFrame(() => inputRef.current?.focus());
      window.addEventListener("scroll", updateDropdownPosition);
      window.addEventListener("resize", updateDropdownPosition);
    }
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition);
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
      className="bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden"
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
      <div className="max-h-56 overflow-y-auto overscroll-contain py-1">
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