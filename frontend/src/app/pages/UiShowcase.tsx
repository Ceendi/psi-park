import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FileDropzone,
  FormField,
  Input,
  Modal,
  Pagination,
  PriceTag,
  RadioGroup,
  Rating,
  Select,
  Skeleton,
  Spinner,
  StatCard,
  Stepper,
  Tabs,
  Textarea,
  TimeRangePicker,
  Toggle,
  Tooltip,
  Table,
  useToast,
  BoneIcon,
  CalendarIcon,
  CameraIcon,
  ChatIcon,
  ClockIcon,
  DogIcon,
  FilterIcon,
  GardenIcon,
  HeartIcon,
  InfoIcon,
  KeyIcon,
  Logo,
  MapIcon,
  PawIcon,
  PinIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  StarIcon,
  SunIcon,
  TreeIcon,
  UserIcon,
  WalletIcon,
  WaterIcon,
} from '@/shared/ui';
import { DatePicker } from '@/shared/ui/DatePicker';
import type { TimeRange } from '@/shared/ui';

function Section({
  index,
  label,
  title,
  children,
}: {
  index: string;
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-16">
      <div className="mb-6">
        <div className="font-mono text-xs uppercase tracking-wider text-green-700">
          {index} — {label}
        </div>
        <h2 className="mt-1.5 text-[32px] font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const GREENS = ['900', '800', '700', '600', '500', '300', '100', '50'];
const INKS = ['900', '700', '500', '300', '200', '100', '50'];
const STATE_SWATCHES: [string, string][] = [
  ['success', 'var(--color-success)'],
  ['warning', 'var(--color-warning)'],
  ['danger', 'var(--color-danger)'],
  ['info', 'var(--color-info)'],
  ['clay', 'var(--color-clay)'],
  ['sun', 'var(--color-sun)'],
  ['stripe', 'var(--color-stripe)'],
];

const THEME_ICONS: [string, ReactNode][] = [
  ['dog', <DogIcon size={28} />],
  ['paw', <PawIcon size={28} />],
  ['bone', <BoneIcon size={28} />],
  ['garden', <GardenIcon size={28} />],
  ['tree', <TreeIcon size={28} />],
  ['pin', <PinIcon size={28} />],
  ['map', <MapIcon size={28} />],
  ['calendar', <CalendarIcon size={28} />],
  ['clock', <ClockIcon size={28} />],
  ['star', <StarIcon size={28} />],
  ['heart', <HeartIcon size={28} />],
  ['shield', <ShieldIcon size={28} />],
  ['water', <WaterIcon size={28} />],
  ['sun', <SunIcon size={28} />],
  ['key', <KeyIcon size={28} />],
  ['chat', <ChatIcon size={28} />],
  ['user', <UserIcon size={28} />],
  ['search', <SearchIcon size={28} />],
  ['filter', <FilterIcon size={28} />],
  ['wallet', <WalletIcon size={28} />],
  ['camera', <CameraIcon size={28} />],
  ['settings', <SettingsIcon size={28} />],
  ['info', <InfoIcon size={28} />],
];

const TABLE_ROWS = [
  { id: 1, client: 'Katarzyna Nowak', dog: 'Łata', amount: '99,00 zł', status: 'confirmed' },
  { id: 2, client: 'Marek Wójcik', dog: 'Borys', amount: '70,00 zł', status: 'pending' },
];

export function UiShowcase() {
  const { toast } = useToast();
  const [tab, setTab] = useState('upcoming');
  const [rating, setRating] = useState(4);
  const [page, setPage] = useState(2);
  const [modalOpen, setModalOpen] = useState(false);
  const [range, setRange] = useState<TimeRange | null>(null);
  const [day, setDay] = useState<Date | undefined>(new Date(2026, 4, 24));

  const slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'].map(
    (hour, i) => ({ hour, available: i !== 3 && i !== 4 }),
  );

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-14 pb-32">
      <header className="flex items-end justify-between gap-12 border-b border-ink-100 pb-8">
        <div className="flex items-center gap-3.5">
          <Logo size={52} />
          <div>
            <h1 className="text-[28px] font-bold tracking-tight">PsiPark — Design System</h1>
            <p className="mt-0.5 text-sm text-ink-500">
              Część F0 · komponenty, tokeny i ikony (źródło: Claude Design)
            </p>
          </div>
        </div>
        <div className="hidden text-right text-[13px] leading-relaxed text-ink-500 md:block">
          <strong className="font-semibold text-ink-900">Polska · 2026</strong>
          <br />
          Inter · JetBrains Mono · zieleń #2E7D32
        </div>
      </header>

      <Section index="01" label="Foundations" title="Paleta kolorów">
        <Card className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Zieleń marki</h3>
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
              {GREENS.map((g) => (
                <div key={g} className="overflow-hidden rounded-sm border border-ink-100">
                  <div className="aspect-[1.6/1]" style={{ background: `var(--color-green-${g})` }} />
                  <div className="p-2 font-mono text-[11px] text-ink-700">green/{g}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Neutrale</h3>
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
              {INKS.map((k) => (
                <div key={k} className="overflow-hidden rounded-sm border border-ink-100">
                  <div className="aspect-[1.6/1]" style={{ background: `var(--color-ink-${k})` }} />
                  <div className="p-2 font-mono text-[11px] text-ink-700">ink/{k}</div>
                </div>
              ))}
              <div className="overflow-hidden rounded-sm border border-ink-200">
                <div className="aspect-[1.6/1]" style={{ background: 'var(--color-bone)' }} />
                <div className="p-2 font-mono text-[11px] text-ink-700">bone</div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Stany i akcenty</h3>
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
              {STATE_SWATCHES.map(([name, value]) => (
                <div key={name} className="overflow-hidden rounded-sm border border-ink-100">
                  <div className="aspect-[1.6/1]" style={{ background: value }} />
                  <div className="p-2 font-mono text-[11px] text-ink-700">{name}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </Section>

      <Section index="02" label="Foundations" title="Typografia">
        <Card className="space-y-5">
          <p className="text-[56px] font-bold leading-[1.05] tracking-[-0.03em]">
            Znajdź ogród dla swojego psa
          </p>
          <p className="text-[40px] font-bold leading-[1.1] tracking-[-0.025em]">
            Bezpieczne wybiegi w okolicy
          </p>
          <p className="text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Ogród z fontanną i tarasem
          </p>
          <p className="text-xl font-semibold tracking-[-0.01em]">Twoja rezerwacja</p>
          <p className="text-[15px] leading-relaxed text-ink-700">
            Ogród o powierzchni 480 m². Ogrodzony siatką 1,8 m. Cień, woda do picia, wiata na deszcz.
          </p>
          <p className="font-mono text-[13px] text-green-800">res_2026_05_21_PL_KRK_0934</p>
        </Card>
      </Section>

      <Section index="03" label="Components" title="Buttony">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center gap-3.5">
            <Button size="lg" rightIcon={<ArrowRight className="size-4" />}>
              Zarezerwuj ogród
            </Button>
            <Button variant="secondary" size="lg">
              Zobacz na mapie
            </Button>
            <Button variant="ghost" size="lg">
              Anuluj
            </Button>
            <Button variant="danger" size="lg">
              Usuń ofertę
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3.5">
            <Button>Zarezerwuj</Button>
            <Button variant="secondary">Filtry</Button>
            <Button variant="ghost">Pokaż więcej</Button>
            <Button variant="danger">Zgłoś</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3.5">
            <Button size="sm">Dalej</Button>
            <Button size="sm" variant="secondary">
              Edytuj
            </Button>
            <Button loading>Przetwarzanie</Button>
            <Button disabled>Niedostępne</Button>
          </div>
        </Card>
      </Section>

      <Section index="04" label="Components" title="Pola formularzy">
        <Card className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FormField label="Lokalizacja" htmlFor="loc" hint="Wpisz miasto lub dzielnicę.">
              <Input id="loc" leadingIcon={<SearchIcon size={18} />} placeholder="Kraków, Podgórze…" />
            </FormField>
            <FormField label="E-mail kontaktowy" htmlFor="mail" error="Adres e-mail jest niepoprawny.">
              <Input id="mail" type="email" defaultValue="kasia@example" invalid />
            </FormField>
            <FormField label="Wybierz psa" htmlFor="dog">
              <Select id="dog" defaultValue="lata">
                <option value="lata">Łata · 18 kg</option>
                <option value="borys">Borys · 24 kg</option>
              </Select>
            </FormField>
            <FormField label="Data wynajmu" htmlFor="date">
              <Input id="date" leadingIcon={<CalendarIcon size={18} />} defaultValue="sob, 24 maja 2026" />
            </FormField>
            <FormField label="Notatka dla gospodarza" htmlFor="note" className="md:col-span-2">
              <Textarea id="note" placeholder="Np. Łata jest spokojna, proszę o zamknięcie furtki." />
            </FormField>
          </div>
          <div className="flex flex-wrap items-center gap-7 border-t border-ink-100 pt-5">
            <Checkbox defaultChecked label="Pies zaszczepiony" />
            <Checkbox label="Wezmę więcej niż jednego psa" />
            <Toggle defaultChecked label="Powiadomienia e-mail" />
            <RadioGroup
              name="size"
              orientation="horizontal"
              defaultValue="m"
              options={[
                { value: 's', label: 'Mały' },
                { value: 'm', label: 'Średni' },
                { value: 'l', label: 'Duży' },
              ]}
            />
          </div>
        </Card>
      </Section>

      <Section index="05" label="Components" title="Plakietki">
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Badge variant="success">Potwierdzona</Badge>
            <Badge variant="warning">Oczekuje</Badge>
            <Badge variant="danger">Anulowana</Badge>
            <Badge variant="info">W trakcie</Badge>
            <Badge variant="neutral">Zakończona</Badge>
            <Badge variant="solid">Nowość</Badge>
            <Badge variant="outline">Szkic</Badge>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge variant="rating" leftIcon={<StarIcon size={12} />}>
              4,92
            </Badge>
            <Badge variant="success" leftIcon={<ShieldIcon size={12} />}>
              Zweryfikowany gospodarz
            </Badge>
            <Badge variant="rating">128 recenzji</Badge>
          </div>
        </Card>
      </Section>

      <Section index="06" label="Components" title="Karty i komponenty panelu">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card padded={false} className="overflow-hidden" interactive>
            <div className="relative grid aspect-[4/3] place-items-center bg-[linear-gradient(160deg,#DCEFD8_0%,#C8E1C3_100%)] font-mono text-[11px] text-green-800/70">
              <Badge variant="solid" className="absolute left-3.5 top-3.5">
                Super-Gospodarz
              </Badge>
              // zdjęcie ogrodu 4:3
            </div>
            <div className="flex flex-col gap-1.5 p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold tracking-tight">Ogród z basenem i wiatą</h3>
                <Rating value={4.92} size={13} showValue />
              </div>
              <p className="text-[13px] text-ink-500">Kraków, Wola Justowska · 3,4 km</p>
              <PriceTag amount={45} className="mt-2" />
            </div>
          </Card>

          <Card>
            <h4 className="font-semibold">Gospodarz</h4>
            <div className="mt-3 flex items-center gap-4 rounded-md border border-ink-100 p-3.5">
              <Avatar name="Magda Krawczyk" size={56} />
              <div className="flex-1">
                <div className="font-semibold">Magda Krawczyk</div>
                <Rating value={4.9} size={12} count={128} showValue className="mt-1" />
              </div>
              <Badge variant="success">Zweryfikowany</Badge>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="sm">
                Napisz wiadomość
              </Button>
              <Tooltip content="Wkrótce">
                <Button variant="ghost" size="sm">
                  Zobacz profil
                </Button>
              </Tooltip>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={<CalendarIcon size={20} />} value="12" label="Rezerwacji" />
            <StatCard icon={<WalletIcon size={20} />} value="1 847 zł" label="Wydane" />
            <StatCard icon={<ClockIcon size={20} />} value="34 h" label="W ogrodach" />
            <StatCard icon={<StarIcon size={20} />} value="8" label="Recenzji" />
          </div>
        </div>
      </Section>

      <Section index="07" label="Components" title="Nawigacja, stany i interakcje">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-5">
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { value: 'upcoming', label: 'Nadchodzące', count: 3 },
                { value: 'done', label: 'Zakończone', count: 8 },
                { value: 'cancelled', label: 'Anulowane', count: 1 },
              ]}
            />
            <Stepper steps={['Szczegóły', 'Płatność', 'Potwierdzenie']} current={1} />
            <div className="flex items-center gap-4">
              <Rating value={rating} onChange={setRating} size={22} />
              <span className="text-sm text-ink-500">Twoja ocena: {rating}/5</span>
            </div>
            <Pagination page={page} pageCount={8} onChange={setPage} />
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={() => setModalOpen(true)}>
                Otwórz modal
              </Button>
              <Button
                onClick={() =>
                  toast({ title: 'Zapisano zmiany', description: 'Profil zaktualizowany.', variant: 'success' })
                }
              >
                Pokaż toast
              </Button>
              <Spinner size={22} className="text-green-700" />
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="text-sm font-semibold">Wybór godzin (zajęte wyszarzone)</div>
            <TimeRangePicker slots={slots} value={range} onChange={setRange} />
            <p className="text-[13px] text-ink-500">
              {range ? `Wybrano: ${range.start}–${range.end}` : 'Kliknij godzinę początku i końca.'}
            </p>
            <div className="flex flex-col gap-3 border-t border-ink-100 pt-4">
              <div className="text-sm font-semibold">Skeleton (stan ładowania)</div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Card>
        </div>
      </Section>

      <Section index="08" label="Components" title="Kalendarz, tabela i upload">
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card className="flex justify-center">
            <DatePicker selected={day} onSelect={setDay} />
          </Card>
          <div className="space-y-6">
            <Table
              rowKey={(r) => r.id}
              data={TABLE_ROWS}
              columns={[
                { key: 'client', header: 'Klient', sortable: true },
                { key: 'dog', header: 'Pies' },
                { key: 'amount', header: 'Kwota', align: 'right' },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) =>
                    r.status === 'confirmed' ? (
                      <Badge variant="success">Potwierdzona</Badge>
                    ) : (
                      <Badge variant="warning">Oczekuje</Badge>
                    ),
                },
              ]}
            />
            <FileDropzone onFiles={() => undefined} />
          </div>
        </div>
      </Section>

      <Section index="09" label="Components" title="Stan pusty">
        <EmptyState
          icon={<GardenIcon size={28} />}
          title="Brak ogrodów dla tych filtrów"
          description="Spróbuj rozszerzyć obszar wyszukiwania lub wyczyść filtry."
          action={<Button variant="secondary">Wyczyść filtry</Button>}
        />
      </Section>

      <Section index="10" label="Iconography" title="Ikony tematyczne">
        <Card>
          <div className="grid grid-cols-3 gap-3.5 sm:grid-cols-6">
            {THEME_ICONS.map(([name, icon]) => (
              <div
                key={name}
                className="flex flex-col items-center gap-2.5 rounded-md border border-ink-100 px-3 py-4 text-green-800 transition hover:-translate-y-0.5 hover:border-green-300"
              >
                {icon}
                <span className="font-mono text-[11px] text-ink-500">{name}</span>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Anulować rezerwację?"
        description="Polityka 24h: anulowanie na mniej niż 24h przed startem jest bez zwrotu."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Wróć
            </Button>
            <Button variant="danger" onClick={() => setModalOpen(false)}>
              Anuluj rezerwację
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-500">
          To działanie zwolni slot i powiadomi gospodarza. Tej operacji nie można cofnąć.
        </p>
      </Modal>
    </div>
  );
}

export default UiShowcase;
