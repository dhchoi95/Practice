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
        required = ['내사주원국','시주','일주','월주','년주','십신','지장간']
        forbidden = ['섬세한기준을나에게도다정하게','기대의세밀함','인수조건','분기마다','이운세메뉴공유하기','병화이에요','무토이에요','임수이에요','편재을','편재이에요']
        if filename in ['result-closed.pdf','result-open.pdf','editorial-general.pdf']:
            required += ['계산표준시:1992-05-1510:30','8글자기준','실제기운의강약이나용신을뜻하지않아요','대운개시계산','원국과지장간·십신']
        if filename=='grammar-copula.pdf':required += ['계산된일간은병화예요','표준시2000-01-0910:30','적용시각2000-01-0910:30','왜이런풀이인가요']
        if filename=='editorial-love.pdf':required += ['지금만나는사람이없다면','내게는당연해도상대는모를수있습니다','왜이런풀이인가요']
        if filename.startswith('period-') or filename in ['year-boundary.pdf','grammar-year-trace.pdf']:
            required += ['총운','학업운','재물운','건강운','연애운','사업운','시기별운세와풀이이유']
            if filename.endswith('-unknown.pdf'):required += ['일간이미확정','산출보류'];forbidden += ['일간·나']
            else:required += ['여섯분야한눈에보기']
        if filename in ['year-boundary.pdf','grammar-year-trace.pdf']:required += ['2027-01-0100:00']
        if filename=='grammar-year-trace.pdf':required += ['편재','정관','2026-02-0405:02'];forbidden += ['period-year-4','period-year-7']
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
