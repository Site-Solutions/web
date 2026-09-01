"use client";

/**
 * Shared UI primitives for the BuildSimpli web portal.
 * Hand-rolled Tailwind (no external UI lib) to match the existing codebase.
 * Brand color comes from `@/lib/colors` (orange in prod, purple in dev).
 */

import { forwardRef } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import Link from "next/link";
import { colors } from "@/lib/colors";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ----------------------------------------------------------------- Button */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      leftIcon,
      className,
      children,
      disabled,
      style,
      ...rest
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
    const variantClass =
      variant === "secondary"
        ? "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
        : variant === "danger"
          ? "bg-red-600 text-white hover:bg-red-700"
          : variant === "ghost"
            ? "bg-transparent text-gray-700 hover:bg-gray-100"
            : "text-white"; // primary handled via inline style
    return (
      <button
        ref={ref}
        className={cx(base, sizeClasses[size], variantClass, className)}
        disabled={disabled || loading}
        style={
          variant === "primary"
            ? { backgroundColor: colors.primary, ...style }
            : style
        }
        {...rest}
      >
        {loading ? <Spinner size={16} className="text-current" /> : leftIcon}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

/** Link styled as a button (for navigation). */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  leftIcon,
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors";
  const variantClass =
    variant === "secondary"
      ? "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
      : variant === "danger"
        ? "bg-red-600 text-white hover:bg-red-700"
        : variant === "ghost"
          ? "bg-transparent text-gray-700 hover:bg-gray-100"
          : "text-white";
  return (
    <Link
      href={href}
      className={cx(base, sizeClasses[size], variantClass, className)}
      style={variant === "primary" ? { backgroundColor: colors.primary } : undefined}
    >
      {leftIcon}
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------- Card */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-lg border border-gray-200 bg-white shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Badge */

type BadgeTone =
  | "gray"
  | "green"
  | "red"
  | "yellow"
  | "blue"
  | "purple"
  | "orange";

const toneClasses: Record<BadgeTone, string> = {
  gray: "bg-gray-100 text-gray-700",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  yellow: "bg-yellow-100 text-yellow-800",
  blue: "bg-blue-100 text-blue-800",
  purple: "bg-purple-100 text-purple-800",
  orange: "bg-orange-100 text-orange-800",
};

export function Badge({
  tone = "gray",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Maps common domain statuses to a sensible badge tone. */
export function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "").toLowerCase();
  let tone: BadgeTone = "gray";
  if (["complete", "completed", "paid", "resolved", "closed", "active", "done", "sent"].includes(s))
    tone = "green";
  else if (["void", "cancelled", "canceled", "overdue", "failed"].includes(s))
    tone = "red";
  else if (["incomplete", "pending", "draft", "open", "scheduled", "in_progress", "investigation"].includes(s))
    tone = "yellow";
  else if (["partial", "in progress"].includes(s)) tone = "blue";
  return <Badge tone={tone}>{status ?? "—"}</Badge>;
}

/* ----------------------------------------------------------------- Inputs */

const fieldClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-50 disabled:text-gray-500";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          {label}
          {required ? <span className="ml-0.5 text-red-500">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input ref={ref} className={cx(fieldClass, className)} {...rest} />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...rest }, ref) => (
  <textarea ref={ref} className={cx(fieldClass, className)} {...rest} />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...rest }, ref) => (
  <select ref={ref} className={cx(fieldClass, "bg-white", className)} {...rest}>
    {children}
  </select>
));
Select.displayName = "Select";

/* ------------------------------------------------------------------ Modal */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  if (!open) return null;
  const maxW =
    size === "sm"
      ? "max-w-sm"
      : size === "lg"
        ? "max-w-2xl"
        : size === "xl"
          ? "max-w-4xl"
          : "max-w-lg";
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cx(
          "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white shadow-xl",
          maxW
        )}
        role="dialog"
        aria-modal="true"
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null}
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </>
  );
}

/* ------------------------------------------------------- State components */

export function Spinner({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={cx("animate-spin", className)}
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
      <Spinner size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
      {icon ? <div className="mb-3 text-gray-400">{icon}</div> : null}
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------- PageHeader */

export function PageHeader({
  title,
  subtitle,
  backHref,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  backHref?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        ) : null}
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Standard page container width used across feature pages. */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

export { cx };
