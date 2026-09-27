"use client";

import Link from "next/link";
import {
  Children,
  isValidElement,
  useEffect,
  useState,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowUpRight,
  Check,
  Compass,
  Info,
  Moon,
  Sun,
  X,
} from "@phosphor-icons/react";
import clsx from "clsx";
import { useLocale } from "../locale";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
}) {
  return (
    <button
      type="button"
      className={clsx(
        "button",
        `button-${variant}`,
        `button-${size}`,
        className,
      )}
      {...props}
    />
  );
}
export function LinkButton({
  children,
  href,
  variant = "primary",
  className,
  external = false,
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx("button", `button-${variant}`, className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {external && <ArrowUpRight size={17} />}
    </Link>
  );
}
export function IconButton({
  label,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={clsx("icon-button", className)}
      {...props}
    >
      {children}
    </button>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "positive" | "negative";
}) {
  return <span className={clsx("badge", `badge-${tone}`)}>{children}</span>;
}
export function Field({
  label,
  hint,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  const id = props.id || props.name;
  return (
    <div className={clsx("field", className)}>
      <label htmlFor={id}>{label}</label>
      <input
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={hint || error ? `${id}-hint` : undefined}
      />
      {(hint || error) && (
        <small id={`${id}-hint`} className={error ? "error-text" : "muted"}>
          {error || hint}
        </small>
      )}
    </div>
  );
}
export function Textarea({
  label,
  hint,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
}) {
  const id = props.id || props.name;
  return (
    <div className={clsx("field", className)}>
      <label htmlFor={id}>{label}</label>
      <textarea
        {...props}
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && (
        <small id={`${id}-hint`} className="muted">
          {hint}
        </small>
      )}
    </div>
  );
}
export function Select({
  label,
  className,
  children,
  value,
  onChange,
  id,
  name,
  disabled,
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const options = Children.toArray(children).flatMap((child) =>
    isValidElement<{ value?: string; children: ReactNode; disabled?: boolean }>(
      child,
    )
      ? [
          {
            value: String(child.props.value ?? child.props.children),
            label: child.props.children,
            disabled: child.props.disabled,
          },
        ]
      : [],
  );
  const empty = "__select_empty__";
  return (
    <div className={clsx("field", className)}>
      <label id={`${id}-label`} htmlFor={id}>
        {label}
      </label>
      <SelectPrimitive.Root
        name={name}
        value={String(value ?? "") || empty}
        disabled={disabled}
        onValueChange={(next) =>
          onChange?.({
            target: { value: next === empty ? "" : next },
            currentTarget: { value: next === empty ? "" : next },
          } as React.ChangeEvent<HTMLSelectElement>)
        }
      >
        <SelectPrimitive.Trigger
          id={id}
          className="select-trigger"
          aria-labelledby={`${id}-label`}
        >
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon>⌄</SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="select-content"
            position="popper"
            sideOffset={6}
          >
            <SelectPrimitive.ScrollUpButton className="select-scroll">
              ⌃
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport>
              {options.map((o) => (
                <SelectPrimitive.Item
                  className="select-item"
                  key={o.value}
                  value={o.value || empty}
                  disabled={o.disabled}
                >
                  <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check size={17} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="select-scroll">
              ⌄
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
export function Notice({
  children,
  title,
  tone = "info",
}: {
  children: ReactNode;
  title?: string;
  tone?: "info" | "error" | "success";
}) {
  return (
    <div
      className={clsx("notice", `notice-${tone}`)}
      role={tone === "error" ? "alert" : "note"}
    >
      {tone === "success" ? <Check size={19} /> : <Info size={19} />}
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const { t } = useLocale();
  const opener = useRef<HTMLElement | null>(null);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content
          onOpenAutoFocus={() => {
            opener.current = document.activeElement as HTMLElement | null;
          }}
          onCloseAutoFocus={(event) => {
            if (opener.current?.isConnected) {
              event.preventDefault();
              opener.current.focus();
            }
          }}
          className={clsx("dialog-content", wide && "dialog-wide")}
        >
          <header className="dialog-header">
            <div>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description>
                {description}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <IconButton label={t("Close dialog", "关闭弹窗")}>
                <X size={21} />
              </IconButton>
            </DialogPrimitive.Close>
          </header>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="Research Explorer home">
      <Compass size={31} weight="duotone" />
      <span>
        {compact ? (
          "Research Explorer"
        ) : (
          <>
            Research <span className="brand-second">Explorer</span>
          </>
        )}
      </span>
    </Link>
  );
}
export function ThemeToggle() {
  const { t } = useLocale();
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const query = matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem("research-theme");
      } catch {}
      const next = saved === "dark";
      setDark(next);
      document.documentElement.dataset.theme = next ? "dark" : "light";
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return (
    <IconButton
      label={
        dark
          ? t("Use light theme", "切换浅色主题")
          : t("Use dark theme", "切换深色主题")
      }
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.dataset.theme = next ? "dark" : "light";
        try {
          localStorage.setItem("research-theme", next ? "dark" : "light");
        } catch {}
      }}
    >
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </IconButton>
  );
}
