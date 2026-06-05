import { ChevronDown } from "lucide-react";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ComboboxItem = {
  value: string;
  label: string;
  searchText?: string;
};

type ComboboxProps = {
  className?: string;
  disabled?: boolean;
  emptyText?: string;
  items: ComboboxItem[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  value: string;
};

export function Combobox({
  className,
  disabled = false,
  emptyText = "No item found.",
  items,
  onValueChange,
  placeholder = "Select item...",
  searchPlaceholder = "Search...",
  value
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);

    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) =>
      (item.searchText || item.label).toLowerCase().includes(normalizedQuery)
    );
  }, [items, query]);

  const selectedItem = items.find((item) => item.value === value) || null;

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button
        aria-expanded={open}
        className="flex w-full items-center justify-between font-normal"
        disabled={disabled}
        role="combobox"
        type="button"
        variant="outline"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span
          className={cn(
            "truncate text-left",
            selectedItem ? "text-ink-900" : "text-muted-foreground"
          )}
        >
          {selectedItem?.label || placeholder}
        </span>
        <ChevronDown
          className={cn("ml-2 h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </Button>

      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-hidden rounded-md border bg-white shadow-lg">
          <div className="border-b p-2">
            <Input
              autoFocus
              className="h-9"
              placeholder={searchPlaceholder}
              type="search"
              value={query}
              onChange={handleSearchChange}
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.value}
                  className={cn(
                    "block w-full border-b px-3 py-2 text-left text-sm last:border-b-0",
                    item.value === value
                      ? "bg-pup-maroon/10 text-pup-maroon"
                      : "text-ink-900 hover:bg-muted-100"
                  )}
                  type="button"
                  onClick={() => {
                    onValueChange(item.value === value ? "" : item.value);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  {item.label}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
