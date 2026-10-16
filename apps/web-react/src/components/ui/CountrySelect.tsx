import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";
import { COUNTRIES, type CountryOption, getCountryByName } from "@accountiva/shared";
import { cn } from "@/lib/utils";

export interface CountrySelectProps {
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (country: CountryOption) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  value = "India",
  onChange,
  onSelect,
  disabled = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({
    top: "0px",
    left: "0px",
    width: "0px",
  });

  const selectedCountry = useMemo(() => {
    return getCountryByName(value) || COUNTRIES.find((c) => c.name === "India") || COUNTRIES[0];
  }, [value]);

  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.currency.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownMaxHeight = 280;
    const openUpwards = spaceBelow < dropdownMaxHeight && rect.top > dropdownMaxHeight;
    const calculatedLeft = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8));

    if (openUpwards) {
      setPopoverStyle({
        position: "fixed",
        bottom: `${window.innerHeight - rect.top + 4}px`,
        left: `${calculatedLeft}px`,
        width: `${rect.width}px`,
        maxHeight: `${Math.min(dropdownMaxHeight, rect.top - 16)}px`,
        zIndex: 99999,
      });
    } else {
      setPopoverStyle({
        position: "fixed",
        top: `${rect.bottom + 4}px`,
        left: `${calculatedLeft}px`,
        width: `${rect.width}px`,
        maxHeight: `${Math.min(dropdownMaxHeight, spaceBelow - 16)}px`,
        zIndex: 99999,
      });
    }
  }, []);

  const toggleDropdown = useCallback(() => {
    if (disabled) return;
    if (!isOpen) {
      window.dispatchEvent(new CustomEvent("close-all-selects"));
      setIsOpen(true);
      setSearchQuery("");
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setIsOpen(false);
    }
  }, [disabled, isOpen]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const timer = requestAnimationFrame(updatePosition);
      return () => cancelAnimationFrame(timer);
    }
  }, [isOpen, updatePosition]);

  const selectCountry = (country: CountryOption) => {
    onChange?.(country.name);
    onSelect?.(country);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      const popover = document.getElementById("country-select-popover");
      if (popover?.contains(target)) return;
      setIsOpen(false);
    };

    const handleScroll = (event: Event) => {
      if (!isOpen) return;
      const popover = document.getElementById("country-select-popover");
      if (popover && event.target instanceof Node && popover.contains(event.target)) {
        return;
      }
      updatePosition();
    };

    document.addEventListener("click", handleClickOutside);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        data-slot="country-select-trigger"
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 text-left cursor-pointer select-none",
          isOpen ? "border-ring ring-[3px] ring-ring/50" : "hover:border-input/80",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="text-base shrink-0 leading-none">{selectedCountry.flag || "🌐"}</span>
          <span className="text-sm font-medium text-foreground truncate">{selectedCountry.name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
            {selectedCountry.currency}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground opacity-50 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {isOpen &&
        createPortal(
          <div
            id="country-select-popover"
            style={popoverStyle}
            data-slot="country-select-popover"
            className="bg-popover text-popover-foreground border border-border/80 rounded-xl shadow-xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search bar */}
            <div className="p-2 border-b border-border/60 bg-muted/20">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search country or currency..."
                  className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-input rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground"
                />
              </div>
            </div>

            {/* Options list */}
            <div className="overflow-y-auto max-h-[220px] p-1 space-y-0.5">
              {filteredCountries.map((country) => (
                <div
                  key={country.code}
                  onClick={() => selectCountry(country)}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors",
                    selectedCountry.name === country.name
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm shrink-0 leading-none">{country.flag || "🌐"}</span>
                    <span className="truncate">{country.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground font-semibold">
                      {{ country }.country.currency}
                    </span>
                    {selectedCountry.name === country.name && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </div>
                </div>
              ))}

              {filteredCountries.length === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No countries found
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CountrySelect;
