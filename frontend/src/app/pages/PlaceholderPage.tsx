import { Badge, EmptyState, PawIcon } from '@/shared/ui';

export interface PlaceholderPageProps {
  title: string;
  /** The frontend part that will build this screen, e.g. "F2". */
  part: string;
  description?: string;
}

/**
 * Stand-in rendered by routes whose screens belong to later parts (F1–F8).
 * It keeps the route table, layouts and guards fully navigable on the F0
 * skeleton without faking feature content.
 */
export function PlaceholderPage({ title, part, description }: PlaceholderPageProps) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12">
      <EmptyState
        icon={<PawIcon size={28} />}
        title={title}
        description={
          description ??
          `Ten ekran powstaje w części ${part}. Szkielet, design system i routing są gotowe (część F0).`
        }
        action={<Badge variant="outline">Część {part}</Badge>}
      />
    </section>
  );
}
