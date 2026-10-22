"""Optional artifact audit after npm run test:e2e. Requires PyMuPDF (fitz).

This reads actual Chromium PDF text, separately from DOM/CSS assertions.
No birth information other than the test suite's synthetic profile is used.
"""
from pathlib import Path
import json
import fitz

root = Path(__file__).resolve().parents[1]
checks = {}
texts = {}
filenames = ['result-closed.pdf', 'result-open.pdf', 'year-boundary.pdf', 'grammar-copula.pdf', 'grammar-year-trace.pdf', 'editorial-general.pdf', 'editorial-love.pdf']
filenames += [f'period-{kind}-{state}.pdf' for kind in ['year', 'month', 'day']
              for state in ['unknown', 'known']]
for filename in filenames:
    path = root / 'reports/print' / filename
    with fitz.open(path) as document:
        text = '\n'.join(page.get_text() for page in document)
        normalized = ''.join(text.split())
        required = ['내사주표와오행살펴보기', '계산표준시:1992-05-1510:30',
                    '연주', '월주', '일주', '시주', '오행의단순개수',
                    '8글자기준', '실제기운의강약이나용신을뜻하지않아요', '왜이런풀이인가요']
        if filename == 'year-boundary.pdf':
            required = ['대상기간과절기구간보기', '2026년', '2027년1월1일00:00',
                        '내사주표와오행살펴보기', '왜이런풀이인가요']
        if filename == 'grammar-copula.pdf':
            required = ['계산된일간은병화예요', '계산표준시:2000-01-0910:30', '왜이런풀이인가요']
        if filename == 'grammar-year-trace.pdf':
            required = ['앞구간·편재', '뒤구간·정관', '편재를이구간의생활이야기', '정관을이구간의생활이야기',
                        '2026년1월1일00:00', '2026년2월4일05:02', '2027년1월1일00:00',
                        '내사주표와오행살펴보기', '왜이런풀이인가요']
        if filename == 'editorial-general.pdf':
            required += ['작은실수로나를너무탓할때', '어디까지하면끝인지정해요', '다음에해도되는일을남겨두고']
        if filename == 'editorial-love.pdf':
            required += ['지금만나는사람이없다면', '내게는당연해도상대는모를수있어요']
        if filename == 'grammar-year-trace.pdf':
            required += ['2026년1월1일~2026년2월4일', '2026년2월4일~2026년12월31일']
        forbidden = ['섬세한기준을나에게도다정하게', '기대의세밀함', '인수조건', '분기마다', '이운세메뉴공유하기', '병화이에요', '무토이에요', '임수이에요', '편재을', '편재이에요',
                     'period-year-4', 'period-year-7']
        if filename.startswith('period-'):
            _, kind, state = path.stem.split('-')
            required = ['대상기간과절기구간보기', '2026년', '내사주표와오행살펴보기',
                        '왜이런풀이인가요']
            if state == 'unknown':
                required += ['일주와일간을확정하지않았어요',
                             '일간이미확정이라나의일간과기간간지의관계는해석하지않았어요',
                             '아래에는대상기간의간지와경계만표시해요', '일간과의관계미확정']
                forbidden += ['내일간과의관계를살폈어요', '구간별내용을요약']
            else:
                required += ['내일간과의관계를살폈어요', '계산표준시:1992-05-1510:30']
                forbidden += ['일간이미확정이라', '일간과의관계미확정']
                if kind != 'day':
                    required += ['구간별내용을요약해서함께보여드려요']
        assertions = {value: value in normalized for value in required}
        absence_assertions = {value: value not in normalized for value in forbidden}
        assert all(assertions.values()), (filename, assertions)
        assert all(absence_assertions.values()), (filename, absence_assertions)
        checks[filename] = {'pages': len(document), 'characters': len(text), 'contains': assertions,
                            'excludes': absence_assertions}
        texts[filename] = normalized
        path.with_suffix('.pdf.txt').write_text(text)
assert texts['result-closed.pdf'] == texts['result-open.pdf'], 'Open/closed PDF content differs'
result = {'passed': True, 'method': 'PyMuPDF extraction from actual Chromium page.pdf output',
          'openClosedTextIdentical': True, 'files': checks}
(root / 'reports/print-verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False, indent=2))
