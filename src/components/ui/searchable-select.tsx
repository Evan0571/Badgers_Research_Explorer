"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";

type Option = { value: string; label: string };
const normalize = (value: string) =>
  value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();

export function SearchableSelect({
  id,
  label,
  value,
  options,
  onChange,
  placeholder,
  emptyText,
}: {
  id: string;
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder: string;
  emptyText: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selected = options.find((option) => option.value === value);
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const filtered = options.filter((option) =>
    terms.every((term) => normalize(option.label).includes(term)),
  );
  const activeIndex = Math.min(active, filtered.length - 1);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      list.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open, query]);

  const show = () => {
    setQuery("");
    setActive(0);
    setOpen(true);
  };
  const choose = (option: Option) => {
    onChange(option.value);
    setOpen(false);
    setQuery("");
  };

  return (
    <div
      className="field searchable-select"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="searchable-select-control">
        <input
          id={id}
          ref={input}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          aria-activedescendant={
            open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
          }
          autoComplete="off"
          placeholder={open ? placeholder : selected?.label || placeholder}
          value={open ? query : selected?.label || ""}
          onFocus={show}
          onClick={() => {
            if (!open) show();
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!open) {
                show();
                return;
              }
              const step = event.key === "ArrowDown" ? 1 : -1;
              setActive((previous) =>
                Math.max(0, Math.min(filtered.length - 1, previous + step)),
              );
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              if (filtered[activeIndex]) choose(filtered[activeIndex]);
            } else if (event.key === "Escape" && open) {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
            } else if (event.key === "Tab") {
              setOpen(false);
            }
          }}
        />
        <CaretDown size={16} aria-hidden="true" />
      </div>
      {open && (
        <div className="searchable-select-popup">
          <ul ref={list} id={`${id}-options`} role="listbox" aria-label={label}>
            {filtered.map((option, index) => (
              <li
                key={option.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                data-active={index === activeIndex}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <Check size={17} aria-hidden="true" />
                )}
              </li>
            ))}
          </ul>
          {!filtered.length && <p role="status">{emptyText}</p>}
        </div>
      )}
    </div>
  );
}
