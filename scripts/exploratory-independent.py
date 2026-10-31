"""Independent synthetic natal comparison; optional sxtwl and astronomy-engine.

No project calendar/astronomy modules or network calls are used. Chinese lunar
conversion is intentionally not used to adjudicate the Korean lunar calendar.
"""
import datetime as dt
import hashlib
import json
import math
import pathlib
import zoneinfo

import astronomy
import sxtwl

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIRECTORY = ROOT / 'reports/exploratory-saju'
SEOUL = zoneinfo.ZoneInfo('Asia/Seoul')
UTC = dt.timezone.utc
STANDARD = dt.timezone(dt.timedelta(hours=9))


def known_pillars(local):
    instant = local.astimezone(UTC)
    standard = instant.astimezone(STANDARD)
    time = astronomy.Time.Make(instant.year, instant.month, instant.day,
                               instant.hour, instant.minute, instant.second)
    longitude = astronomy.SunPosition(time).elon
    year = standard.year
    if standard.month < 2 or standard.month == 2 and longitude < 315:
        year -= 1
    year_stem = (year - 4) % 10
    month_index = math.floor(((longitude - 315) % 360) / 30)
    # sxtwl supplies only the day cycle. Its getHourGZ(23) uses a different
    # day-change convention, so derive hour using the confirmed standard day.
    day = sxtwl.fromSolar(standard.year, standard.month, standard.day).getDayGZ()
    branch = ((standard.hour + 1) // 2) % 12
    return {
        'year': {'stem': year_stem, 'branch': (year - 4) % 12},
        'month': {'stem': (year_stem % 5 * 2 + 2 + month_index) % 10,
                  'branch': (2 + month_index) % 12},
        'day': {'stem': day.tg, 'branch': day.dz},
        'hour': {'stem': (day.tg % 5 * 2 + branch) % 10, 'branch': branch},
    }


def candidates(date, hour, minute):
    wall = dt.datetime(date.year, date.month, date.day, hour, minute)
    seen = set()
    for fold in (0, 1):
        local = wall.replace(tzinfo=SEOUL, fold=fold)
        instant = local.astimezone(UTC)
        if instant in seen or instant.astimezone(SEOUL).replace(tzinfo=None) != wall:
            continue
        seen.add(instant)
        yield local


rows = json.loads((DIRECTORY / 'seeded-common-facts.json').read_text())
results = []
for row in rows:
    date = dt.date.fromisoformat(row['solar'])
    input_ = row['input']
    if input_['unknownTime']:
        # Full minute resolution: this verifies common pillars for these cases,
        # not arbitrary seconds nor leap-second behavior.
        readings = [known_pillars(local)
                    for minute in range(1440)
                    for local in candidates(date, minute // 60, minute % 60)]
        mine = {key: readings[0][key] if all(r[key] == readings[0][key]
                                          for r in readings) else None
                for key in ('year', 'month', 'day')}
        mine['hour'] = None
    else:
        instants = list(candidates(date, input_['hour'], input_['minute']))
        if len(instants) != 1:
            raise ValueError(f"Unexpected ambiguous/nonexistent known input {row['id']}")
        mine = known_pillars(instants[0])
    differences = {key: {'independent': value, 'site': row['natal'][key]}
                   for key, value in mine.items() if value != row['natal'][key]}
    results.append({'id': row['id'], 'independent': mine,
                    'differences': differences})

report = {
    'generatedAt': dt.datetime.now(UTC).isoformat(),
    'source': 'sxtwl 2.0.7 day cycle; astronomy-engine 2.1.19 solar longitude; Python zoneinfo Asia/Seoul',
    'policy': 'Historical local wall clock converted to fixed UTC+09; midnight day boundary; HH:mm:00; no city correction',
    'inputSHA256': hashlib.sha256((DIRECTORY / 'seeded-common-facts.json').read_bytes()).hexdigest(),
    'cases': len(rows),
    'mismatchedCases': sum(bool(r['differences']) for r in results),
    'results': results,
    'limits': 'Independent implementation comparison is not official calendar certification or predictive accuracy. No Chinese lunar conversions used. Minute common-pillar sampling does not prove arbitrary subminute boundaries.',
}
(DIRECTORY / 'seeded-independent.json').write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({key: report[key] for key in ('cases', 'mismatchedCases', 'source')}))
