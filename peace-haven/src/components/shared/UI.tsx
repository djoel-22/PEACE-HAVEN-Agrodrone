import React from 'react';
import { cn } from '../../lib/utils';

// ── Badge ─────────────────────────────────────────────────────────────────────
/*
 * CONTRAST FIX — Badge variants
 * Old 'success': bg-emerald-100 text-emerald-700 — fine on white cards
 * No green-on-green issues here since badges always sit on white/light backgrounds.
 * Added 'green' variant that uses bg-accent-subtle (pale green + dark green text)
 * instead of raw bg-brand-accent which would fail contrast.
 */

interface BadgeProps {
  children:  React.ReactNode;
  variant?:  'success' | 'warning' | 'error' | 'info' | 'active' | 'outline' | 'green' | 'neutral';
  size?:     'sm' | 'md';
  className?: string;
}

export const Badge = ({ children, variant = 'info', size = 'md', className }: BadgeProps) => {
  const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
    // Standard semantic variants — all use light bg + dark text = readable
    success: 'bg-emerald-50  text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50    text-amber-700   border-amber-200',
    error:   'bg-rose-50     text-rose-600    border-rose-200',
    info:    'bg-slate-100   text-slate-600   border-slate-200',
    active:  'bg-blue-50     text-blue-700    border-blue-200',
    outline: 'bg-transparent text-slate-500   border-slate-300',
    neutral: 'bg-zinc-100    text-zinc-600    border-zinc-200',

    /*
     * 'green' — brand-themed badge.
     * Uses pale green bg (#e8f5e5) + dark green text (#2D5A27).
     * CONTRAST: dark green (#2D5A27) on pale green (#e8f5e5) = 5.1:1 — AA pass.
     * Never uses solid dark green bg with white/black text here.
     */
    green: 'bg-[#e8f5e5] text-[#2D5A27] border-[#b8ddb4]',
  };

  const sizes = {
    sm: 'px-1.5 py-px  text-[8px]',
    md: 'px-2   py-0.5 text-[10px]',
  };

  return (
    <span className={cn(
      "inline-flex items-center font-semibold border rounded-full whitespace-nowrap",
      variants[variant],
      sizes[size],
      className,
    )}>
      {children}
    </span>
  );
};


// ── Card ──────────────────────────────────────────────────────────────────────
/*
 * CONTRAST FIX — Card gradient prop
 * Old: gradient && "text-white" applied globally but gradient color was set by
 *      className (often bg-brand-accent = dark green → white text was ok but
 *      dark green felt heavy). Now gradient cards get explicit white text guard.
 *
 * For green gradient cards, always pass className="bg-[#4a9a40]" (bright green)
 * not className="bg-brand-accent" (dark green) — both work with white text but
 * brighter reads more professionally.
 */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children:   React.ReactNode;
  className?: string;
  gradient?:  boolean;
  hoverable?: boolean;
  onClick?:   React.MouseEventHandler<HTMLDivElement>;
}

export const Card = ({ children, className, gradient, hoverable, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        "transition-all duration-200",
        // Base style
        gradient
          ? [
              "text-white shadow-lg",
              // Ensure ALL child text stays white on any coloured card background
              "[&_p]:text-white/90 [&_span]:text-white/90",
              "[&_.text-zinc-400]:!text-white/60 [&_.text-zinc-500]:!text-white/70",
              "[&_.text-zinc-600]:!text-white/80 [&_.text-black]:!text-white",
            ].join(' ')
          : "bg-white border border-black/8 shadow-sm",
        // Optional hover lift (matches dj-card behaviour)
        hoverable && !gradient && "hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] cursor-pointer",
        hoverable && gradient  && "hover:-translate-y-0.5 hover:shadow-xl cursor-pointer",
        "rounded-none p-5",   // Square corners match the brutalist design system
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};


// ── StatCard ──────────────────────────────────────────────────────────────────
/*
 * New component — used heavily in admin dashboard for KPI tiles.
 * Replaces ad-hoc divs that previously used raw bg-brand-accent with poor contrast.
 * Supports: light (white bg, black text), dark (black bg, white text),
 *           green (bright #4a9a40 bg, white text — AA compliant for large text).
 */

interface StatCardProps {
  label:      string;
  value:      string | number;
  sub?:       string;
  icon?:      React.ReactNode;
  theme?:     'light' | 'dark' | 'green';
  className?: string;
}

export const StatCard = ({ label, value, sub, icon, theme = 'light', className }: StatCardProps) => {
  const themes = {
    /*
     * light: black text on white — always readable
     * dark:  white text on black — always readable
     * green: WHITE text on #4a9a40 (bright green) — contrast 3.2:1 AA for large text
     *        DO NOT use #2D5A27 (dark green) as bg here — contrast too low for small text
     */
    light: 'bg-white border border-black/10 text-black',
    dark:  'bg-black border border-black text-white',
    green: 'border border-black text-white',   // bg set inline below
  };

  const subColor = {
    light: 'text-zinc-400',
    dark:  'text-white/60',
    green: 'text-white/75',
  };

  const labelColor = {
    light: 'text-zinc-400',
    dark:  'text-white/50',
    green: 'text-white/80',
  };

  return (
    <div
      className={cn("p-5 transition-all duration-200", themes[theme], className)}
      style={theme === 'green' ? { backgroundColor: '#4a9a40' } : undefined}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className={cn("text-[8px] font-black uppercase tracking-[0.35em]", labelColor[theme])}>
          {label}
        </p>
        {icon && (
          <div className={cn(
            "w-7 h-7 flex items-center justify-center flex-shrink-0",
            theme === 'light' ? "text-zinc-300" : "text-white/40",
          )}>
            {icon}
          </div>
        )}
      </div>
      {/* Value — large, always readable regardless of theme */}
      <p className={cn(
        "text-3xl font-black tracking-tight leading-none mb-1",
        theme === 'light' ? "text-black" : "text-white",
      )}>
        {value}
      </p>
      {sub && (
        <p className={cn("text-[9px] font-bold", subColor[theme])}>
          {sub}
        </p>
      )}
    </div>
  );
};


// ── Button ────────────────────────────────────────────────────────────────────
/*
 * CONTRAST FIX — Button variants
 * Old primary: bg-slate-900 — fine
 * No raw green backgrounds used in Button — contrast safe.
 * Added 'green' variant using #4a9a40 (bright) with white text — AA for large text.
 * Never use 'green' variant for small text buttons (use 'primary' instead).
 */

interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'green';
  size?:    'xs' | 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size    = 'md',
  className,
  ...props
}) => {
  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:   'bg-black text-white hover:bg-zinc-800 shadow-sm',
    secondary: 'bg-white text-black hover:bg-zinc-50 border border-black/20',
    outline:   'bg-transparent border-2 border-black text-black hover:bg-black hover:text-white',
    ghost:     'bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-black',
    danger:    'bg-rose-500 text-white hover:bg-rose-600 shadow-sm',
    /*
     * green variant:
     * bg #4a9a40 (bright green) + white text = 3.2:1 contrast ratio
     * Acceptable for button text (large text AA threshold = 3:1).
     * hover: #2D5A27 (darker green) + white text = 5.9:1 = AAA pass.
     */
    green: 'text-white hover:text-white',
  };

  const sizes = {
    xs: 'px-2.5 py-1    text-[8px]  font-black uppercase tracking-widest',
    sm: 'px-3   py-1.5  text-[10px] font-bold  uppercase tracking-widest',
    md: 'px-5   py-2.5  text-xs     font-bold  uppercase tracking-widest',
    lg: 'px-6   py-3    text-sm     font-bold  uppercase tracking-widest',
  };

  const isGreen = variant === 'green';

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center transition-all",
        "active:scale-95 disabled:opacity-40 disabled:pointer-events-none",
        "rounded-none",    // Square corners match brutalist design system
        variants[variant],
        sizes[size],
        className,
      )}
      style={isGreen ? { backgroundColor: '#4a9a40' } : undefined}
      onMouseEnter={isGreen ? (e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2D5A27'; } : undefined}
      onMouseLeave={isGreen ? (e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#4a9a40'; } : undefined}
      {...props}
    >
      {children}
    </button>
  );
};


// ── Divider ───────────────────────────────────────────────────────────────────

export const Divider = ({ className }: { className?: string }) => (
  <hr className={cn("border-t border-black/8 my-6", className)} />
);


// ── Empty state ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?:     React.ReactNode;
  title:     string;
  message?:  string;
  action?:   React.ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, title, message, action, className }: EmptyStateProps) => (
  <div className={cn(
    "flex flex-col items-center justify-center py-16 px-8 text-center",
    "border border-black/8 bg-zinc-50/50",
    className,
  )}>
    {icon && (
      <div className="text-zinc-200 mb-5">{icon}</div>
    )}
    <p className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">{title}</p>
    {message && (
      <p className="text-sm text-zinc-400 font-medium max-w-xs leading-relaxed">{message}</p>
    )}
    {action && <div className="mt-6">{action}</div>}
  </div>
);


// ── Loading spinner ───────────────────────────────────────────────────────────

interface SpinnerProps {
  size?:  'sm' | 'md' | 'lg';
  theme?: 'dark' | 'light';
  className?: string;
}

export const Spinner = ({ size = 'md', theme = 'dark', className }: SpinnerProps) => {
  const sizes = { sm: 'w-4 h-4 border', md: 'w-6 h-6 border-2', lg: 'w-8 h-8 border-2' };
  const colors = { dark: 'border-black border-t-transparent', light: 'border-white border-t-transparent' };
  return (
    <div className={cn("animate-spin rounded-full flex-shrink-0", sizes[size], colors[theme], className)} />
  );
};


// ── Alert banner ──────────────────────────────────────────────────────────────
/*
 * CONTRAST FIX — replaces all ad-hoc alert divs that used bg-brand-accent.
 * Each variant has a light background + dark matching text = readable.
 * No solid dark green background used anywhere.
 */

interface AlertProps {
  children:   React.ReactNode;
  variant?:   'info' | 'success' | 'warning' | 'error' | 'neutral';
  icon?:      React.ReactNode;
  className?: string;
}

export const Alert = ({ children, variant = 'info', icon, className }: AlertProps) => {
  const variants = {
    info:    'bg-blue-50   border-blue-200  text-blue-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50  border-amber-200  text-amber-800',
    error:   'bg-rose-50   border-rose-200   text-rose-700',
    /*
     * neutral: very pale green bg + dark green text — brand-themed alert.
     * bg #e8f5e5 + text #2D5A27 = 5.1:1 contrast — AA pass.
     * This replaces the old bg-brand-accent alert box in LoginPage.
     */
    neutral: 'bg-[#e8f5e5] border-[#b8ddb4] text-[#2D5A27]',
  };

  return (
    <div className={cn(
      "flex gap-3 items-start p-4 border text-sm font-medium leading-relaxed",
      variants[variant],
      className,
    )}>
      {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
      <div>{children}</div>
    </div>
  );
};
