"use client";
import * as React from "react";
import { X, Check, ChevronsUpDown } from "lucide-react";
import Badge from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Pilih...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedOptions = options.filter((o) => selected.includes(o.value));
  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const removeOption = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((v) => v !== value));
  };

  return (
    <div className={className}>
      <div
        className="min-h-10 w-full flex flex-wrap items-center gap-1.5 p-1.5 rounded-none border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.02] cursor-pointer hover:border-brand-400 transition-all"
        onClick={() => setOpen(true)}
      >
        {selectedOptions.length === 0 && (
          <span className="text-sm text-gray-400 px-2">{placeholder}</span>
        )}
        {selectedOptions.map((option) => (
          <Badge
            key={option.value}
            color="primary"
            className="flex items-center gap-1 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 border-brand-100 dark:border-brand-500/20 px-2 py-0.5"
          >
            {option.label}
            <X
              className="h-3 w-3 cursor-pointer hover:text-brand-900"
              onClick={(e) => removeOption(option.value, e)}
            />
          </Badge>
        ))}
        <div className="ml-auto pr-1">
          <ChevronsUpDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b dark:border-gray-800">
            <DialogTitle>Pilih Approver</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div className="relative">
              <Input
                placeholder="Cari..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-3"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
              {filteredOptions.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500">
                  Tidak ada hasil ditemukan.
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      className={`flex items-center justify-between px-3 py-2 rounded-none cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400"
                          : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                      }`}
                      onClick={() => toggleOption(option.value)}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                      {isSelected && <Check className="h-4 w-4" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-white/[0.02] border-t dark:border-gray-800 flex justify-end">
            <Button size="sm" onClick={() => setOpen(false)}>
              Selesai
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
