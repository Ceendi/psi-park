import { cn } from '@/shared/lib/cn';

export interface AvatarProps {
  name?: string;
  initials?: string;
  src?: string | null;
  /** Pixel diameter (default 44). */
  size?: number;
  tone?: 'green' | 'clay';
  className?: string;
}

const GRADIENTS: Record<NonNullable<AvatarProps['tone']>, string> = {
  green: 'linear-gradient(135deg, var(--color-green-300), var(--color-green-600))',
  clay: 'linear-gradient(135deg, var(--color-clay), #8a4a2c)',
};

function toInitials(name?: string, initials?: string): string {
  if (initials) return initials.slice(0, 2).toUpperCase();
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

/** Circular avatar — photo when available, otherwise initials on a gradient. */
export function Avatar({ name, initials, src, size = 44, tone = 'clay', className }: AvatarProps) {
  const label = toInitials(name, initials);
  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-bone',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.34),
        background: src ? undefined : GRADIENTS[tone],
      }}
      aria-label={name}
      role="img"
    >
      {src ? (
        <img src={src} alt={name ?? ''} className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{label}</span>
      )}
    </span>
  );
}
