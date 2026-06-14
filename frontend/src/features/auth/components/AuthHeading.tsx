/** Card header (title + subtitle) for the auth screens — `.card-head` in auth.css. */
export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-7">
      <h1 className="mb-2 text-[32px] font-bold leading-[1.15] tracking-[-0.025em] text-ink-900">
        {title}
      </h1>
      <p className="text-[15px] leading-relaxed text-ink-500">{subtitle}</p>
    </header>
  );
}
