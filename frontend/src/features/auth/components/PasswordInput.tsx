import { useState } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

export interface PasswordInputProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
  invalid?: boolean;
  /** Lead icon override (defaults to a padlock, as in the design). */
  leadingIcon?: ReactNode;
}

/**
 * Password field with a show/hide toggle — the `.input-wrap` + `.trail-btn`
 * pattern from auth.css, built on the shared `Input`. Spreads props (incl. the
 * react-hook-form `ref`) onto the underlying control.
 */
export function PasswordInput({ invalid, leadingIcon, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      invalid={invalid}
      leadingIcon={leadingIcon ?? <Lock className="size-4" />}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ukryj hasło' : 'Pokaż hasło'}
          aria-pressed={visible}
          className={cn(
            'grid size-8 place-items-center rounded-[8px] text-ink-500 transition hover:bg-ink-50 hover:text-ink-900',
            visible && 'text-green-700 hover:text-green-700',
          )}
        >
          {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      }
    />
  );
}
