# Casting Auswahl — RE/MAX × Wexplore

Eine einfache Auswahl-Webseite für die Modelagentur. Models werden im Grid angezeigt, pro Person kann **Ja / Vielleicht / Nein** gewählt werden, die Auswahl wird im Browser gespeichert (localStorage), am Ende kann das Ergebnis kopiert werden.

Keine Frameworks, kein Build. Drei Dateien + JSON.

---

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Seitenstruktur |
| `styles.css` | Design (Wexplore: Cormorant + Inter, Gold-Akzent) |
| `app.js` | Logik (Voting, Filter, Suche, Modal, Copy) |
| `models.json` | **Die Daten — hier pflegt ihr/wir die Modelliste** |

---

## GitHub Pages aktivieren (Schritt für Schritt)

1. Auf [github.com](https://github.com) ein neues Repository anlegen, z.B. `casting-remax`. Sichtbarkeit egal — Public ist einfacher, Private geht auch (Pages braucht dann GitHub Pro).
2. Die vier Dateien aus diesem Ordner hochladen:
   - im Browser: **Add file → Upload files** → alle reinziehen → **Commit changes**.
3. Im Repo zu **Settings → Pages** gehen.
4. Bei **Source** auswählen: `Deploy from a branch`.
5. Branch: `main`, Folder: `/ (root)` → **Save**.
6. ~1 Minute warten, dann oben auf der Pages-Seite erscheint die URL, z.B.
   `https://dein-github-username.github.io/casting-remax/`
7. Diese URL an die Agentur schicken — fertig.

---

## Daten pflegen (`models.json`)

Pro Person ein Eintrag im Array. Format:

```json
{
  "id": "vorname-nachname",
  "name": "Vorname N.",
  "category": "Spiritualistin",
  "status": "Favorit",
  "imageUrl": "https://www.people2people.co.at/...jpg",
  "setcardUrl": "https://www.people2people.co.at/...html",
  "agencyUrl": "https://www.people2people.co.at/...html",
  "location": "Wien",
  "availability": "Verfügbar",
  "travel": "Wien (vor Ort)",
  "notes": null
}
```

Felder die fehlen können: `imageUrl`, `notes`, `setcardUrl`, `agencyUrl` — dann einfach `null` oder weglassen.

**Wichtig**: Wenn `imageUrl` fehlt, zeigt die Karte automatisch die Initialen als Platzhalter — sieht trotzdem gut aus.

`setcardUrl` und `agencyUrl` dürfen identisch sein (üblich bei people2people).

Nach jeder Änderung: Datei im Repo wieder hochladen / commiten → ~1 Minute → Seite neu laden.

---

## Funktionen im Überblick

- **Voting** Ja / Vielleicht / Nein direkt auf der Karte. Nochmal klicken = abwählen.
- **Bleibt gespeichert** im Browser (localStorage). Reload schadet nicht.
  - Das heißt aber auch: **jede Person, die die Seite öffnet, hat ihre eigene Auswahl.** Wer das Ergebnis bekommen will, klickt unten rechts auf "Ergebnisse kopieren" und schickt's per Mail/Slack.
- **Filter & Suche**: Status (Ja / Vielleicht / Nein / Offen / Alle), Kategorie (Spiritualistin / Raver / Kids / Dog Owner), Volltextsuche über Name, Ort, Verfügbarkeit, Anreise.
- **Detail-Modal**: Klick aufs Bild öffnet die volle Ansicht inkl. optionalem Notizfeld (nur für euch).
- **Anreise-Warnung**: Bei Flug-Anreisen oder Anreiseort-Änderungen wird das rot markiert.

---

## "Ergebnisse kopieren" verwenden

1. Rechts unten auf den großen schwarzen Button **"Ergebnisse kopieren"** klicken.
2. Das Ergebnis liegt jetzt in der Zwischenablage — strukturiert nach Ja / Vielleicht / Offen / Nein, inklusive Verfügbarkeit, Anreise und Setcard-Link pro Person.
3. In eine Mail oder Slack-Nachricht einfügen (Cmd+V / Strg+V).

Falls die Zwischenablage im Browser blockiert ist (selten), öffnet sich stattdessen ein neuer Tab mit dem Text zum manuellen Kopieren.

---

## Lokal testen (optional)

Wenn du es vor dem Push lokal anschauen willst, einfach im Ordner ein kleiner Server:

```bash
# mit Python
python3 -m http.server 8000
# dann im Browser: http://localhost:8000
```

Doppelt-Klicken auf `index.html` funktioniert **nicht** vollständig — der Browser blockiert dann `fetch('models.json')`. Lokaler Server oder GitHub Pages, sonst greift der Fallback-Datensatz.

---

## Anpassungen

- **Andere Akzentfarbe**: in `styles.css` ganz oben die Variable `--gold` ändern.
- **Anderer Projektname**: in `index.html` den Text bei `meta-value` und `kicker` anpassen.
- **Andere Statusbezeichner**: in `app.js` in `buildResultText()` die `sections`-Labels anpassen.
