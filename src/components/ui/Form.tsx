import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

interface FieldShellProps {
  label?: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function FieldShell({
  label,
  required,
  error,
  hint,
  children,
  className = "",
}: FieldShellProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-slate-600">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, required, error, hint, className = "", id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldShell
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        className={`input-base ${error ? "input-error" : ""}`}
        {...props}
      />
    </FieldShell>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, required, error, hint, className = "", children, id, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <FieldShell
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      <select
        ref={ref}
        id={selectId}
        aria-invalid={Boolean(error) || undefined}
        className={`input-base ${error ? "input-error" : ""}`}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, required, error, hint, className = "", rows = 3, id, ...props },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  return (
    <FieldShell
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={Boolean(error) || undefined}
        className={`input-base ${error ? "input-error" : ""}`}
        {...props}
      />
    </FieldShell>
  );
});

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className = "", ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = props.id ?? generatedId;
  return (
    <label
      htmlFor={inputId}
      className={`flex cursor-pointer items-center gap-2 text-sm text-slate-700 ${className}`}
    >
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        {...props}
      />
      {label}
    </label>
  );
});
