#!/usr/bin/env python3
"""Generate the configured language MP3 files without exposing API keys."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATA_PATH = PROJECT_ROOT / "data" / "languages.json"
DEFAULT_CONFIG_PATH = Path(__file__).resolve().parent / "tts-config.json"
API_KEY_ENV = "OPENAI_API_KEY"
ALLOWED_AUDIO_ROOT = PROJECT_ROOT / "assets" / "audio" / "languages"


@dataclass
class Job:
    language: dict[str, Any]
    output_path: Path
    text: str
    voice: str
    speed: float
    manual_preferred: bool


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Erzeugt feste MP3-Dateien für World of No."
    )
    parser.add_argument("--id", help="Nur die Sprache mit dieser stabilen ID erzeugen.")
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Vorhandene, nicht geschützte Dateien überschreiben.",
    )
    parser.add_argument(
        "--overwrite-manual",
        action="store_true",
        help="Auch als manuell bevorzugt markierte Dateien überschreiben.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Auswahl und Konfiguration prüfen, ohne API-Aufrufe auszuführen.",
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=DEFAULT_DATA_PATH,
        help="Pfad zur Sprachdatei.",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=DEFAULT_CONFIG_PATH,
        help="Pfad zur TTS-Konfiguration.",
    )
    args = parser.parse_args()
    if args.overwrite_manual and not args.overwrite:
        parser.error("--overwrite-manual erfordert zusätzlich --overwrite.")
    return args


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"{path} konnte nicht gelesen werden: {error}") from error


def resolve_project_path(path: Path) -> Path:
    return path if path.is_absolute() else PROJECT_ROOT / path


def safe_audio_path(value: str) -> Path:
    relative = Path(value)
    if relative.is_absolute() or ".." in relative.parts or relative.suffix != ".mp3":
        raise ValueError(f"Unsicherer Audiopfad: {value}")
    output = (PROJECT_ROOT / relative).resolve()
    if not output.is_relative_to(ALLOWED_AUDIO_ROOT.resolve()):
        raise ValueError(f"Audiopfad liegt außerhalb des Zielverzeichnisses: {value}")
    return output


def validate_languages(data: Any) -> list[dict[str, Any]]:
    if not isinstance(data, list):
        raise ValueError("Die Sprachdaten müssen eine JSON-Liste sein.")

    required = (
        "id",
        "language",
        "nativeName",
        "word",
        "locale",
        "continent",
        "category",
        "audio",
    )
    ids: set[str] = set()
    for entry in data:
        if not isinstance(entry, dict):
            raise ValueError("Jeder Spracheintrag muss ein JSON-Objekt sein.")
        missing = [
            field
            for field in required
            if not isinstance(entry.get(field), str) or not entry[field].strip()
        ]
        if missing:
            raise ValueError(
                f"Pflichtfelder fehlen bei {entry.get('id', '<ohne ID>')}: "
                f"{', '.join(missing)}"
            )
        if entry["id"] in ids:
            raise ValueError(f"Doppelte ID: {entry['id']}")
        if entry["category"] not in {"official", "bonus"}:
            raise ValueError(f"Ungültige Kategorie bei {entry['id']}.")
        expected_audio = f"assets/audio/languages/{entry['id']}.mp3"
        if entry["audio"] != expected_audio:
            raise ValueError(
                f"Audiopfad bei {entry['id']} muss {expected_audio} entsprechen."
            )
        safe_audio_path(entry["audio"])
        ids.add(entry["id"])

    if sum(entry["category"] == "official" for entry in data) != 50:
        raise ValueError("Es müssen genau 50 official-Einträge vorhanden sein.")
    return data


def build_jobs(
    languages: list[dict[str, Any]], config: dict[str, Any]
) -> list[Job]:
    if config.get("provider") != "openai":
        raise ValueError("Der Generator unterstützt derzeit provider=openai.")

    model = config.get("model")
    response_format = config.get("responseFormat", "mp3")
    default_voice = config.get("defaultVoice")
    default_speed = config.get("defaultSpeed", 1.0)
    if not isinstance(model, str) or not model:
        raise ValueError("Das TTS-Modell fehlt in der Konfiguration.")
    if response_format != "mp3":
        raise ValueError("World of No erwartet responseFormat=mp3.")
    if not isinstance(default_voice, str) or not default_voice:
        raise ValueError("defaultVoice fehlt in der TTS-Konfiguration.")
    if not isinstance(default_speed, (int, float)) or not 0.25 <= default_speed <= 4:
        raise ValueError("defaultSpeed muss zwischen 0.25 und 4 liegen.")

    overrides = config.get("languageOverrides", {})
    if not isinstance(overrides, dict):
        raise ValueError("languageOverrides muss ein JSON-Objekt sein.")
    known_ids = {language["id"] for language in languages}
    unknown_overrides = sorted(set(overrides) - known_ids)
    if unknown_overrides:
        raise ValueError(
            "Konfiguration enthält unbekannte IDs: " + ", ".join(unknown_overrides)
        )

    jobs = []
    for language in languages:
        override = overrides.get(language["id"], {})
        if not isinstance(override, dict):
            raise ValueError(f"Ungültige Konfiguration für {language['id']}.")
        text = override.get("ttsText", language.get("ttsText", language["word"]))
        voice = override.get("voice", default_voice)
        speed_value = override.get("speed", default_speed)
        manual_preferred = override.get("manualPreferred", False)
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"ttsText ist bei {language['id']} ungültig.")
        if not isinstance(voice, str) or not voice:
            raise ValueError(f"Stimme ist bei {language['id']} ungültig.")
        if not isinstance(speed_value, (int, float)) or not 0.25 <= speed_value <= 4:
            raise ValueError(f"Geschwindigkeit ist bei {language['id']} ungültig.")
        if not isinstance(manual_preferred, bool):
            raise ValueError(f"manualPreferred ist bei {language['id']} ungültig.")
        jobs.append(
            Job(
                language=language,
                output_path=safe_audio_path(language["audio"]),
                text=text,
                voice=voice,
                speed=float(speed_value),
                manual_preferred=manual_preferred,
            )
        )
    return jobs


def print_summary(successes: list[str], skipped: list[str], failures: list[str]) -> None:
    print("\nZusammenfassung")
    print(f"  Erzeugt:       {len(successes)}")
    print(f"  Übersprungen:  {len(skipped)}")
    print(f"  Fehler:        {len(failures)}")
    if failures:
        print("  Fehlgeschlagen: " + ", ".join(failures))


def remove_partial(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
    except OSError as error:
        print(f"Temporäre Datei konnte nicht entfernt werden ({path}): {error}", file=sys.stderr)


def wait_for_request_slot(last_request_started: float | None, interval: float) -> None:
    if last_request_started is None or interval <= 0:
        return
    remaining = interval - (time.monotonic() - last_request_started)
    if remaining > 0:
        print(f"Warte {remaining:.1f} s wegen des API-Anfragelimits …")
        time.sleep(remaining)


def main() -> int:
    args = parse_args()
    data_path = resolve_project_path(args.data)
    config_path = resolve_project_path(args.config)

    try:
        languages = validate_languages(load_json(data_path))
        config = load_json(config_path)
        if not isinstance(config, dict):
            raise ValueError("Die TTS-Konfiguration muss ein JSON-Objekt sein.")
        jobs = build_jobs(languages, config)
    except (RuntimeError, ValueError) as error:
        print(f"Konfigurationsfehler: {error}", file=sys.stderr)
        return 2

    if args.id:
        jobs = [job for job in jobs if job.language["id"] == args.id]
        if not jobs:
            print(f"Unbekannte Sprach-ID: {args.id}", file=sys.stderr)
            return 2

    successes: list[str] = []
    skipped: list[str] = []
    failures: list[str] = []
    pending: list[Job] = []

    for job in jobs:
        language_id = job.language["id"]
        if job.output_path.exists() and not args.overwrite:
            print(f"Überspringe {language_id}: Datei ist bereits vorhanden.")
            skipped.append(language_id)
        elif job.output_path.exists() and job.manual_preferred and not args.overwrite_manual:
            print(f"Überspringe {language_id}: manuelle Datei ist geschützt.")
            skipped.append(language_id)
        else:
            pending.append(job)

    if args.dry_run:
        for job in pending:
            print(
                f"Würde {job.language['id']} erzeugen: "
                f"{job.output_path.relative_to(PROJECT_ROOT)} "
                f"(locale={job.language['locale']}, voice={job.voice}, "
                f"text={job.text!r})"
            )
        skipped.extend(job.language["id"] for job in pending)
        print_summary(successes, skipped, failures)
        return 0

    if not pending:
        print_summary(successes, skipped, failures)
        return 0

    api_key = os.environ.get(API_KEY_ENV)
    if not api_key:
        print(
            f"Die Umgebungsvariable {API_KEY_ENV} ist nicht gesetzt.",
            file=sys.stderr,
        )
        return 2

    try:
        from openai import OpenAI
    except ImportError:
        print(
            "Das Entwicklungspaket 'openai' fehlt. "
            "Installiere requirements-dev.txt.",
            file=sys.stderr,
        )
        return 2

    # Das SDK wiederholt 429-Antworten sonst zusätzlich im Hintergrund. Bei
    # niedrigen RPM-Limits würde ein sichtbarer Versuch dadurch mehrere
    # Requests verbrauchen. Die Wiederholungen steuert ausschließlich dieses
    # Skript im konfigurierten Abstand.
    client = OpenAI(api_key=api_key, max_retries=0)
    model = config["model"]
    response_format = config["responseFormat"]
    request_interval = config.get("requestIntervalSeconds", 0)
    max_rate_limit_retries = config.get("maxRateLimitRetries", 3)
    if (
        not isinstance(request_interval, (int, float))
        or request_interval < 0
        or not isinstance(max_rate_limit_retries, int)
        or max_rate_limit_retries < 0
    ):
        print("Ungültige Rate-Limit-Konfiguration.", file=sys.stderr)
        return 2

    last_request_started: float | None = None
    for job in pending:
        language_id = job.language["id"]
        job.output_path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = job.output_path.with_suffix(".mp3.part")
        rate_limit_retries = 0
        while True:
            remove_partial(temporary_path)
            wait_for_request_slot(last_request_started, float(request_interval))
            last_request_started = time.monotonic()
            try:
                print(
                    f"Erzeuge {language_id} ({job.language['language']}, "
                    f"{job.language['locale']}, Stimme {job.voice}) …"
                )
                with client.audio.speech.with_streaming_response.create(
                    model=model,
                    voice=job.voice,
                    input=job.text,
                    response_format=response_format,
                    speed=job.speed,
                ) as response:
                    response.stream_to_file(temporary_path)
                temporary_path.replace(job.output_path)
                successes.append(language_id)
                break
            except Exception as error:  # API-/Dateifehler pro Sprache isolieren
                remove_partial(temporary_path)
                is_rate_limit = getattr(error, "status_code", None) == 429
                if is_rate_limit and rate_limit_retries < max_rate_limit_retries:
                    rate_limit_retries += 1
                    print(
                        f"Rate-Limit bei {language_id}; neuer Versuch "
                        f"{rate_limit_retries}/{max_rate_limit_retries} nach der Wartezeit.",
                        file=sys.stderr,
                    )
                    continue
                failures.append(language_id)
                print(f"Fehler bei {language_id}: {error}", file=sys.stderr)
                break

    print_summary(successes, skipped, failures)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
