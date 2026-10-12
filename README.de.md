# Contrast Grid

[English](README.md) · **Deutsch**

Prüft beliebig viele Kombinationen aus Text- und Hintergrundfarbe auf einen Blick gegen die Kontrastanforderungen der **WCAG 2.2**. Jede Farbe wird mit jeder anderen kombiniert. Jede Kachel zeigt das Kontrastverhältnis und die erreichte Stufe, auf Wunsch auch den nächstbesseren Farbton.

Das Tool ist für den Desktop gedacht, läuft komplett im Browser und hat keine Laufzeit-Abhängigkeiten.

---

## Inhalt

- [Funktionen](#funktionen)
- [Kontrastberechnung](#kontrastberechnung)
- [URL-Parameter](#url-parameter)
- [Entwicklung](#entwicklung)
- [Tests](#tests)
- [Veröffentlichung](#veröffentlichung)
- [Projektstruktur](#projektstruktur)
- [Browserunterstützung](#browserunterstützung)
- [Danksagung](#danksagung)

---

## Funktionen

### Farben eingeben

- **Eine Farbe pro Zeile, in jedem CSS-Format:**

  | Format | Beispiel |
  |---|---|
  | Hex | `#FF8000`, `#F80`, auch ohne `#` |
  | Farbnamen | `orange`, `rebeccapurple` |
  | RGB | `rgb(255, 128, 0)`, `rgb(255 128 0)` |
  | HSL / HWB | `hsl(30 100% 50%)`, `hwb(30 0% 0%)` |
  | Lab / LCH / OKLab / OKLCH | `lab(67 43 74)`, `oklch(0.73 0.18 55)` |
  | `color()` | `color(srgb 1 0.5 0)`, `color(display-p3 1 0.5 0)` |
  | Farbmischung | `color-mix(in srgb, red 75%, yellow)` |

  Farben außerhalb von sRGB (zum Beispiel Display P3) werden auf sRGB beschnitten, weil die WCAG-Formel nur dafür definiert ist.

- **Abgelehnt** werden Werte, die keine feste Farbe ergeben: transparente Farben, `currentcolor`, Systemfarben wie `Canvas`, `light-dark()`, `var()` und CSS-Schlüsselwörter wie `inherit`.

- **Labels** folgen nach einem Semikolon: `#FF8000; Orange`. Labels dürfen selbst Kommas enthalten.

- **Die eigene Schreibweise bleibt erhalten.** Wer `hsl(30 100% 50%)` eingibt, findet das auch nach dem Sortieren oder Entfernen anderer Farben noch so im Textfeld.

- **Hinweise unter dem Feld** nach einer kurzen Tipp-Pause:
  - ungültige Zeilen, z. B. „Line 2 is not a valid color: `nope`."
  - beim häufigsten Fehler, einem Komma statt Semikolon vor dem Label, ein Korrekturvorschlag: „Separate the label with a semicolon: `rgb(255, 0, 0); Red`."
  - doppelte Farben, auch in unterschiedlicher Schreibweise: „Line 3 repeats line 1."

  Ungültige Zeilen bleiben an ihrem Platz, auch wenn Farben entfernt, verschoben oder hinzugefügt werden.

- **Gemeinsame oder getrennte Listen:** Standardmäßig dient eine Liste für Zeilen und Spalten. Mit „Use separate lists for text and backgrounds" lassen sich Hintergrundfarben (Zeilen) und Textfarben (Spalten) getrennt pflegen, und mit „Swap text and backgrounds" tauschen beide Listen den Platz.

- **Pipette:** „Pick a color from the screen" nimmt eine Farbe von einer beliebigen Stelle des Bildschirms auf. Das geht nur in Chrome und Edge, in anderen Browsern ist der Button ausgeblendet.

### Das Grid

- **Jede Kachel** zeigt das Kontrastverhältnis mit höchstens zwei Nachkommastellen (`21`, `15.7`, `4.49`) und die erreichte Stufe:

  | Stufe | Verhältnis | Bedeutung |
  |---|---|---|
  | **AAA** | ab 7 | erhöhter Kontrast für normalen Text (WCAG 1.4.6) |
  | **AA** | ab 4.5 | Mindestkontrast für normalen Text (WCAG 1.4.3) |
  | **Large** | ab 3 | nur für große Schrift (ab 24 px bzw. 18,66 px fett) sowie Bedienelemente und Grafiken (WCAG 1.4.11) |
  | **Fail** | unter 3 | besteht keine Stufe |

- **Filter** blenden einzelne Stufen aus, zum Beispiel alle durchgefallenen Kombinationen. Sie dienen zugleich als Legende, mit Kürzel und Verhältnis jeder Stufe.
- **Kachelgröße** von 45 bis 300 px, per Regler oder als Zahl.
- **Fixierte Kopfzeile und -spalte:** Beim Scrollen bleiben die Farbfelder sichtbar.
- **Korrekte Ergebnisse auch im Windows-Kontrastdesign:** Kacheln und Farbfelder zeigen dort weiterhin die echten Farben, und gerechnet wird immer mit den eingegebenen Werten.

### Nächstbessere Farbe vorschlagen

Unterhalb von AAA erscheint oben rechts in der Kachel ein Zauberstab. Ein Klick fügt die Textfarbe ein, die **die nächste Stufe mit der kleinstmöglichen Änderung** erreicht:

- Es ändert sich nur die Helligkeit im Farbraum OKLCH. Farbton und Farbigkeit bleiben gleich, Orange bleibt also Orange.
- Die neue Farbe steht direkt nach der Ausgangsfarbe, ihr Label bekommt die erreichte Stufe, z. B. `#E97400; Orange (Large)`.
- Von dort aus führt ein weiterer Klick zur nächsten Stufe (Large → AA → AAA).
- Ist die nächste Stufe auf diesem Hintergrund mit keiner Helligkeit erreichbar, weil selbst Schwarz und Weiß nicht genügen, ist der Button deaktiviert und sagt das.

### Farben verwalten

Beim Überfahren oder Fokussieren eines Farbfelds erscheinen:

| Button | Funktion |
|---|---|
| ⧉ | Hex-Wert in die Zwischenablage kopieren (wird kurz zu ✓) |
| ✕ | Farbe entfernen |
| ‹ › bzw. ˄ ˅ | Spalte bzw. Zeile um eine Position verschieben |
| ⋮⋮ | Ziehen zum Verschieben; am Rand scrollt das Grid mit |

Bei gemeinsamer Liste („Your colors") verschiebt und entfernt eine Aktion die Farbe in Zeile und Spalte zugleich.

### Teilen und Wiederfinden

- **Der komplette Stand steht in der Adresse:** Farben, Labels, getrennte Listen, Kachelgröße und ausgeblendete Stufen. Eine kopierte Adresse öffnet das Grid bei anderen genauso.
- **Zurück verlässt die Seite, Vorwärts kehrt zum letzten Stand zurück.** Änderungen erzeugen keine Einträge im Browserverlauf.

### Feedback

„Feedback & bug reports" in der Sidebar öffnet eine E-Mail mit vorausgefülltem Betreff und der aktuellen Seitenadresse. So lässt sich ein gemeldeter Fehler mit einem Klick nachstellen.

### Darstellung

- **Helles und dunkles Design** folgen automatisch der Einstellung des Betriebssystems. Die Kacheln zeigen in beiden Designs die unveränderten Farben.
- **Systemschrift:** Es werden keine Schriften geladen.

### Barrierefreiheit

- **Tastatur:** Alle Funktionen sind ohne Maus bedienbar, auch das Verschieben (WCAG 2.1.1, 2.5.7).
- **Sprunglink** „Skip to contrast grid" beim ersten Tab (WCAG 2.4.1).
- **Klickflächen** von mindestens 24 × 24 px (WCAG 2.5.8).
- **Screenreader:** beschriftete Buttons, Landmarks, gruppierte Filter, Statusmeldungen beim Kopieren, Verschieben und Hinzufügen, verknüpfte Fehlermeldungen (WCAG 1.3.1, 3.3.1, 4.1.3).
- **Kontraste der Oberfläche** erfüllen selbst die WCAG, in beiden Designs.

---

## Kontrastberechnung

Das Verhältnis wird nach der WCAG-Formel aus der relativen Leuchtdichte berechnet:

$$\text{Kontrast} = \frac{L_\text{hell} + 0.05}{L_\text{dunkel} + 0.05}$$

Die Linearisierung der sRGB-Kanäle nutzt den Schwellenwert 0.04045 aus WCAG 2.2. Das Ergebnis wird auf zwei Nachkommastellen **abgerundet**, nie aufgerundet. WCAG verbietet, auf eine Grenze aufzurunden: 4.499:1 besteht AA nicht, auch wenn es gerundet 4.5 wäre.

---

## URL-Parameter

| Parameter | Inhalt | Beispiel |
|---|---|---|
| `fg` | Textfarben (Spalten), bei gemeinsamer Liste auch die Zeilen | `FF8000;+Orange%0A000000` |
| `bg` | Hintergrundfarben (Zeilen), nur bei getrennten Listen | `FFFFFF%0AF2F2F2` |
| `size` | Kachelgröße in px (45–300), nur wenn nicht 80 | `120` |
| `hide` | ausgeblendete Stufen, kommagetrennt, nur wenn welche ausgeblendet sind | `large,fail` |

Die Farblisten enthalten den Text der Eingabefelder, eine Farbe pro Zeile. Damit die Adresse kurz und lesbar bleibt, entfällt das `#` vor Hex-Farben am Zeilenanfang und wird beim Laden wieder ergänzt. `;`, `,` und Leerzeichen (als `+`) bleiben unkodiert.

---

## Entwicklung

**Voraussetzungen:** Node.js 24 und npm.

```bash
npm install
npm run dev        # Entwicklungsserver mit automatischem Neuladen
npm run build      # Produktions-Build nach dist/
npm run preview    # dist/ lokal ausliefern
```

### Lokale Platzhalter

Die Angaben für Impressum und Feedback-Adresse stehen nicht im Code. Lokal kommen sie aus der Datei `.env`:

```
VITE_IMPRINT_NAME=[Vorname Nachname]
VITE_IMPRINT_STREET=[Straße und Hausnummer]
VITE_IMPRINT_CITY=[PLZ und Ort]
VITE_IMPRINT_EMAIL=[E-Mail-Adresse]
VITE_FEEDBACK_EMAIL=[Feedback-Adresse]
```

Vite liest die `.env` nur beim Start. Nach einer Änderung muss der Entwicklungsserver neu gestartet werden.

---

## Tests

```bash
npm test            # alle Tests einmal
npm run test:watch  # bei jeder Änderung neu
```

Die Tests laufen mit [Vitest](https://vitest.dev/) in zwei Umgebungen:

| Umgebung | Dateien | Inhalt |
|---|---|---|
| Node | `tests/unit/` | Kontrastformel (darunter 100.000 zufällige Farbpaare gegen eine ungerundete Referenz), Vorschlagssuche, Adresse, Feedback-Link |
| Browser | `tests/browser/` | Farbeingabe und alle Formate, Grid, Buttons, Ziehen, Tastatur, Meldungen, Adressleiste |

Die Browser-Tests brauchen einen echten Browser, weil die Farbumrechnung Canvas und `CSS.supports` verwendet. **Lokal** nutzen sie das installierte Google Chrome. **In der Pipeline** lädt Playwright seinen eigenen Chromium.

---

## Veröffentlichung

Jeder Push auf `main` startet [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

1. Abhängigkeiten installieren und Chromium für die Tests laden
2. **Alle Tests ausführen.** Schlägt einer fehl, bleibt die bisherige Version online.
3. Prüfen, ob alle Repository-Variablen gesetzt sind
4. Bauen und auf GitHub Pages veröffentlichen

### Einmalige Einrichtung auf GitHub

- **Settings → Pages:** Quelle „GitHub Actions", eigene Domain eintragen, „Enforce HTTPS" aktivieren
- **Settings → Secrets and variables → Actions → Variables:**

  | Variable | Inhalt |
  |---|---|
  | `IMPRINT_NAME` | Vor- und Nachname |
  | `IMPRINT_STREET` | Straße und Hausnummer |
  | `IMPRINT_CITY` | PLZ und Ort |
  | `IMPRINT_EMAIL` | E-Mail-Adresse für das Impressum |
  | `FEEDBACK_EMAIL` | E-Mail-Adresse für Feedback |

Fehlt eine Variable, bricht der Workflow ab, damit keine Platzhalter veröffentlicht werden.

---

## Projektstruktur

```
├── index.html                 Anwendung
├── impressum.html             Impressum und Datenschutzerklärung
├── public/favicon.svg
├── src/
│   ├── main.js                Einstiegspunkt der Anwendung
│   ├── pages/impressum.js     Einstiegspunkt des Impressums
│   ├── styles/project.css     Farben, Abstände, Layout, helles und dunkles Design
│   ├── color/                 reine Berechnungen, laufen ohne Browser
│   │   ├── contrast.js        Kontrastformel und Stufen
│   │   └── suggest.js         Vorschlagssuche in OKLCH
│   ├── scripts/
│   │   ├── dom.js             kleine DOM-Hilfen
│   │   ├── events.js          Ereignisse zwischen Formular und Grid
│   │   └── feedback.js        Aufbau des Feedback-Links
│   └── components/
│       ├── color_form/        <cg-color-form>: Eingabe, Filter, Kachelgröße
│       │   ├── color_input.js Farbumrechnung, Zeilen lesen, prüfen und bearbeiten
│       │   └── query.js       Zustand in die Adresse schreiben und daraus lesen
│       ├── contrast_grid/     <cg-contrast-grid>: Grid, Buttons, Ziehen
│       └── icon/              <cg-icon>: Icons aus Bootstrap Icons
├── tests/
│   ├── unit/
│   └── browser/
├── vite.config.js             Build, Kürzel
└── vitest.config.js           Testumgebungen
```

Formular und Grid sind Web Components ohne Shadow DOM. Sie tauschen sich über Ereignisse aus, das Formular ist dabei die einzige Quelle der Wahrheit: Jede Änderung im Grid geht als Ereignis ans Formular, das den Text anpasst und das Grid neu zeichnen lässt.

---

## Browserunterstützung

Aktuelle Versionen von Chrome, Edge, Firefox und Safari. Ältere Browser können einzelne Teile nicht darstellen:

| Funktion | benötigt |
|---|---|
| Farbumrechnung | `OffscreenCanvas` (Safari ab 16.4) |
| helles und dunkles Design | `light-dark()` (Chrome 123, Firefox 120, Safari 17.5) |
| Pipette | EyeDropper API (nur Chrome und Edge) |
| Kopieren | Clipboard API, nur über HTTPS oder `localhost` |

---

## Danksagung

Die Icons stammen aus [Bootstrap Icons](https://icons.getbootstrap.com/) (MIT-Lizenz).
