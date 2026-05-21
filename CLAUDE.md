# CLAUDE.md - Handoff für Claude Code

> Dieses Dokument enthält den vollständigen Kontext für das Wexplore Casting-Auswahl-Projekt. Claude Code liest diese Datei automatisch beim Start.

## Projekt-Überblick

**Name:** Casting-Auswahl-Webpage RE/MAX FSBO
**Zweck:** Eine statische Webseite auf GitHub Pages, über die unsere Werbeagentur (papabogner) Casting-Vorschläge von Wexplore Productions (Filmproduktion) durchgehen und mit Ja/Vielleicht/Nein bewerten kann. Die Auswahl wird per Mail an Wexplore gesendet.

**Live-URL:** https://wexalex.github.io/ (vermutlich, bitte beim Owner verifizieren)
**GitHub-Repo:** wexalex/casting-remax (vermutlich)
**Owner/Ansprechperson:** Alex Gruber, alex@wexplore.at, Wexplore Productions GmbH, Linz

## Tech-Stack

- **Reine Statics:** HTML, CSS, Vanilla JavaScript - keine Frameworks, kein Build-Step
- **Hosting:** GitHub Pages
- **Daten:** `models.json` als Single Source of Truth
- **Mail-Versand:** Web3Forms (Free-Plan, EU-Server)
- **Schutz:** JS-Passwort-Gate (Komfort, kein echter Schutz) + noindex Meta-Tags

## Dateistruktur

```
/
├── index.html              Seitenstruktur, Login-Gate, Send-Modal
├── app.js                  Logik: Voting, Filter, Suche, Send-Flow
├── styles.css              Komplettes Styling (Wexplore Design)
├── models.json             Die Models - hier passieren die häufigsten Änderungen
├── wexplore-logo.png       Wexplore Logo (transparent, Anthrazit + goldenes X)
├── papabogner-logo.png     papabogner Logo (transparent, Anthrazit)
├── remax-logo.png          RE/MAX Logo (transparent, mit Original-Farben)
├── README.md               User-facing Doku
└── CLAUDE.md               Diese Datei
```

## Design-System (WICHTIG für Konsistenz)

### Farben (CSS-Variablen in styles.css)
```css
--ink:           #0d0d0d   /* Schwarz für Text */
--ink-soft:      #1a1a1a   /* etwas weicher */
--graphite:      #3a3a3a   /* Sekundärtext */
--smoke:         #6b6b6b   /* Tertiärtext, Labels */
--whisper:       #b8b8b8   /* Placeholders, Disabled */
--paper:         #f6f4ee   /* Background warm */
--paper-warm:    #efece4   /* Card Background */
--white:         #ffffff
--gold:          #dbb559   /* BRAND GOLD - aus dem Wexplore-Logo extrahiert */
--gold-deep:     #a07f2f   /* Hover/Akzent dunkler */
--gold-soft:     #f0e3b8   /* Hinweis-Hintergrund */
--yes:           #2f5d3e   /* Vote: Ja */
--maybe:         var(--gold)
--no:            #8a3a3a   /* Vote: Nein, Warnungen */
```

### Typografie
- **Font:** Inter (Google Fonts) - als Stand-in für ES Klarheit (die kommerzielle Wexplore-Schrift)
- **Wenn ES Klarheit als Webfont-Files verfügbar wird:** Tausch in `index.html` (Google Fonts Link raus, lokale `@font-face` rein) und in `styles.css` der `--sans` Variable
- **Hierarchie:** weight 500 für Headlines, 400 für Body, letter-spacing negativ (-0.02 bis -0.035em) für große Schriften, positiv (0.18-0.32em) und uppercase für Labels/Kicker

### Design-Prinzipien
- Editorial, schwarz/weiß mit Gold-Akzent
- Viel Weißraum, dezente Borders statt Schatten
- Logos in Header: Wexplore × papabogner × RE/MAX mit dezenten "×" als Trenner
- Cards mit transparentem 3px Top-Border-Highlight bei Voting (grün/gold/rot)

### WICHTIG: Schreibweise
- **Immer kurze Bindestriche** verwenden: `-` (Hyphen)
- **Niemals lange Striche:** `—` (em-dash) oder `–` (en-dash) sind verboten
- Alex achtet darauf, das wurde mehrfach betont

## Die models.json - Struktur

Jeder Model-Eintrag:
```json
{
  "id": "vorname-nachname",          // eindeutig, lowercase, mit Bindestrich
  "name": "Vorname N.",              // Anzeigename (Nachname meist nur Initial)
  "category": "Spiritualistin",      // siehe Kategorien unten
  "status": "Favorit",               // siehe Status unten
  "imageUrl": "https://...jpg",      // people2people Setcard-Thumbnail
  "setcardUrl": "https://...html",   // Detail-Setcard
  "agencyUrl": "https://...html",    // meist identisch mit setcardUrl
  "location": "Wien",                // Wohnort, kann null sein
  "availability": "Verfügbar",       // siehe unten - WICHTIG für Filter
  "travel": "Wien (vor Ort)",        // Anreise, kann null sein
  "notes": null                      // Agentur-Hinweise oder null
}
```

### Kategorien
Aktuell verwendet: `"Spiritualistin"`, `"Raver"`, `"Kids"`, `"Dog Owner"`
Neue Kategorien sind ok, müssen nicht vordefiniert werden - die Kategorie-Filter-Buttons generieren sich automatisch.

### Status-Werte
- `"Favorit"` - Hauptkandidat, schwarzer Tag oben links
- `"Favorit (nachgereicht)"` - später dazugekommen, gleicher Look
- `"Backup"` - Backup-Option, weißer Tag
Andere Werte erlaubt, werden als grauer Tag dargestellt.

### Availability - CRITICAL für Filter
- **String muss mit "Verfügbar" beginnen** (case-sensitive), damit das Model im Default-Filter "Verfügbar" auftaucht
- Beispiele die FUNKTIONIEREN: `"Verfügbar"`, `"Verfügbar (16.06. bestätigt)"`, `"Verfügbar (Bestätigung am 18.05.)"`
- Beispiele die NICHT als verfügbar zählen: `"verfügbar"` (lowercase), `"Sicher verfügbar"` (anderes Anfangswort), `"Offen - keine Rückmeldung"`, `"Abgesagt"`

### Travel - Warnung-Highlighting
Im Travel-String werden bestimmte Keywords automatisch rot gefärbt (siehe `isTravelWarning()` in app.js):
- `"flug"`, `"achtung"`, `"übernachtung"` → Warnung-Markierung

## Wichtige Konstanten in app.js

```js
const PASSWORD = 'wexplore';                                           // Login-Passwort (Zeile ~25 in index.html script)
const WEB3FORMS_KEY = '1dce030d-d365-4be5-a295-c82daee54fb4';          // Web3Forms Access Key für Mail-Versand
const STORAGE_KEY = 'wexplore-casting-remax-v1';                       // localStorage Key für Votes
```

## Funktionen im Überblick

1. **Login-Gate:** Vorschalt-Seite mit Passworteingabe, sessionStorage-Persistenz
2. **Filter:** Status (Verfügbar als Default, Alle, Offen, Ja, Vielleicht, Nein), Kategorie, Volltext-Suche
3. **Voting:** Ja/Vielleicht/Nein pro Model, im localStorage gespeichert
4. **Detail-Modal:** Klick aufs Bild öffnet Vollansicht mit Notizfeld (lokal gespeichert, nicht im Send)
5. **Send-Modal:** Klick auf "Auswahl an Wexplore senden" öffnet Modal für Name + optionaler Kommentar
6. **Mail-Versand:** Web3Forms-API, Fallback auf Clipboard bei Fehler
7. **Versand-Inhalt:** Nur Ja+Vielleicht, formatierter Plaintext-Block

## Häufigste Änderungen (in Reihenfolge der Häufigkeit)

### 1. Verfügbarkeit eines Models updaten
Datei: `models.json`
Find: `"id": "vorname-n"` → Block aufmachen → `"availability"` ändern
Beispiel: `"Offen - keine Rückmeldung"` → `"Verfügbar"`

### 2. Neue Models hinzufügen
Datei: `models.json`
Füge neuen Block am Ende des Arrays hinzu (vor dem schließenden `]`)
- Komma am Ende des vorherigen Blocks NICHT vergessen
- Setcard-URL und Image-URL von people2people kopieren
- Bei Image-URL: Format ist meist `https://www.people2people.co.at/includes/phpthumb/phpThumb.php?src=/userupload/editorupload/files/.../Vorname-N_-Bild-kl.jpg&h=400&w=360&zc=1`

### 3. Models rausnehmen
Datei: `models.json`
Block samt umschließender `{...}` und Komma löschen.
Saubere JSON achten - kein Komma nach dem letzten Block.

### 4. Text-Änderungen auf der Seite
Datei: `index.html`
Suche nach dem Text in der Hero-Sektion (`<section class="hero">`) oder im "So funktioniert's"-Block (`<div class="how-it-works">`)

### 5. Projektname ändern (bei neuen Projekten)
Datei: `index.html`
Suche und ersetze: `RE/MAX FSBO` (4-5 Stellen)
Datei: `app.js`
Suche und ersetze: `RE/MAX FSBO` (2 Stellen: Mail-Subject und Result-Header)

## Workflow für Claude Code

1. Bei jeder Änderung: `models.json` Validität checken (`python3 -c "import json; json.load(open('models.json'))"`)
2. Bei JS-Änderungen: Syntax-Check (`node --check app.js`)
3. Niemals lange Bindestriche einbauen (`—`, `–`)
4. Commit-Messages auf Deutsch und kurz: z.B. `Ben D. auf verfügbar`, `4 neue Buben-Vorschläge`, `Headline angepasst`
5. Direkt zum `main` Branch pushen - kein Feature-Branch-Workflow nötig
6. Nach jedem Push: kurz dem User sagen "Live in ~30s auf [URL]"

## Was NICHT verändert werden sollte ohne Rückfrage

- Das Design-System (Farben, Schriften, Layout)
- Die Web3Forms-Integration (außer der Key wird gewechselt)
- Das Login-Gate (Sicherheits-Logik)
- Die Logo-Dateien (außer es kommen neue von Alex)

## Kontext aus früheren Sessions

- Projekt startete als Brief von Alex an Claude.ai (Web-Version) im Mai 2026
- 28 Models aktuell im System (Stand 21.05.2026), 4 Kategorien
- Erste Auswahl von papabogner ist eingegangen, weitere Buben-Vorschläge folgen
- Das System soll als Template für künftige Casting-Projekte mit anderen Kunden/Agenturen dienen - Refactoring zu konfigurierbarem Setup steht aus

## Mögliche zukünftige Aufgaben

- Refactoring: Projektspezifische Werte in `config.js` auslagern
- GitHub Template-Repo einrichten
- Optional: Notion als alternative Datenquelle für Models
- Optional: ES Klarheit Webfont einbauen sobald verfügbar
- Optional: Drag-and-Drop Sortierung für Reihenfolge der Auswahl

---

**Bei Fragen oder Unklarheiten: Lieber bei Alex nachfragen als raten. Alex ist kein Entwickler aber sehr gut darin, Anforderungen klar zu formulieren.**
