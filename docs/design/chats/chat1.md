# PsiPark Design System

_Started 2026-05-21 14:25 UTC_

---

## User

Buduje aplikacje webowa PsiPark - platforma do wynajmu prywatnych
ogrodow i wybiegow dla psow na godziny. Pelni rolą Airbnb dla
wlascicieli psow w Polsce.

Uzytkownicy:
- Klient (wlasciciel psa) - rezerwuje ogrody dla swojego psa
- Gospodarz (wlasciciel terenu) - udostepnia swoj ogrod za oplata
- Administrator - moderuje platforme

Wymagania designu:
- Styl: nowoczesny, przyjazny, inspirowany Airbnb (duzo zdjec,
  czysty layout, biala przestrzen)
- Kolor wiodacy: zielen (#2E7D32, nawiazanie do natury i ogrodow),
  akcent: ciepla biel #FAFFFA, ciemny tekst #1B1B1B
- Typografia: sans-serif, czytelna (Inter albo system fonts)
- Komponenty: zaokraglone rogi, miekkie cienie, duze CTA buttons
- Jezyk interfejsu: polski
- Responsywny, ale priorytet desktop (1280px+)

Wygeneruj design system z paletą kolorow, typografia, podstawowymi
komponentami (button, input, card, badge) i ikonografia tematyczna
(psy, ogrod, mapa, kalendarz, gwiazdki).

## Assistant

_[tool: update_todos]_

Zbuduję dla Ciebie design system PsiPark jako jeden interaktywny dokument HTML. Będzie to oryginalny system inspirowany konwencjami platform marketplace (czysty layout, dużo białej przestrzeni, fotograficzne karty), ale z własnym charakterem — ciepła zieleń ogrodowa + delikatne off-white tło.

Plan:
- **Kolory**: główna paleta zieleni + neutrale + stany (success/warning/error)
- **Typografia**: Inter (zgodnie z prośbą), skala od caption do display
- **Komponenty**: buttony (4 warianty × 3 rozmiary), inputy, karty ogrodu, badge
- **Ikonografia**: zestaw tematyczny w jednolitym stylu line icon (pies, kość, łapa, ogród, mapa, kalendarz, gwiazdka, lokalizacja itd.)

_[tool: write_file]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Gotowe — design system PsiPark jest w pliku `Design System.html`. Strona zawiera:

- **Kolory**: skala zieleni (50–900, ★ #2E7D32 jako primary), neutrale, ciepła biel #FAFFFA, stany (success/warning/danger/info) + akcenty clay/sun
- **Typografia**: Inter (display → caption) + JetBrains Mono dla tokenów i metadanych
- **Promienie i cienie**: 5 poziomów radius (6–28px) + 3 poziomy cieni
- **Buttony**: 4 warianty × 3 rozmiary + stan disabled (kształt pill)
- **Formularze**: inputy z fokusem w zieleni, stan error, checkbox/radio/switch, ikony wiodące
- **Plakietki**: statusy rezerwacji, cechy ogrodu, oceny ze gwiazdką
- **Karty**: 3 karty oferty (zdjęcie 4:3, badge, heart, rating, cena/h), karta podsumowania rezerwacji, karta gospodarza
- **Ikony tematyczne**: 24 ikony w jednolitym stylu line — pies, łapa, kość, ogród, drzewo, mapa, pin, kalendarz, gwiazdka, klucz (furtka), tarcza (bezpieczeństwo) i inne

Sticky nawigacja u góry pozwala szybko przeskakiwać między sekcjami. Wszystkie kolory są dostępne jako CSS custom properties (`--green-700`, `--ink-900`, `--bone` itd.), więc łatwo przeniesiesz je do reszty aplikacji.

Daj znać, czy chcesz dodatkowo: ekrany aplikacji (listing/mapa, szczegóły ogrodu, checkout, panel gospodarza, panel admina), mobilną wersję komponentów, albo system tweaków do testowania różnych odcieni zieleni.

## User

Wygeneruj strone glowna PsiPark. Layout:
- Gora: pasek nawigacji z logo PsiPark po lewej, w srodku pole
  wyszukiwania "Gdzie szukasz ogrodu?", po prawej linki "Zaloguj sie"
  i "Zarejestruj sie"
- Sekcja hero z duzym headlinem "Znajdz idealny ogrod dla swojego psa"
  i podtytulem o spokojnych miejscach na spacery
- Pasek filtrow: lokalizacja, data, godziny, liczba psow, czy ogrodzony
- Lewa polowa ekranu: lista kart ogrodow (zdjecie, nazwa, miasto,
  cena/h, ocena gwiazdkowa, ikona ogrodzonego)
- Prawa polowa ekranu: interaktywna mapa z pinezkami ogrodow
- Stopka z linkami: O nas, Regulamin, RODO, Kontakt

## Assistant

_[tool: write_file]_

Buduję stronę główną używając design systemu (zieleń marki, Inter, miękkie cienie, pill-buttony). Mapa będzie stylizowanym widokiem z pinezkami nawiązującymi do kart po lewej — kliknięcie pinezki podświetla kartę i odwrotnie.

_[tool: done]_

_[tool: fork_verifier_agent]_

Gotowe — strona główna PsiPark w `Home Page.html`. Co jest na ekranie:

- **Pasek nawigacji** (sticky, blur): logo PsiPark, w środku 3-segmentowy search (Gdzie · Kiedy · Godziny) z zielonym przyciskiem szukania, po prawej „Zostań gospodarzem", „Zaloguj się" i ciemny CTA „Zarejestruj się"
- **Hero**: duży headline z podświetloną na zielono frazą „idealny ogród", podtytuł, 3 stat-numbery (2 412 ogrodów, 98 zł, 4,9 ★) oraz ilustracyjne pole po prawej z trzema pływającymi info-kartami
- **Pasek filtrów** w kształcie pill: lokalizacja, data, godziny, liczba psów, przełącznik „Pełne ogrodzenie" i „Wszystkie filtry"
- **Split view 50/50**:
  - **Lewa**: 6 kart ogrodu w siatce 2×3 — zdjęcie (placeholdery z napisem), tag Super-Gospodarz / Nowy, serduszko (klikalne), price-tag, tytuł, ocena+liczba recenzji, miasto+dystans, badge metrażu i pełnego ogrodzenia. Pod listą paginacja
  - **Prawa** (sticky): stylizowana mapa z drogami, rzeką i parkami + 6 pinezek z ceną. **Hover na karcie podświetla pinezkę i odwrotnie** — wspólny stan focus
- **Stopka** ciemna z 5 kolumnami linków (O nas, Dla psów, Dla gospodarzy, Regulamin/RODO, brand), socials i copyright

Daj znać, jeśli chcesz: alternatywne układy hero, więcej wariantów kart (lista/wide), prawdziwy widok mapy w tle (np. tile pattern), albo wariant mobile.

## User

pare rzeczy które są bugged, przycisk Zostań gospodarzem jak się najeżdża tworzy obramowanie które najeżdzą na pasek wyszukiwania i ikonkę wyszukiwania, ta mapka z co się przewija razem z ogrodami spoko, problem w tym że nie zdąży się przwinąć 100px i już sie zatrzymuje co dziwnie wygląda, dodatkowo podczas przewijania jak sie najeżdża na jakiś ogród to pozycje scrolla ustawia na ten ogród (jak ktoś syzbko przewija to mu cofa nagle co dziwnie działa)

## Assistant

_[tool: str_replace_edit]_

Naprawiam wszystkie trzy:

1. **Nav** – kolumna prawa była za wąska (280px) na 3 elementy, więc na hover tło wychodziło poza obszar. Zmieniam grid na `auto 1fr auto` z max-width na pasku wyszukiwania.
2. **Mapa** – stickowała się za szybko bo jej wysokość była za blisko wysokości listy. Skracam mapę (clamp 560–700px), więc parent zawsze jest wyraźnie wyższy → więcej zasięgu sticky.
3. **Auto-scroll na hover pinezki** – usuwam logikę przewijania listy przy hover.

_[tool: done]_

Naprawione:

- **Nav**: prawa strona używa teraz `auto`, więc „Zostań gospodarzem" ma swój własny obszar i nie wchodzi w pasek wyszukiwania (search ma max-width 640px wycentrowane)
- **Mapa**: wysokość `clamp(560px, calc(100vh - 180px), 700px)` — zawsze jest niższa niż lista kart, więc sticky ma zapas i nie „rwie się" po 100px
- **Hover na ogród/pinezkę**: tylko podświetla, nie przewija (usunięta logika `scrollTo`)

## User

Save this design as a PDF: Home Page.html

## Assistant

_[tool: copy_files]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: str_replace_edit]_

_[tool: open_for_print]_

Otwarte do druku — w oknie wybierz „Zapisz jako PDF". Jeśli się nie otworzyło: [Otwórz Home Page-print.html](https://c23d279e-ee65-4270-9099-e6bec9d13e54.claudeusercontent.com/v1/design/projects/c23d279e-ee65-4270-9099-e6bec9d13e54/serve/Home%20Page-print.html?t=646155c4da9276fdbf902b893a6aec1f18635ed46a685a3a21ff252e6e3f06a5.e96cb454-1ba1-4eb5-afea-70f7cc429cc3.73780246-e4cd-43ef-b143-ebd0eff29d0e.1779378152&direct=1)

## User

Wygeneruj strone szczegolow konkretnego ogrodu. Layout:
- Gora: galeria 5 zdjec ogrodu (jedno duze po lewej, 4 mniejsze
  po prawej w siatce 2x2)
- Tytul ogrodu, lokalizacja, ocena 4.8 z 23 recenzji
- Lewa kolumna: opis ogrodu, lista cech (powierzchnia w m2,
  ogrodzony tak/nie, maksymalna liczba psow, dostepne udogodnienia),
  profil gospodarza z avatarem
- Prawa kolumna: sticky card z cena/h, kalendarz wyboru dnia,
  picker godzin od-do, podsumowanie kosztow, duzy zielony przycisk
  "Zarezerwuj"
- Pod galeria: sekcja recenzji (4-5 kart z avatarem, ocena, komentarz)
- Mini-mapa z lokalizacja na dole

## Assistant

## Assistant

_[tool: write_file]_

Buduję stronę szczegółów ogrodu — używam tej samej palety i komponentów. Kalendarz i picker godzin będą działać interaktywnie, koszty się przeliczają na żywo.

_[tool: done]_

_[tool: fork_verifier_agent]_

Gotowe — `Garden Detail.html`. Co znajdziesz:

- **Nawigacja** (kompakt) z paskiem wyszukiwania w środku
- **Breadcrumb** Kraków › Wola Justowska › Ogród
- **Nagłówek**: tytuł, ocena 4,8 · 23 recenzje, Super-Gospodarz, lokalizacja + akcje Udostępnij / Zapisz (klikalne)
- **Galeria 5 zdjęć**: 1 duże po lewej + 4 w siatce 2×2 po prawej, z przyciskiem „Pokaż wszystkie zdjęcia (12)"
- **Lewa kolumna**: 
  - sekcja gospodarza z avatarem na górze
  - 4 highlights (powierzchnia, ogrodzenie, maks. psów, weryfikacja)
  - opis ogrodu (3 akapity)
  - lista udogodnień (8 dostępnych + 2 przekreślone „brak")
  - zasady gospodarza
  - rozbudowana karta gospodarza z bio i akcjami
- **Prawa kolumna (sticky)**: 
  - cena/h + rating
  - **interaktywny kalendarz** (klikalny, miesiące do przodu/tyłu, niedostępne dni przekreślone)
  - picker godzin (od/do) z **rzędem chipów godzin** — klikasz start, potem koniec, środkowe się podświetlają, zajęte są disabled
  - licznik psów ± (z dopłatą za 2.+ psa)
  - **podsumowanie kosztów na żywo** (godziny × stawka, dopłata, fee, total)
  - zielony CTA „Zarezerwuj"
- **23 recenzje**: nagłówek z oceną, 6 kart z avatarem, gwiazdkami i komentarzem (różne typy klientów — lękowiec, basen, 4 psy, krytyka)
- **Mini-mapa** z pinezką w środku, ringiem pokazującym przybliżoną lokalizację, notką o dzielnicy + zastrzeżeniem że dokładny adres po rezerwacji
- **Mini-stopka**

Jeśli chcesz: lightbox po kliknięciu zdjęcia, sekcję „Inne ogrody w okolicy" pod recenzjami, albo wersję rozszerzoną zasad/anulowania.

## User

Verifier agent check completed

## Assistant

Verifier był przeciążony i nie zwrócił raportu — sama strona jest gotowa i ładuje się bez błędów (sprawdzone wcześniej przez `done`). Jeśli zauważysz coś do poprawy, daj znać.

## User

Address these comments from my teammates:

**Kuba** (on `Garden Detail.html` at `[data-comment-anchor="d22009dced-div"]`):
zł za duża czcionka

**Kuba** (on `Garden Detail.html` at `[data-comment-anchor="5092959f41-div"]`):
23 recenzje są rozjechane i zbyt duży odstęp

## Assistant

_[tool: grep]_

_[tool: read_file]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: done]_

Naprawione:

- **„zł" w cenie**: rozdzielone na 3 spany — `45` (28px, bold) · `zł` (16px) · `za godzinę` (14px, szary). Wcześniej „zł" dziedziczyło 26px z `.price`, a liczba „45" była zmniejszana do 14px przez ogólną regułę `span` — odwrotnie niż powinno
- **Meta z 23 recenzjami**: gap zmniejszony z 12px do 10px (i 6px w pionie przy zawijaniu), dodane `flex-shrink: 0` na kropki separujące + `margin-top: 2px` żeby trzymał się bliżej tytułu

## User

Apply comment

## Assistant

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: done]_

To zmiana alignment — `center` centruje pudełka, a podkreślenie linku „23 recenzje" rozciąga pudełko w dół, więc tekst trafia trochę wyżej. Zmieniam na `baseline`, żeby wszystko stało na tej samej linii bazowej:Naprawione — meta używa teraz `align-items: baseline`, więc „23 recenzje", gwiazdki i „Super-Gospodarz" stoją na tej samej linii. Kropki separujące zostały odrębnie wycentrowane (`align-self: center`), żeby siedziały optycznie po środku tekstu.

## User

nie, nadal te recenzje są niżej

## Assistant

_[tool: str_replace_edit]_

_[tool: done]_

Problem: SVG-y w „4,8", „Super-Gospodarz" i lokalizacji są wyższe niż sam tekst — w `align-items: baseline` te bloki podnoszą się względem czystego tekstu „23 recenzje".

Fix: wszystkie elementy meta są teraz `inline-flex` z `line-height: 1`, a kontener używa `align-items: center` — każdy box ma tę samą wysokość i jest wyśrodkowany, więc „23 recenzje" siedzi na tej samej linii co reszta.

## User

nie nadal, tak jak widzisz na zdjęciu, są w ogóle w innych linijkach

## Assistant

_[tool: str_replace_edit]_

_[tool: done]_

Aha, teraz widzę — „23 recenzje" zawijają się do drugiej linii, bo każdy element meta jest osobno i flex zawija pomiędzy nimi. Zostawiam ocenę i link na recenzje jako **jeden** element, dzięki czemu nie da się ich rozdzielić.

_[tool: read_file]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: done]_

Znalazłem przyczynę! Na linku „23 recenzje" jest inline `style="margin: 64px 109px 0px"` (zostało po jakiejś bezpośredniej edycji), co wypycha link 64px w dół. Usuwam:Naprawione — usunąłem `margin: 64px 109px 0px` z linku „23 recenzje". Teraz wszystkie elementy stoją w jednej linii.

## User

nadal nie stoją w jednej linii tak jak widzisz na zdjęciu

## Assistant

_[tool: grep]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: done]_

Znalazłem! Konflikt klas CSS — `.reviews` to nazwa zarówno **sekcji recenzji** (`margin: 64px auto 0`, padding) jak i mojego **linku** „23 recenzje". Przeglądarka aplikuje styl sekcji do linku, stąd te 64px marginesu które zepchnęły go w dół.

Zmieniam nazwę klasy linku:Naprawione. Powód był taki, że klasa `.reviews` była użyta dwa razy — raz na sekcji recenzji niżej w stronie (z `margin: 64px auto 0`), a raz na linku w nagłówku. Reguła sekcji łapała też link, co dodawało mu 64px marginesu i wypychało do następnej linii. Zmieniłem klasę linku na `.reviews-link`.

## User

Wygeneruj formularz rezerwacji ogrodu (krok przed platnoscia Stripe).
Layout dwuczesciowy:
- Lewa strona: stepper "1. Szczegoly rezerwacji - 2. Platnosc -
  3. Potwierdzenie", ponizej formularz: wybor daty, godziny od-do,
  dropdown wyboru psa z listy psow uzytkownika, pole na uwagi
  dla gospodarza, akceptacja regulaminu
- Prawa strona: sticky podsumowanie - miniatura zdjecia ogrodu,
  nazwa, data i godzina, czas trwania, cena/h x godziny,
  prowizja platformy, suma do zaplaty, duzy przycisk
  "Przejdz do platnosci"

## Assistant

_[tool: write_file]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Gotowe — `Booking Form.html`. Co jest:

**Lewa strona:**
- Minimalna nawigacja z plakietką „Bezpieczna rezerwacja · SSL"
- Powrót strzałką + tytuł „Twoja rezerwacja"
- **Stepper** w pasku: 1 (aktywny, ciemny ring) → 2 Płatność → 3 Potwierdzenie
- **Sekcja 01 — Kiedy**: 3 pile (Data / Od / Do) + zielona plakietka „2 godziny · wolna pora idealnie pasuje do harmonogramu Magdy"
- **Sekcja 02 — Pies**: karty radio z avatarem, imieniem, badge'em szczepień i meta (rasa, waga, wiek, sterylizacja). Klikalne. Pod listą „+ Dodaj kolejnego psa"
- **Sekcja 03 — Wiadomość**: textarea z licznikiem znaków 0/500
- **Sekcja 04 — Regulamin**: 4 checkboxy (3 wymagane + 1 opcjonalny SMS), z linkami i czerwonym `· wymagane`. Pod nimi help-row „Masz pytania? → Napisz do gospodarza"

**Prawa strona (sticky):**
- Miniatura ogrodu (placeholder zielonej tekstury) + nazwa, lokalizacja, ocena 4,8 (23)
- **Szczegóły**: data, godziny (15:00–17:00 · 2 godz.), pies (Łata 18 kg) — każda linia z ikoną w kolorowym kwadracie
- **Koszty**: 45 zł × 2 godz. = 90 zł, prowizja 9 zł, kod rabatowy −10 zł (na zielono)
- **Razem 89 zł** dużym fontem + „w tym 23% VAT"
- Zielony CTA „Przejdź do płatności" **disabled** dopóki nie zaznaczysz wszystkich 3 wymaganych zgód (sprawdź — odznacz/zaznacz, włącza się)
- „Płatność obsługiwana przez Stripe" + polityka anulacji „bezpłatna do 24 godz."

Daj znać jeśli chcesz: realny ekran płatności Stripe (krok 2), ekran potwierdzenia (krok 3), albo wariant „rezerwacja czeka na akceptację gospodarza".

## User

Też zrób realny ekran płatności

## Assistant

_[tool: write_file]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Gotowe — `Payment.html`. Co znajdziesz:

**Lewa strona:**
- Stepper: 1 ✓ (zielony, zrobione) → **2 Płatność (aktywny)** → 3 Potwierdzenie
- **6 metod płatności** w siatce 2×3 — karta (zaznaczona), BLIK, Przelewy24, Apple Pay, Google Pay, Przelew tradycyjny. Każda z kolorowym logo i opisem. Kliknięcie przełącza widok formularza
- **Stripe-style formularz karty**:
  - Pojedynczy „compound input" (jak prawdziwy Stripe Element) z ramkami między polami: numer karty + auto-detect brandu (VISA/MC/AMEX → ikonka z prawej), MM/RR, CVC, właściciel
  - Numer karty formatuje się w 4-grupy podczas pisania, data wstawia ` / ` po 2 cyfrach
  - Fokus aktywuje fioletową ramkę Stripe'a (#635BFF) z miękkim glowem
  - Checkbox „Zapisz tę kartę dla przyszłych rezerwacji"
- **Alternatywny formularz BLIK** (pojawia się po wybraniu BLIK): 6 osobnych pól na cyfry z auto-skokiem fokusu, info o ważności 2 minut
- **Dane do rozliczenia**: e-mail, imię, nazwisko, adres, kod, miasto, kraj (select). Pod nimi rozwijane „Chcę otrzymać fakturę na firmę"

**Prawa strona (sticky):**
- Te same elementy co w Booking Form, ale CTA mówi teraz **„Zapłać 89 zł"** z ikoną kłódki
- Trust bar pod CTA: 3-D Secure · PCI DSS · obsługiwane przez Stripe

**Bonus — symulacja płatności**: kliknij „Zapłać 89 zł" → pojawia się modal z spinnerem „Autoryzacja płatności… Łączymy się z bankiem przez 3-D Secure" (3,5 sek). Realistyczne UX dla onboardingu.

Daj znać czy chcesz: krok 3 (potwierdzenie z animacją sukcesu), wariant błędu płatności (deklinacja karty), albo widok zwrotu pieniędzy.

## User

Verifier agent check completed

## Assistant

_[tool: str_replace_edit]_

_[tool: done]_

Naprawione — pola BLIK mają teraz `min-width: 0` i `width: 100%`, więc grid faktycznie rozdziela szerokość na 6 równych kolumn po ~52px zamiast pozwalać każdej rozdąć się do treści.

## User

nasza aplikacja tylko obsługuje stripe, więc tylko karty płatnicze, przynajmniej na razie

## Assistant

_[tool: str_replace_edit]_

_[tool: done]_

Uproszczone — tylko karty:

- **Usunięty** wybór metod płatności (BLIK, P24, Apple Pay, Google Pay, przelew) wraz z całą logiką przełączania i formularzem BLIK
- Sekcja nazywa się teraz **„Dane karty"** z podtytułem „Płatność kartą Visa, Mastercard lub American Express. Obsługiwane przez Stripe"
- Dodany pasek **„Akceptujemy"** z ikonkami VISA / Mastercard / AMEX nad formularzem, żeby było jasne co jest wspierane
- Formularz Stripe-style (numer + data + CVC + właściciel) bez zmian — dalej z fioletową ramką focusu i auto-detect brandu

Daj znać jeśli chcesz dodać Apple Pay / Google Pay później — Stripe wspiera je natywnie przez ten sam integration.

## User

Wygeneruj dwa ekrany: rejestracja i logowanie. Kazdy jako
wycentrowana karta na neutralnym tle:

Logowanie: pola email + haslo, checkbox "Zapamietaj mnie",
link "Zapomniales hasla?", duzy przycisk "Zaloguj sie",
nizej link "Nie masz konta? Zarejestruj sie".

Rejestracja: wybor typu konta na samej gorze (toggle: Klient /
Gospodarz), pola imie, nazwisko, email, telefon, haslo,
powtorz haslo, checkbox RODO, checkbox regulamin, duzy
przycisk "Zaloz konto".

Po lewej stronie obu ekranow zdjecie psa biegajacego po ogrodzie
zamiast pustej przestrzeni.

## Assistant

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Gotowe — dwa ekrany z gołego SVG, bez generowanych zdjęć:

**Po lewej** (oba ekrany): wektorowa ilustracja ogrodu — niebo z gradientem, słońce, dalekie wzgórza z drzewami, trawnik z ogrodzeniem-płotem, **biegnący pies** w stylu „złotego retrievera" z obrożą w kolorze marki, motyl, ślady łap za psem, porzucona piłka, kępki traw. Na ilustracji pływa logo PsiPark u góry i karta z testimonialem na dole (klient Kasia / gospodyni Magda z różnymi wypowiedziami).

**`Login.html`**:
- Tytuł „Cześć ponownie!" + podtytuł
- E-mail + hasło (z toggle pokazywania, ikoną kłódki)
- „Zapamiętaj mnie na 30 dni" + link „Zapomniałeś hasła?" (przy etykiecie pola hasła, jak na większości platform)
- Duży zielony CTA „Zaloguj się"
- Divider „lub" + Google/Apple SSO
- Stopka linkiem do rejestracji

**`Register.html`**:
- **Toggle Klient / Gospodarz** na górze — z ikonami (łapa / płot) i podpisami „Szukam ogrodu" / „Wynajmuję ogród". Aktywny dostaje ciemniejszy box i zielony kafelek z ikoną
- Imię + nazwisko w 2-kolumnowym gridzie
- E-mail + telefon + hasło + powtórz hasło
- **Live password strength meter** (4 segmenty: czerwony → pomarańczowy → jasnozielony → ciemnozielony, z labelką „Słabe / OK / Dobre / Mocne")
- 3 checkboxy: RODO (wymagane), Regulamin (wymagane), opcjonalny newsletter
- CTA „Załóż konto" jest **disabled** dopóki nie zaznaczysz obu wymaganych zgód
- SSO + link do logowania

Pliki współdzielą `assets/auth.css` i `assets/garden-dog.svg`, więc dalsze tweaki kolorów/typografii zrobisz w jednym miejscu.

## User

Wygeneruj panel uzytkownika typu Klient (wlasciciel psa).
Layout z lewa nawigacja sidebar i glowna trescia po prawej.

Sidebar: avatar i imie uzytkownika na gorze, ponizej menu:
"Moje rezerwacje", "Moi pupile", "Recenzje", "Wiadomosci",
"Ustawienia konta", "Wyloguj sie".

Glowna tresc na zakladce "Moje rezerwacje": filtr "Nadchodzace /
Zakonczone / Anulowane", lista kart rezerwacji (miniatura ogrodu,
data, godzina, status z kolorowym badge, cena, przyciski "Szczegoly",
"Pobierz fakture PDF", "Anuluj").

Na zakladce "Moi pupile" karty psow z avatarem, imieniem, rasa,
wiekiem, statusem szczepien i przyciskami edycji.

## Assistant

_[tool: write_file]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Gotowe — `Client Panel.html`. Co znajdziesz:

**Sidebar (sticky, 280px):**
- Logo PsiPark u góry
- Karta użytkownika z avatarem (KN), imieniem „Katarzyna Nowak" i plakietką roli „Klient"
- Menu z sekcją „Konto":
  - **Moje rezerwacje** (3, aktywne — zielone wypełnienie)
  - **Moi pupile** (2)
  - Recenzje
  - Wiadomości (czerwony badge „2" jako nieprzeczytane)
  - Ustawienia konta
- Sekcja „Pomoc" z linkiem do centrum pomocy
- **Wyloguj się** na dole w kolorze danger

**Zakładka „Moje rezerwacje" (domyślna):**
- Header z powitaniem + CTA „Znajdź ogród"
- **4 statystyki**: 12 rezerwacji (akcent zielony), 28h spędzonego, 8 recenzji, 624 zł wydane
- **Filtr tabs**: Nadchodzące (1) / Zakończone (10) / Anulowane (1) — działa, przełącza karty + pole wyszukiwania
- **Karty rezerwacji** (3-kolumnowy layout): miniatura | info | side panel
  - Status badges: Potwierdzona (zielona), Zakończona (szara), Anulowana (czerwona)
  - Każda karta ma datę, godziny, imię psa, lokalizację, gospodarza, ID rezerwacji
  - **Przyciski**: Szczegóły, Faktura (PDF download), Anuluj (dla nadchodzących) lub Oceń pobyt / Zarezerwuj ponownie (dla zakończonych)
- Anulowana rezerwacja ma przekreśloną cenę i info o zwrocie
- **Empty state** gotowy, jeśli ktoś nie ma rezerwacji

**Zakładka „Moi pupile":**
- Karta dla każdego psa: duży avatar z literą + przezroczystym znakiem łapki, status „Aktywny"
- Meta: rasa, waga, płeć, wiek, od kiedy w PsiPark
- **Statystyki**: liczba rezerwacji, łączny czas, ulubiony typ ogrodu
- **Status zdrowia** z 3 wskaźnikami (kolorowe kropki z poświatą): szczepienia, odrobaczanie, książeczka zdrowia
  - Łata: wszystko OK + jedno ostrzeżenie (zdjęcie książeczki)
  - Borys: zaległe odrobaczanie (czerwona kropka)
- Akcje: Edytuj profil, Dodaj zdjęcia, Dokumenty
- Karta „+ Dodaj kolejnego psa" z dashed border

Sidebar i tabs nawigują między sobą — kliknij „Moi pupile" w sidebarze, zobaczysz drugą zakładkę.

Daj znać czy chcesz: panel gospodarza (z kalendarzem rezerwacji, statystykami zarobków), panel wiadomości, czy szczegóły konkretnej rezerwacji.

## User

Wygeneruj panel uzytkownika typu Gospodarz (wlasciciel terenu).
Layout z sidebar po lewej i glowna trescia po prawej.

Sidebar: "Moje ogrody", "Rezerwacje", "Harmonogram", "Wiadomosci",
"Zarobki", "Ustawienia".

Glowna tresc na zakladce "Rezerwacje": tabela rezerwacji z
kolumnami: zdjecie klienta + imie, zdjecie psa + imie, ogrod,
data i godzina, kwota, status (Oczekuje / Zaakceptowane /
Odrzucone), akcje (Akceptuj / Odrzuc dla pending, Szczegoly dla
reszty).

Na zakladce "Moje ogrody" karty ogrodow z miniaturą, tytulem,
statusem (Aktywne / Oczekuje weryfikacji), liczba rezerwacji
w tym miesiacu, srednia ocena, przyciski "Edytuj", "Usun",
"Zobacz".

## Assistant

_[tool: write_file]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Gotowe — `Host Panel.html`. Co nowego względem panelu klienta:

**Sidebar:**
- Karta gospodarza z avatarem MK + ikoną weryfikacji + plakietką „Super-Gospodarz"
- Sekcja „Zarządzanie": Moje ogrody (3), **Rezerwacje (czerwony badge 4 — wymagają decyzji)**, Harmonogram, Wiadomości (5), Zarobki
- **Widget zarobków**: ciemnozielony gradient z „1 847 zł w maju" i delta „+24% vs. kwiecień"
- Foot: „Gospodarz od 2024"

**Zakładka „Rezerwacje" (domyślna):**
- Nagłówek z apelem o szybką decyzję (związany z utrzymaniem statusu)
- **4 statystyki**: 4 czeka (najstarsza 6h temu, kolor ostrzegawczy), 23 zaakceptowane (+18%), 28 min średnia odpowiedzi (Top 5%), 4,92 ocena (+0,07)
- **Tabs**: Wszystkie (12) / **Oczekuje (4)** z pulsującą pomarańczową kropką / Zaakceptowane (7) / Odrzucone (1)
- **Tabela rezerwacji** z gradientem hover w zieleni:
  - Wiersze pending mają **pomarańczowy lewy border** + ledwo widoczne tinto-tło
  - Kolumny: Klient (avatar + imię + reputacja „12 rez. · 4,9 ★"), Pies (avatar w kwadracie + imię + rasa/waga), Ogród (nazwa + lokalizacja), Data i godzina, Kwota (brutto + netto), Status, Akcje
  - **Pending → przyciski Akceptuj (zielony) + Odrzuć (czerwony soft)** — klikalne, faktycznie zmieniają status wiersza, aktualizują liczniki w tabach
  - Zaakceptowane → „Szczegóły" + ikona wiadomości
  - Odrzucone → tylko „Szczegóły"
- Paginacja u dołu

**Zakładka „Moje ogrody":**
- 3 karty + dodaj nowy
- Każda karta: miniatura 16:9, **plakietka statusu lewy górny** (Aktywny / **Oczekuje weryfikacji** dla nowego sadu), licznik zdjęć w prawym dolnym
- Statystyki na 3 kolumny: rezerwacje w maju, ocena z gwiazdką, zarobki (zł)
- Sad jabłoniowy ma specjalny układ statystyk: „W kolejce / Min. 5 zdjęć / ~24h zostało"
- Stopka karty: cena/h + przyciski **Zobacz / Edytuj / Usuń** (kosz, czerwony)
- Karta „Dodaj nowy ogród" z motywacją „Średni gospodarz zarabia 1 800 zł / mc"

Klient w prawej dolnej części czekuje – kliknij Akceptuj na pierwszym wierszu i zobaczysz jak liczniki na tabach się aktualizują na żywo.

