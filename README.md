# World of No

A small, playful website that shows how to say “no” in 50 languages, complete
with pre-generated audio and optional background music.

Visit the live site: <https://sound-of-no.com/>

## Features

- exactly 50 official languages and a separate “Extras” section
- shared search and continent filter
- random selection with focus, highlighting, and MP3 playback after 500 ms
- a fixed MP3 file for every language
- no overlapping language audio, even after rapid clicks
- clear feedback for missing or damaged audio files
- optional background music with a welcome dialog, pause control, and volume
- automatic music ducking while language audio is playing
- responsive, keyboard-accessible interface
- static deployment through GitHub Pages

## Architecture

The public website uses only HTML5, CSS3, modern Vanilla JavaScript, JSON, and
static MP3 files. It contains no Web Speech API, runtime TTS requests, API keys,
backend, database, tracking, or analytics.

Language audio is generated or recorded ahead of time. The frontend only plays
the static path configured in the language data and does not know how a file
was produced.

## Project structure

```text
assets/audio/background-music.mp3     optional background music
assets/audio/languages/<id>.mp3       fixed language audio
assets/css/                            website and effect styles
assets/favicon.svg                    browser icon
assets/js/                             application and effect modules
data/languages.json                   visible language data and audio paths
dist/                                 generated upload-ready website
robots.txt                            crawler access and sitemap reference
sitemap.xml                           canonical page for search engines
.htaccess                             optional Apache configuration
.githooks/pre-commit                  automatic distribution build
scripts/build-dist.sh                 distribution build script
scripts/generate_audio.py             local MP3 generator
scripts/tts-config.json               provider, model, and voice configuration
requirements-dev.txt                  local Python dependency
```

## Run locally

The language data is loaded with `fetch`, so the project must be served through
a local web server:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## Build the upload package

Every commit rebuilds `dist/` automatically. Existing files inside `dist/` are
removed first, then only the files required by the static website are copied
into it. The hook also stages the generated result so it is included in the
commit.

The repository uses a versioned Git hook from `.githooks/`. After cloning,
activate it once:

```bash
git config core.hooksPath .githooks
```

The same build can be run manually:

```bash
./scripts/build-dist.sh
```

## Language data

Entries live in [`data/languages.json`](data/languages.json). Regular entries
use `category: "official"`; fun or fictional languages use
`category: "bonus"`.

A shortened example:

```json
{
  "id": "is",
  "audio": "assets/audio/languages/is.mp3",
  "language": "Icelandic",
  "word": "Nei",
  "locale": "is-IS",
  "category": "official"
}
```

The `id` and `audio` values remain stable when visible text changes. An
optional `ttsText` value can provide pronunciation-friendly input for audio
generation.

## Generate language audio

The development script is configured for the OpenAI Speech API, using
`tts-1-hd` and the default voice `coral`. This dependency is only needed for
local development. Python 3.9 or later is required:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements-dev.txt
```

In PowerShell, activate the environment with
`.venv\Scripts\Activate.ps1`.

The API key is read exclusively from the `OPENAI_API_KEY` environment
variable:

```bash
export OPENAI_API_KEY="..."
```

Generate all missing files:

```bash
python3 scripts/generate_audio.py
```

Generate one language by its stable ID:

```bash
python3 scripts/generate_audio.py --id is
```

Check selection and configuration without making an API request:

```bash
python3 scripts/generate_audio.py --dry-run
```

Existing files are skipped by default. To overwrite them explicitly:

```bash
python3 scripts/generate_audio.py --overwrite
```

Manually preferred special cases remain protected. They are only overwritten
when both options are present:

```bash
python3 scripts/generate_audio.py --overwrite --overwrite-manual
```

The script creates target directories, continues after individual failures,
and ends with a summary. Partial downloads never become finished MP3 files.
The TTS configuration spaces requests 21 seconds apart and automatically
retries HTTP 429 errors. This supports a low limit of three requests per minute,
so a complete run takes roughly 18 minutes. Automatic SDK retries are disabled
to ensure that each visible attempt represents only one API request.

## Manual recordings

Any MP3 can be replaced at its configured path. Klingon lives at:

```text
assets/audio/languages/tlh.mp3
```

The regular generator skips existing files. Klingon is additionally marked as
`manualPreferred` in
[`scripts/tts-config.json`](scripts/tts-config.json), with a documented
fallback voice and phonetic input. The project does not pretend that this is a
native Klingon voice.

## Update a language

1. Review the visible data, locale, and optional `ttsText` in
   `data/languages.json`.
2. Review the audio path and any special configuration in
   `scripts/tts-config.json`.
3. Regenerate with `--id <id> --overwrite`, or replace the file manually.
4. Listen to the pronunciation and, where possible, ask a fluent speaker to
   review it.
5. Version the finished MP3 together with the static website files.

## Known limitations

- The OpenAI voices are multilingual, but they are not guaranteed to sound
  native for every locale.
- Irish, Welsh, Mandarin, and Thai use context-dependent forms of negation.
- Klingon is not natively supported; generated audio is only an approximation
  and should ideally be replaced with a manual recording.
- Audio files may contain AI-generated voices.

## Error handling

If a language file is missing or cannot be played, the interface shows a quiet
notification and the browser console reports its ID, path, and error code.
Background music returns to the selected volume even after an audio failure.

Optional background music is expected at:

```text
assets/audio/background-music.mp3
```

The site remains fully functional without this file.

## GitHub Pages

The [deployment workflow](.github/workflows/deploy-pages.yml) publishes the
static files after pushes to `main` or a manual run. GitHub Pages uses GitHub
Actions as its publishing source.

## Support

If this tiny world tour made you smile, you can
[buy me a coffee](https://buymeacoffee.com/madebyzwen).

## License

The source code is available under the [MIT License](LICENSE).
