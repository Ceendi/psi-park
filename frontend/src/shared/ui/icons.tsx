import type { SVGProps } from 'react';

/**
 * Bespoke PsiPark themed icons (PLAN §16.1). Ported 1:1 from the "Ikony
 * tematyczne" section of docs/design/project/Design System.html — unified line
 * style, 2px stroke, `currentColor`. Generic icons elsewhere use `lucide-react`.
 */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  size?: number;
}

const line: SVGProps<SVGSVGElement> = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function base(size: number, viewBox: string, props: IconProps) {
  const { size: _size, ...rest } = props;
  return { width: size, height: size, viewBox, ...rest };
}

/** Brand paw mark — the rounded green tile used in the navbar / sidebars. */
export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        background: 'var(--color-green-700)',
        borderRadius: size * 0.28,
        display: 'grid',
        placeItems: 'center',
        color: 'var(--color-bone)',
      }}
      aria-hidden="true"
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 32 32" fill="currentColor">
        <ellipse cx="9" cy="11" rx="3" ry="4" />
        <ellipse cx="23" cy="11" rx="3" ry="4" />
        <ellipse cx="4" cy="18" rx="2.5" ry="3.5" />
        <ellipse cx="28" cy="18" rx="2.5" ry="3.5" />
        <path d="M16 16c-5 0-8 3.5-8 7 0 3 2.5 5 5.5 4.5 1.4-.2 1.7-.8 2.5-.8s1.1.6 2.5.8c3 .5 5.5-1.5 5.5-4.5 0-3.5-3-7-8-7z" />
      </svg>
    </span>
  );
}

export function PawIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <ellipse cx="10" cy="11" rx="2.2" ry="3" />
      <ellipse cx="22" cy="11" rx="2.2" ry="3" />
      <ellipse cx="5.5" cy="16.5" rx="2" ry="2.6" />
      <ellipse cx="26.5" cy="16.5" rx="2" ry="2.6" />
      <path d="M16 16c-3.5 0-6 2.5-6 5.5C10 24 11.7 25.5 14 25.2c1-.1 1.4-.7 2-.7s1 .6 2 .7c2.3.3 4-1.2 4-3.7 0-3-2.5-5.5-6-5.5z" />
    </svg>
  );
}

export function DogIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <path d="M8 12c0-3 2-5 4-5l1 3c1-.5 5-.5 6 0l1-3c2 0 4 2 4 5v6c0 4-3 7-8 7s-8-3-8-7z" />
      <path d="M8 12l-2-5 4 1" />
      <path d="M24 12l2-5-4 1" />
      <circle cx="13" cy="17" r="1.2" fill="currentColor" />
      <circle cx="19" cy="17" r="1.2" fill="currentColor" />
      <path d="M16 20v2" />
      <path d="M14 22.5c.5.7 1.2 1 2 1s1.5-.3 2-1" />
    </svg>
  );
}

export function BoneIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <path d="M9 8.5c-2 0-3.5 1.5-3.5 3.5 0 1.2.5 2 1.3 2.6-.8.6-1.3 1.4-1.3 2.6 0 2 1.5 3.5 3.5 3.5 1.7 0 2.8-1 3.2-2.3l7.5-7.5C20.2 9.5 21.3 8.5 23 8.5c2 0 3.5 1.5 3.5 3.5 0 1.2-.5 2-1.3 2.6.8.6 1.3 1.4 1.3 2.6 0 2-1.5 3.5-3.5 3.5-1.7 0-2.8-1-3.2-2.3l-7.5-7.5C12 9.5 10.7 8.5 9 8.5z" />
    </svg>
  );
}

export function GardenIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <path d="M4 14l3-3 3 3v12H4z" />
      <path d="M12 14l3-3 3 3v12h-6z" />
      <path d="M20 14l3-3 3 3v12h-6z" />
      <path d="M2 18h28" />
      <path d="M2 22h28" />
    </svg>
  );
}

export function TreeIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <path d="M16 4c-4 2-6 5-6 9 0 3 2 5 4 5.5V21h4v-2.5c2-.5 4-2.5 4-5.5 0-4-2-7-6-9z" />
      <path d="M14 21v6" />
      <path d="M18 21v6" />
      <path d="M11 27h10" />
    </svg>
  );
}

export function PinIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <path d="M16 4a8 8 0 0 1 8 8c0 6-8 16-8 16S8 18 8 12a8 8 0 0 1 8-8z" />
      <circle cx="16" cy="12" r="3" />
    </svg>
  );
}

export function MapIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <path d="M4 8l8-2 8 2 8-2v18l-8 2-8-2-8 2z" />
      <path d="M12 6v20" />
      <path d="M20 8v20" />
    </svg>
  );
}

export function CalendarIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <rect x="4" y="7" width="24" height="21" rx="3" />
      <path d="M4 13h24" />
      <path d="M10 4v6M22 4v6" />
      <circle cx="11" cy="19" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="16" cy="19" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="21" cy="19" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="11" cy="23" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ClockIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <circle cx="16" cy="16" r="11" />
      <path d="M16 10v6l4 2.5" />
    </svg>
  );
}

export function StarIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <path d="M16 3l4 8.5 9.5 1-7 6.5 2 9.5-8.5-4.5L7.5 28.5l2-9.5-7-6.5 9.5-1z" />
    </svg>
  );
}

export function StarFilledIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M16 3l4 8.5 9.5 1-7 6.5 2 9.5-8.5-4.5L7.5 28.5l2-9.5-7-6.5 9.5-1z" />
    </svg>
  );
}

export function HeartIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <path d="M16 27s-10-6-10-13a6 6 0 0 1 10-4.5A6 6 0 0 1 26 14c0 7-10 13-10 13z" />
    </svg>
  );
}

export function ShieldIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <path d="M16 4l10 4v8c0 7-5 11-10 12-5-1-10-5-10-12V8z" />
      <path d="M12 16l3 3 5-6" />
    </svg>
  );
}

export function WaterIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <path d="M16 4c-4 6-8 10-8 14a8 8 0 0 0 16 0c0-4-4-8-8-14z" />
    </svg>
  );
}

export function SunIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <circle cx="16" cy="16" r="5" />
      <path d="M16 3v3M16 26v3M3 16h3M26 16h3M7 7l2 2M23 23l2 2M7 25l2-2M23 9l2-2" />
    </svg>
  );
}

export function KeyIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <circle cx="11" cy="16" r="5" />
      <path d="M16 16h13" />
      <path d="M24 16v4" />
      <path d="M29 16v3" />
    </svg>
  );
}

export function ChatIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <path d="M5 8a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H14l-6 5v-5H8a3 3 0 0 1-3-3z" />
      <circle cx="12" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="20" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function UserIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <circle cx="16" cy="11" r="5" />
      <path d="M5 27c1-5 5-8 11-8s10 3 11 8" />
    </svg>
  );
}

export function SearchIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <circle cx="14" cy="14" r="8" />
      <path d="M20 20l7 7" />
    </svg>
  );
}

export function FilterIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <path d="M5 7h22" />
      <path d="M9 14h14" />
      <path d="M13 21h6" />
    </svg>
  );
}

export function WalletIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <rect x="4" y="9" width="24" height="16" rx="3" />
      <path d="M4 13h24" />
      <circle cx="22" cy="19" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CameraIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <path d="M5 10h4l2-3h10l2 3h4v15H5z" />
      <circle cx="16" cy="17" r="5" />
    </svg>
  );
}

export function SettingsIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <circle cx="16" cy="16" r="3.5" />
      <path d="M16 3v4M16 25v4M3 16h4M25 16h4M7 7l3 3M22 22l3 3M7 25l3-3M22 10l3-3" />
    </svg>
  );
}

export function InfoIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, '0 0 32 32', props)} {...line}>
      <circle cx="16" cy="16" r="12" />
      <path d="M16 11v0.1" />
      <path d="M16 15v7" />
    </svg>
  );
}
