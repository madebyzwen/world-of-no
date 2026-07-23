# World of No

Eine kleine, humorvolle Webseite, die zeigt, wie man in 50 Sprachen „Nein“
sagt – mit festen Audiodateien und optionaler Hintergrundmusik.

## Funktionen

- exakt 50 reguläre Sprachen und ein separater Bonusbereich „Extras“
- gemeinsame Suche und Kontinentfilter
- Zufallsauswahl mit Fokus, Hervorhebung und MP3-Wiedergabe nach 500 ms
- feste MP3-Datei für jede Sprache
- keine überlappenden Sprachdateien, auch bei schnellen Klicks
- verständliche Meldung bei fehlenden oder defekten Dateien
- optionale Hintergrundmusik mit Startdialog, Pause und Lautstärke
- automatisches Audio-Ducking während einer Sprachdatei
- responsive und tastaturbedienbare Oberfläche
- statisches Deployment über GitHub Pages

## Architektur

Die öffentliche Website verwendet ausschließlich HTML5, CSS3, modernes Vanilla
JavaScript, JSON und statische MP3-Dateien. Sie enthält keine Web Speech API,
keine TTS-Anfragen, keinen API-Schlüssel, kein Backend und kein Tracking.

Die Sprachdateien werden vorab im Entwicklungsprozess erzeugt oder manuell
bereitgestellt. Das Frontend spielt ausschließlich den in den Sprachdaten
konfigurierten Pfad ab und kennt den Erzeugungsweg nicht.

## Verzeichnisstruktur

```text
assets/audio/background-music.mp3     optionale Hintergrundmusik
assets/audio/languages/<id>.mp3       feste Sprachdateien
data/languages.json                   sichtbare Sprach- und Audiopfade
scripts/generate_audio.py             lokaler MP3-Generator
scripts/tts-config.json               Anbieter-, Modell- und Stimmenkonfiguration
requirements-dev.txt                  nur lokal benötigte Python-Abhängigkeit
```

## Lokal starten

Da die Sprachdaten per `fetch` geladen werden, wird ein lokaler Webserver
benötigt:

```bash
python3 -m http.server 8080
```

Danach ist die Seite unter <http://localhost:8080> erreichbar.

## Sprachdaten

Die Einträge liegen in [`data/languages.json`](data/languages.json). Reguläre
Einträge verwenden `category: "official"`; Spaß- oder Fantasiesprachen
verwenden `category: "bonus"`.

Ein verkürztes Beispiel:

```json
{
  "id": "is",
  "audio": "assets/audio/languages/is.mp3",
  "language": "Isländisch",
  "word": "Nei",
  "locale": "is-IS",
  "category": "official"
}
```

`id` und `audio` bleiben stabil, auch wenn sichtbare Texte geändert werden.
Optional kann `ttsText` eine für die Erzeugung optimierte Aussprache enthalten.

## Sprachdateien erzeugen

Vorbereitet ist die OpenAI Speech API mit dem Qualitätsmodell `tts-1-hd` und
der Standardstimme `coral`. Die Abhängigkeit wird nur für das lokale
Entwicklungsskript benötigt. Erforderlich ist Python 3.9 oder neuer:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements-dev.txt
```

Unter PowerShell wird die Umgebung mit `.venv\Scripts\Activate.ps1` aktiviert.

Der API-Schlüssel wird ausschließlich über die Umgebungsvariable
`OPENAI_API_KEY` gelesen:

```bash
export OPENAI_API_KEY="..."
```

Alle fehlenden Sprachdateien erzeugen:

```bash
python3 scripts/generate_audio.py
```

Eine einzelne Sprache anhand ihrer stabilen ID erzeugen:

```bash
python3 scripts/generate_audio.py --id is
```

Auswahl und Konfiguration ohne API-Aufruf prüfen:

```bash
python3 scripts/generate_audio.py --dry-run
```

Vorhandene Dateien werden standardmäßig übersprungen. Explizit überschreiben:

```bash
python3 scripts/generate_audio.py --overwrite
```

Als manuell bevorzugt markierte Sonderdateien bleiben selbst dabei geschützt.
Sie werden nur mit beiden Optionen überschrieben:

```bash
python3 scripts/generate_audio.py --overwrite --overwrite-manual
```

Das Skript erstellt Zielverzeichnisse automatisch, verarbeitet nach einem
Einzelfehler die übrigen Sprachen weiter und zeigt anschließend eine
Zusammenfassung. Partielle Downloads werden nicht als fertige MP3 übernommen.
Die TTS-Konfiguration begrenzt den Lauf auf eine Anfrage alle 21 Sekunden und
wiederholt HTTP-429-Fehler automatisch. Damit funktioniert die Erzeugung auch
mit einem niedrigen Limit von drei Anfragen pro Minute; ein vollständiger Lauf
dauert entsprechend ungefähr 18 Minuten. Die automatischen SDK-Retries sind
deaktiviert, damit jeder sichtbare Versuch tatsächlich nur eine API-Anfrage
verbraucht.

## Manuelle Aufnahmen

Jede MP3 kann am konfigurierten Pfad ersetzt werden. Eine hochwertige Aufnahme
für Klingonisch liegt beispielsweise unter:

```text
assets/audio/languages/tlh.mp3
```

Der normale Generatorlauf überspringt vorhandene Dateien. Klingonisch ist in
[`scripts/tts-config.json`](scripts/tts-config.json) zusätzlich als
`manualPreferred` markiert und besitzt eine dokumentierte Ersatzstimme und
phonetische Eingabe. Eine native Klingonisch-Stimme wird nicht vorgetäuscht.

## Eine Sprache aktualisieren

1. Sichtbare Daten, Locale und gegebenenfalls `ttsText` in
   `data/languages.json` prüfen.
2. Audiopfad und optionale Sonderkonfiguration in `scripts/tts-config.json`
   prüfen.
3. Datei mit `--id <id> --overwrite` neu erzeugen oder manuell ersetzen.
4. Aussprache anhören und möglichst von einer sprachkundigen Person prüfen.
5. Die fertige MP3 zusammen mit den statischen Website-Dateien versionieren.

## Bekannte Einschränkungen

- OpenAI-Stimmen sind mehrsprachig, aber keine garantiert muttersprachlichen
  Stimmen für jedes Locale.
- Irisch, Walisisch, Mandarin und Thailändisch verwenden kontextabhängige
  Verneinungen.
- Klingonisch wird nicht nativ unterstützt; die Generatorausgabe ist nur eine
  Annäherung und sollte möglichst manuell ersetzt werden.
- Die Audiodateien können KI-generierte Stimmen enthalten.

## Fehlerverhalten

Fehlt eine Sprachdatei oder ist sie nicht abspielbar, erscheint eine
unaufdringliche Meldung und die Browserkonsole enthält ID, Pfad und Fehlercode.
Die Hintergrundmusik wird auch in diesem Fall wieder auf die zuvor gewählte
Lautstärke angehoben.

Die optionale Hintergrundmusik wird hier erwartet:

```text
assets/audio/background-music.mp3
```

Die Seite funktioniert ohne diese Datei.

## GitHub Pages

Der Workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)
veröffentlicht die statischen Dateien bei Pushes auf `main` oder nach manuellem
Start. In den Repository-Einstellungen muss GitHub Pages einmalig als Quelle
„GitHub Actions“ erhalten. Die erzeugten MP3-Dateien müssen vor dem Deployment
im Repository vorhanden sein.

## Lizenz

Der Quellcode steht unter der [MIT-Lizenz](LICENSE).
