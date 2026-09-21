import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Search, X, User } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: string;
  emptyLabel?: string;
  id?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = "Select...",
  helperText,
  error,
  emptyLabel = "None — enter details manually",
  id,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = searchQuery.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    if (isOpen) setSearchQuery("");
  };

  const handleSelect = useCallback(
    (optValue: string) => {
      onChange(optValue);
      setIsOpen(false);
      setSearchQuery("");
    },
    [onChange]
  );

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchQuery("");
  };

  return (
    <div className="w-full space-y-1.5" ref={containerRef}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          id={selectId}
          disabled={disabled}
          onClick={handleToggle}
          className={`w-full flex items-center justify-between gap-2 bg-background border rounded-lg px-3.5 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-sm transition-all ${
            error ? "border-destructive focus:ring-destructive/30" : "border-input"
          } ${disabled ? "opacity-50 cursor-not-allowed bg-muted/50" : "cursor-pointer hover:border-primary/50"} ${
            isOpen ? "ring-2 ring-primary/30 border-primary" : ""
          }`}
        >
          <span className="truncate flex-1">
            {value === "" ? (
              <span className="text-muted-foreground italic text-xs">{emptyLabel}</span>
            ) : selectedOption ? (
              <span className="flex items-center gap-2 text-foreground">
                <User className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                {selectedOption.label}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => e.key === "Enter" && handleClear(e as any)}
                className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear selection"
              >
                <X className="w-3 h-3" />
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1.5 w-full bg-card border border-border rounded-xl shadow-2xl shadow-black/20 overflow-hidden">
            <div className="p-2 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2 bg-background border border-input rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${options.length} customer${options.length !== 1 ? "s" : ""}...`}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none min-w-0"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto overscroll-contain">
              <button
                type="button"
                onClick={() => handleSelect("")}
                className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors flex items-center gap-2 border-b border-border/50 ${
                  value === ""
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <span className="italic text-xs">{emptyLabel}</span>
              </button>

              {filteredOptions.length === 0 ? (
                <div className="px-3.5 py-6 text-center text-sm text-muted-foreground">
                  <Search className="w-5 h-5 mx-auto mb-2 opacity-40" />
                  <p>No results for <strong>&ldquo;{searchQuery}&rdquo;</strong></p>
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                      value === opt.value
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                ))
              )}
            </div>

            {filteredOptions.length > 0 && (
              <div className="px-3.5 py-1.5 border-t border-border bg-muted/20 text-[10px] text-muted-foreground flex items-center justify-between">
                <span>
                  {searchQuery ? `${filteredOptions.length} of ${options.length} results` : `${options.length} customers`}
                </span>
                {searchQuery && <span className="text-primary font-medium">Filtered</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-destructive font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
};

SearchableSelect.displayName = "SearchableSelect";