export type UiTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";
export type UiButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type UiButtonSize = "sm" | "md";

export const uiTokens = {
  radius: {
    card: "rounded-lg",
    control: "rounded-md",
    badge: "rounded-full",
  },
  shadow: {
    panel: "shadow-panel",
    none: "shadow-none",
  },
  typography: {
    pageTitle: "text-2xl font-black text-ink sm:text-3xl",
    sectionTitle: "text-base font-bold text-ink",
    helperText: "text-sm font-semibold text-slate-600",
    metaText: "text-xs font-bold text-slate-500",
  },
  layout: {
    page: "mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8",
    sectionGap: "grid gap-5",
    cardPadding: "p-4 sm:p-5",
  },
} as const;

export const buttonVariantClasses: Record<UiButtonVariant, string> = {
  primary: "border-accent bg-accent text-white hover:bg-teal-800",
  secondary: "border-line bg-white text-ink hover:bg-slate-50",
  ghost: "border-transparent bg-transparent text-slate-700 hover:bg-white/70",
  danger: "border-rose-200 bg-white text-decline hover:bg-rose-50",
};

export const buttonSizeClasses: Record<UiButtonSize, string> = {
  sm: "h-9 px-2 text-xs",
  md: "h-10 px-3 text-sm",
};

export const badgeToneClasses: Record<UiTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  primary: "border-teal-200 bg-teal-50 text-teal-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

export const alertToneClasses: Record<UiTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  primary: "border-teal-200 bg-teal-50 text-teal-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
  info: "border-sky-200 bg-sky-50 text-sky-950",
};

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function inputClassName(extra = ""): string {
  return cx(
    "min-h-10 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-teal-100",
    extra,
  );
}

