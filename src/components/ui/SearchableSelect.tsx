"use client";
import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  searchPlaceholder = "Cari...",
  className,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = React.useMemo(() => {
    return options.filter((o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.value.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className="h-full min-h-[36px] w-full flex items-center justify-between px-3 py-1.5 rounded-md border border-input bg-background dark:bg-gray-800 text-sm hover:border-blue-500 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-blue-500/20 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <span className={`truncate ${selectedOption ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[240px] bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-2 border-b dark:border-gray-700 flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900/50">
            <Search className="h-3.5 w-3.5 text-gray-400 shrink-0 ml-1" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none text-xs outline-none focus:ring-0 p-1 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="h-3 w-3 text-gray-400" />
              </button>
            )}
          </div>
          <div className="max-h-[220px] overflow-y-auto p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-400 italic">
                Tidak ada hasil ditemukan.
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-md text-left transition-colors ${
                      isSelected
                        ? "bg-blue-500 text-white font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
