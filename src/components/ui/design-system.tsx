import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  alertToneClasses,
  badgeToneClasses,
  buttonSizeClasses,
  buttonVariantClasses,
  cx,
  inputClassName,
  uiTokens,
  type UiButtonSize,
  type UiButtonVariant,
  type UiTone,
} from "./tokens";

export { cx, inputClassName };
export type { UiButtonSize, UiButtonVariant, UiTone };

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-surface">
      <div className={uiTokens.layout.page}>{children}</div>
    </main>
  );
}

export function PageHeader({
  title,
  eyebrow = "Stock Research MVP",
  description,
  actions,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">{eyebrow}</p> : null}
        <h1 className={cx("mt-1", uiTokens.typography.pageTitle)}>{title}</h1>
        {description ? <p className={cx("mt-2 max-w-3xl", uiTokens.typography.helperText)}>{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
    </header>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  ...props
}: HTMLAttributes<HTMLElement> & {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <section {...props} className={cx("rounded-lg border border-line bg-white p-4 shadow-panel sm:p-5", className)}>
      {title || description || actions ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className={uiTokens.typography.sectionTitle}>{title}</h2> : null}
            {description ? <p className={cx("mt-1", uiTokens.typography.helperText)}>{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cx(title || description || actions ? "mt-4" : "", contentClassName)}>{children}</div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  tone = "neutral",
  testId,
}: {
  label: string;
  value: ReactNode;
  tone?: UiTone;
  testId?: string;
}) {
  return (
    <div data-testid={testId} className={cx("rounded-lg border bg-white p-4", badgeToneClasses[tone])}>
      <p className="text-xs font-bold uppercase tracking-[0.08em] opacity-80">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
  testId,
  className,
}: {
  children: ReactNode;
  tone?: UiTone;
  testId?: string;
  className?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cx("inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-bold", badgeToneClasses[tone], className)}
    >
      {children}
    </span>
  );
}

export function ActionButton({
  children,
  icon: Icon,
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  variant?: UiButtonVariant;
  size?: UiButtonSize;
}) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariantClasses[variant],
        buttonSizeClasses[size],
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="h-4 w-4 shrink-0" /> : null}
      <span className="truncate">{children}</span>
    </button>
  );
}

export function ActionGroup({
  children,
  align = "start",
  className,
}: {
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  return <div className={cx("flex flex-wrap gap-2", align === "end" && "justify-end", className)}>{children}</div>;
}

export function InfoAlert({
  children,
  tone = "info",
  testId,
  className,
}: {
  children: ReactNode;
  tone?: UiTone;
  testId?: string;
  className?: string;
}) {
  return (
    <div data-testid={testId} className={cx("rounded-lg border px-4 py-3 text-sm font-semibold", alertToneClasses[tone], className)}>
      {children}
    </div>
  );
}

export function EmptyState({
  title = "データ不足",
  description,
  icon: Icon,
  children,
  testId,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <div data-testid={testId} className="grid min-h-32 place-items-center rounded-lg border border-dashed border-line bg-white px-6 py-8 text-center">
      <div>
        {Icon ? <Icon aria-hidden className="mx-auto h-9 w-9 text-slate-400" /> : null}
        <p className="text-sm font-bold text-slate-700">{title}</p>
        {description ? <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p> : null}
        {children ? <div className="mt-3">{children}</div> : null}
      </div>
    </div>
  );
}

export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("grid gap-3 rounded-lg border border-line bg-white p-4 shadow-panel", className)}>{children}</div>;
}

export function DataTable({
  children,
  minWidth = "720px",
  testId,
  className,
}: {
  children: ReactNode;
  minWidth?: string;
  testId?: string;
  className?: string;
}) {
  return (
    <div className={cx("overflow-x-auto rounded-md border border-line", className)}>
      <table data-testid={testId} className="w-full border-collapse text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false,
  className,
  testId,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <details data-testid={testId} open={defaultOpen} className={cx("rounded-lg border border-line bg-white p-4 shadow-panel", className)}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span className={uiTokens.typography.sectionTitle}>{title}</span>
          <span className={uiTokens.typography.metaText}>クリックで開閉</span>
        </div>
        {description ? <p className={cx("mt-1", uiTokens.typography.helperText)}>{description}</p> : null}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
