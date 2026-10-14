"use client";

import { useState, useRef, useEffect } from "react";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

/**
 * Tag picker with suggestions: pick from existing tags or type a new one.
 * - `tags`: current string array; `onChange(next)` on add/remove.
 * - `suggestions`: existing tags to offer (already-selected ones hidden).
 * - Typing filters suggestions; Enter / Add commits manual entry.
 */
export function TagPicker({
  tags = [],
  onChange,
  suggestions = [],
  placeholder = "Type and press Enter",
  hint,
  className,
}) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const norm = (s) => (s || "").trim().toLowerCase();
  const selected = new Set(tags.map(norm));
  const q = input.trim().toLowerCase();
  const matches = (suggestions || [])
    .filter((s) => s && !selected.has(norm(s)) && (!q || norm(s).includes(q)))
    .slice(0, 8);

  const addTag = (val) => {
    const v = (val ?? input).trim();
    if (!v || selected.has(norm(v))) {
      setInput("");
      return;
    }
    onChange([...tags, v]);
    setInput("");
    setOpen(false);
  };

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag));

  return (
    <div className={cn("space-y-2", className)}>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Remove ${tag}`}
                className="hover:opacity-70"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative" ref={wrapRef}>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => addTag()}>
            Add
          </Button>
        </div>
        {open && (
          matches.length > 0 ? (
            <div className="absolute z-50 mt-1 max-h-44 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Existing tags
              </p>
              {matches.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addTag(s)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="truncate">{s}</span>
                  <Check size={14} className="shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
              <p className="text-xs text-muted-foreground">
                {suggestions.length > 0
                  ? q
                    ? `No match — press Enter to add “${input.trim()}” as a new tag`
                    : "All existing tags are already added"
                  : "No existing tags yet — type and press Enter to create the first one"}
              </p>
            </div>
          )
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
