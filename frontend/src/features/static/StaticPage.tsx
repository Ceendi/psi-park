import { formatDate } from '@/shared/lib/dates';
import { STATIC_DOCS, type StaticDocKey } from './content';

/** Renders a legal/help document in the public layout (PLAN F8). */
export function StaticPage({ doc }: { doc: StaticDocKey }) {
  const content = STATIC_DOCS[doc];

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="text-[32px] font-bold tracking-tight">{content.title}</h1>
      <p className="mt-2 font-mono text-xs text-ink-500">
        Ostatnia aktualizacja: {formatDate(content.updated)}
      </p>
      <p className="mt-6 text-[15px] leading-relaxed text-ink-700">{content.intro}</p>

      <div className="mt-8 flex flex-col gap-8">
        {content.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold tracking-tight text-ink-900">{section.heading}</h2>
            <div className="mt-2 flex flex-col gap-2">
              {section.body.map((paragraph, i) => (
                <p key={i} className="text-[14px] leading-relaxed text-ink-700">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
