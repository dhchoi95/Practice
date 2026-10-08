'use client';
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';

// API values are serialized strings for exact money/quantity arithmetic on the server.
type Row = Record<string, any>;
type Data = Record<string, any>;
const titles: Record<string, [string, string]> = {
  dashboard: [
    '매장의 하루, 한눈에',
    '판매와 재고, 예약과 시설의 현재 기록을 확인하세요.',
  ],
  sales: [
    '하루 판매 정리',
    '햄버거 판매를 하루 합산으로 입력하면 재료가 자동 차감됩니다.',
  ],
  inventory: ['재고 관리', '입고·사용·폐기·실사 기록을 차곡차곡 남겨보세요.'],
  purchasing: [
    '필요한 만큼, 발주',
    '최소보유량과 미입고 발주를 반영한 추천입니다.',
  ],
  reservations: [
    '예약 관리',
    '전화와 외부 플랫폼에서 받은 예약을 한곳에 정리하세요.',
  ],
  facilities: ['시설과 수리', '장비 상태와 이상 접수, 수리 이력을 관리하세요.'],
  finance: [
    '가게의 수입과 비용',
    '입력된 매출과 지출을 바탕으로 운영 현황을 확인하세요.',
  ],
  settings: ['우리 가게 설정', '햄버거 메뉴와 레시피, 직원 권한을 관리하세요.'],
};
const statusLabels: Record<string, string> = {
  DRAFT: '초안',
  ORDERED: '발주 완료',
  PARTIALLY_RECEIVED: '부분 입고',
  RECEIVED: '입고 완료',
  CANCELLED: '취소',
  PENDING: '대기',
  CONFIRMED: '확정',
  SEATED: '착석',
  COMPLETED: '완료',
  NO_SHOW: '노쇼',
  OPEN: '접수',
  IN_PROGRESS: '수리 중',
  NORMAL: '정상',
  REPAIR_NEEDED: '수리 필요',
  INSPECTION_NEEDED: '점검 필요',
};
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
const money = (v: unknown) => {
  try {
    return (
      new Intl.NumberFormat('ko-KR').format(BigInt(String(v ?? '0'))) + '원'
    );
  } catch {
    return '—';
  }
};
const quantity = (v: unknown) => String(v ?? '0');
const milli = (v: unknown) => {
  const s = String(v ?? '0'),
    negative = s.startsWith('-'),
    parts = s.replace(/^-/, '').split('.');
  return (
    (BigInt(parts[0] || '0') * 1000n +
      BigInt((parts[1] ?? '').padEnd(3, '0').slice(0, 3))) *
    (negative ? -1n : 1n)
  );
};
const stockLow = (i: Row) =>
  milli(i.inventory?.quantity) <= milli(i.minimumQty);
const localDate = (v: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(v));
const localTime = (v: string) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(v));
const stamp = (v: unknown) =>
  v
    ? new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(String(v)))
    : '—';
const list = (v: any): Row[] =>
  Array.isArray(v)
    ? v
    : Array.isArray(v?.items)
      ? v.items
      : Array.isArray(v?.rows)
        ? v.rows
        : [];
const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const number = (f: FormData, k: string) => Number(text(f, k));
const errors: Record<string, string> = {
  forbidden: '이 작업은 사장님만 할 수 있습니다.',
  'not found': '선택한 항목을 찾지 못했습니다. 화면을 새로고침해 주세요.',
  conflict:
    '이미 처리됐거나 다른 변경과 충돌했습니다. 현재 기록을 확인해 주세요.',
  'invalid origin':
    '요청 주소가 올바르지 않습니다. 현재 서비스 주소에서 다시 시도해 주세요.',
  'invalid input': '입력한 값과 필수 항목을 확인해 주세요.',
  'invalid amount': '금액은 0 이상의 정수 원 단위로 입력해 주세요.',
  'adjustments exceed gross': '할인과 환불 합계가 판매금액을 초과합니다.',
  'count cutoff requires manual reconciliation':
    '재고 실사 이후의 과거 판매 변경은 재대사가 필요합니다. 판매 기록과 실사 수량을 먼저 확인하세요.',
  overlap: '같은 시간에 이미 배정된 테이블입니다.',
  'capacity exceeded': '예약 인원이 테이블 좌석수를 초과합니다.',
  'over receipt': '발주 잔여 수량보다 많이 입고할 수 없습니다.',
};
function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  required = true,
  min,
  step,
  children,
  wide = false,
  readOnly = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  min?: string | number;
  step?: string;
  children?: ReactNode;
  wide?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className={`label ${wide ? 'wide' : ''}`}>
      {label}
      {children ? (
        <select
          className="field"
          name={name}
          defaultValue={defaultValue}
          required={required}
        >
          {children}
        </select>
      ) : (
        <input
          className="field"
          name={name}
          type={type}
          defaultValue={defaultValue}
          required={required}
          min={min}
          step={step}
          readOnly={readOnly}
        />
      )}
    </label>
  );
}
function Empty({
  children = '아직 등록된 기록이 없습니다.',
}: {
  children?: ReactNode;
}) {
  return <div className="empty">{children}</div>;
}
function Badge({ status }: { status: string }) {
  return (
    <span
      className={`badge ${['OPEN', 'DRAFT', 'PENDING', 'PARTIALLY_RECEIVED', 'REPAIR_NEEDED'].includes(status) ? 'warning' : ['CANCELLED', 'NO_SHOW'].includes(status) ? 'gray' : ''}`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
function Form({
  title,
  children,
  submit = '저장',
  busy,
  onSubmit,
  testId,
}: {
  title: string;
  children: ReactNode;
  submit?: string;
  busy: boolean;
  onSubmit: (f: FormData, form: HTMLFormElement) => Promise<unknown>;
  testId?: string;
}) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <form
        className="form-grid"
        data-testid={testId}
        onSubmit={async (e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          await onSubmit(new FormData(e.currentTarget), e.currentTarget);
        }}
      >
        {children}
        <div className="wide">
          <button className="btn" disabled={busy}>
            {busy ? '처리 중…' : submit}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function Workspace({
  storeId,
  section,
  role,
  isDemo = false,
}: {
  storeId: string;
  section: string;
  role: string;
  isDemo?: boolean;
}) {
  const owner = role === 'OWNER';
  const base = `/api/stores/${storeId}`;
  const [data, setData] = useState<Data>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSale, setSelectedSale] = useState<Row | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Row | null>(null);
  const [recipeRows, setRecipeRows] = useState<
    { ingredientId: string; quantity: string }[]
  >([{ ingredientId: '', quantity: '1' }]);
  const [inviteUrl, setInviteUrl] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<Row | null>(
    null,
  );
  const pendingKeys = useRef(new Map<string, string>());
  const request = useCallback(
    async (path: string, method = 'GET', body?: Row) => {
      const res = await fetch(base + path, {
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          location.assign('/login');
          throw Error('로그인 시간이 만료되었습니다.');
        }
        throw Error(
          errors[out.error] ?? out.error ?? '요청을 처리하지 못했습니다.',
        );
      }
      return out;
    },
    [base],
  );
  const load = useCallback(async () => {
    const paths: Record<string, string[]> = {
      dashboard: ['dashboard'],
      sales: ['sales/daily', 'menus'],
      inventory: owner
        ? ['inventory', 'inventory/transactions']
        : ['inventory', 'inventory/transactions'],
      purchasing: [
        'purchase-suggestions',
        'purchase-orders',
        'suppliers',
        'inventory',
      ],
      reservations: ['reservations', 'tables'],
      facilities: ['facilities', 'maintenance-requests'],
      finance: ['finance/transactions', 'finance/summary'],
      settings: ['menus', 'inventory', 'members', 'tables'],
    };
    const results = await Promise.all(
      (paths[section] ?? []).map(async (p) => [p, await request('/' + p)]),
    );
    setData(Object.fromEntries(results));
  }, [section, request, owner]);
  useEffect(() => {
    setLoading(true);
    setError('');
    setSuccess('');
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [load]);
  async function mutate(
    path: string,
    payload: Row = {},
    message = '저장했습니다.',
    method = 'POST',
  ) {
    setBusy(true);
    setError('');
    setSuccess('');
    const fingerprint = JSON.stringify([path, payload, method]);
    let key = pendingKeys.current.get(fingerprint);
    if (!key) {
      key = crypto.randomUUID();
      pendingKeys.current.set(fingerprint, key);
    }
    try {
      const out = await request(path, method, {
        ...payload,
        idempotencyKey: key,
      });
      pendingKeys.current.delete(fingerprint);
      setSuccess(message);
      try {
        await load();
      } catch (e) {
        setError(
          `저장은 완료됐지만 목록 갱신에 실패했습니다. ${e instanceof Error ? e.message : ''}`,
        );
      }
      return out;
    } catch (e) {
      setError(e instanceof Error ? e.message : '처리에 실패했습니다.');
      return null;
    } finally {
      setBusy(false);
    }
  }
  const ingredients = list(data.inventory);
  const menus = list(data.menus);
  const sales = list(data['sales/daily']);
  const tables = list(data.tables);
  const facilities = list(data.facilities);
  const requests = list(data['maintenance-requests']);
  const finances = list(data['finance/transactions']);
  const suggestions = list(data['purchase-suggestions']);
  const orders = list(data['purchase-orders']);
  const suppliers = list(data.suppliers);
  const members = list(data.members);
  const reservations = list(data.reservations);
  const summary = data['finance/summary'] ?? {};
  const dashboard = data.dashboard ?? {};
  const menu = menus[0];
  return (
    <div className="stack">
      <header className="page-head">
        <p className="eyebrow">BURGER MANAGER · {today()}</p>
        <h1>{titles[section]?.[0]}</h1>
        <p className="muted">{titles[section]?.[1]}</p>
      </header>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button
            className="btn secondary small"
            style={{ marginLeft: 12 }}
            onClick={() =>
              load()
                .then(() => setError(''))
                .catch((e) => setError(e.message))
            }
          >
            목록 다시 불러오기
          </button>
        </div>
      )}
      {success && (
        <div className="notice" role="status">
          {success}
        </div>
      )}
      {loading ? (
        <section className="card">
          <Empty>매장 기록을 불러오고 있습니다…</Empty>
        </section>
      ) : (
        <>
          {section === 'dashboard' && (
            <>
              <div className="gridcards metrics">
                {owner && (
                  <>
                    <Metric
                      primary
                      title="오늘 입력된 매출"
                      value={
                        dashboard.todaySaleEntered === false
                          ? '미입력'
                          : money(dashboard.todaySalesWon)
                      }
                      note={
                        dashboard.todaySaleEntered === false
                          ? '하루 합산을 입력하면 반영됩니다.'
                          : '기록된 판매 기준'
                      }
                    />
                    <Metric
                      title="이번 달 매출"
                      value={money(
                        dashboard.monthSalesWon ??
                          dashboard.monthRevenueWon ??
                          dashboard.monthSales,
                      )}
                      note="할인·환불 반영"
                    />
                  </>
                )}
                <Metric
                  title="오늘 예약"
                  value={`${dashboard.reservationCount ?? dashboard.todayReservations ?? 0}건`}
                  note={`${dashboard.reservationGuests ?? 0}명 방문 예정`}
                />
                <Metric
                  title="재고 부족"
                  value={`${dashboard.lowStockCount ?? list(dashboard.lowStock).length}품목`}
                  note="최소보유량 기준"
                />
                {owner && (
                  <>
                    <Metric
                      title="오늘 비용"
                      value={money(
                        dashboard.todayExpenseWon ?? dashboard.todayExpensesWon,
                      )}
                      note="입력된 지급액 기준"
                    />
                    <Metric
                      title="이번 달 추정 운영손익"
                      value={money(
                        dashboard.estimatedProfitWon ??
                          dashboard.monthProfitWon,
                      )}
                      note="정식 회계 지표가 아닙니다."
                    />
                  </>
                )}
              </div>
              <div className="notice info">
                판매와 재고는 하루 합산 입력 기준입니다. 마지막 판매 반영일:{' '}
                <strong>
                  {dashboard.lastSaleDate?.slice(0, 10) ??
                    dashboard.lastBusinessDate?.slice(0, 10) ??
                    '아직 없음'}
                </strong>
                . 실제 통장 잔액과 차이가 있을 수 있습니다.
              </div>
              <div className="split">
                <section className="card">
                  <div className="section-head">
                    <h2>확인할 재고</h2>
                    <Link href={`/${storeId}/inventory`} className="muted">
                      재고 보기 →
                    </Link>
                  </div>
                  {list(dashboard.lowStock).length ? (
                    <div className="mini-list">
                      {list(dashboard.lowStock).map((i: Row) => (
                        <div className="mini-item" key={i.id ?? i.ingredientId}>
                          <div>
                            <strong>{i.name}</strong>
                            <p className="muted">
                              최소 {quantity(i.minimumQty)} {i.unit}
                            </p>
                          </div>
                          <span className="badge warning">
                            {quantity(i.currentQty ?? i.inventory?.quantity)}{' '}
                            {i.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty>현재 부족한 재료가 없습니다.</Empty>
                  )}
                </section>
                <section className="card">
                  <div className="section-head">
                    <h2>빠른 업무</h2>
                  </div>
                  <div className="mini-list">
                    {owner && (
                      <Link className="mini-item" href={`/${storeId}/sales`}>
                        <strong>하루 판매 입력</strong>
                        <span>→</span>
                      </Link>
                    )}
                    <Link
                      className="mini-item"
                      href={`/${storeId}/reservations`}
                    >
                      <strong>예약 확인</strong>
                      <span>→</span>
                    </Link>
                    <Link className="mini-item" href={`/${storeId}/facilities`}>
                      <strong>시설 이상 접수</strong>
                      <span>→</span>
                    </Link>
                    {owner && (
                      <Link
                        className="mini-item"
                        href={`/${storeId}/purchasing`}
                      >
                        <strong>발주 추천 확인</strong>
                        <span>→</span>
                      </Link>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
          {section === 'sales' && (
            <>
              <div className="notice info">
                조리 후 환불한 햄버거도 판매수량에 포함하세요. 환불은 금액만
                줄이며 식재료는 자동 복원하지 않습니다. 재고 실사는 하루 판매를
                먼저 확정한 뒤 진행하세요.
              </div>
              {isDemo && (
                <section className="card">
                  <h2>데모 판매 불러오기</h2>
                  <p className="footer-note">
                    데모 매장 전용입니다. 선택한 날짜에 예시 판매를 만들고
                    재료를 차감합니다. 실제 판매가 있는 날짜에는 불러올 수
                    없습니다.
                  </p>
                  <form
                    className="form-grid"
                    data-testid="mock-sales-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await mutate(
                        '/pos/mock/import',
                        {
                          businessDate: text(
                            new FormData(e.currentTarget),
                            'businessDate',
                          ),
                        },
                        '데모 판매를 불러왔습니다.',
                      );
                    }}
                  >
                    <Field
                      label="데모 영업일"
                      name="businessDate"
                      type="date"
                      defaultValue={today()}
                    />
                    <div style={{ alignSelf: 'end' }}>
                      <button className="btn secondary" disabled={busy}>
                        데모 판매 불러오기
                      </button>
                    </div>
                  </form>
                </section>
              )}
              {menu ? (
                <Form
                  title={
                    selectedSale ? '판매 기록 정정' : '하루 합산 판매 입력'
                  }
                  submit={selectedSale ? '차이 반영하기' : '판매 확정하기'}
                  busy={busy}
                  testId="daily-sales-form"
                  onSubmit={async (f) => {
                    const body = {
                      businessDate: text(f, 'businessDate'),
                      menuId: menu.id,
                      quantity: number(f, 'quantity'),
                      unitPriceWon: text(f, 'unitPriceWon'),
                      discountWon: text(f, 'discountWon'),
                      ...(selectedSale
                        ? {
                            revision: selectedSale.revision,
                            reason: text(f, 'reason'),
                          }
                        : {}),
                    };
                    const out = await mutate(
                      selectedSale
                        ? `/sales/daily/${selectedSale.id}/corrections`
                        : '/sales/daily',
                      body,
                      '판매와 재고를 반영했습니다.',
                    );
                    if (out) setSelectedSale(null);
                  }}
                >
                  <div className="wide">
                    <span className="badge">{menu.name} · 1종 메뉴</span>
                    {selectedSale && (
                      <button
                        type="button"
                        className="btn secondary small"
                        style={{ marginLeft: 12 }}
                        onClick={() => setSelectedSale(null)}
                      >
                        정정 취소
                      </button>
                    )}
                  </div>
                  <Field
                    key={'date' + (selectedSale?.id ?? 'new')}
                    readOnly={Boolean(selectedSale)}
                    label="영업일"
                    name="businessDate"
                    type="date"
                    defaultValue={
                      selectedSale?.businessDate?.slice(0, 10) ?? today()
                    }
                  />
                  <Field
                    key={'quantity' + (selectedSale?.id ?? 'new')}
                    label="판매수량 (개)"
                    name="quantity"
                    type="number"
                    min={0}
                    step="1"
                    defaultValue={selectedSale?.quantity ?? 0}
                  />
                  <Field
                    key={'price' + (selectedSale?.id ?? 'new')}
                    label="판매단가 (원)"
                    name="unitPriceWon"
                    type="number"
                    min={0}
                    step="1"
                    defaultValue={selectedSale?.unitPriceWon ?? menu.priceWon}
                  />
                  <Field
                    key={'discount' + (selectedSale?.id ?? 'new')}
                    label="하루 할인 합계 (원)"
                    name="discountWon"
                    type="number"
                    min={0}
                    step="1"
                    defaultValue={selectedSale?.discountWon ?? '0'}
                  />
                  {selectedSale && (
                    <Field label="정정 사유" name="reason" wide />
                  )}
                </Form>
              ) : (
                <section className="card">
                  <Empty>
                    먼저 설정에서 햄버거 메뉴와 레시피를 등록하세요.
                  </Empty>
                </section>
              )}
              <section className="card">
                <h2>영업일별 판매 기록</h2>
                {sales.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>영업일</th>
                          <th>판매</th>
                          <th>단가</th>
                          <th>할인 / 환불</th>
                          <th>작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((s) => (
                          <tr key={s.id}>
                            <td className="nowrap">
                              {s.businessDate.slice(0, 10)}
                            </td>
                            <td>{s.quantity}개</td>
                            <td className="nowrap">{money(s.unitPriceWon)}</td>
                            <td className="nowrap">
                              {money(s.discountWon)} / {money(s.refundWon)}
                            </td>
                            <td>
                              <button
                                className="btn secondary small"
                                onClick={() => {
                                  setSelectedSale(s);
                                  window.scrollTo({
                                    top: 0,
                                    behavior: 'smooth',
                                  });
                                }}
                              >
                                정정
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty>하루 판매를 입력하면 기록이 표시됩니다.</Empty>
                )}
              </section>
              {sales.length > 0 && (
                <Form
                  title="환불 기록"
                  submit="환불 반영"
                  busy={busy}
                  onSubmit={async (f) => {
                    await mutate(
                      `/sales/${text(f, 'saleId')}/refunds`,
                      { amountWon: text(f, 'amountWon') },
                      '환불 금액을 반영했습니다. 재고는 그대로 유지됩니다.',
                    );
                  }}
                >
                  <Field label="판매 기록" name="saleId">
                    {sales.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.businessDate.slice(0, 10)} · {s.quantity}개
                      </option>
                    ))}
                  </Field>
                  <Field
                    label="환불금액 (원)"
                    name="amountWon"
                    type="number"
                    min={1}
                    step="1"
                  />
                </Form>
              )}
            </>
          )}
          {section === 'inventory' && (
            <>
              <div className="gridcards">
                <Metric
                  title="관리 재료"
                  value={`${ingredients.length}품목`}
                  note="등록된 재료 기준"
                />
                <Metric
                  title="재고 부족"
                  value={`${ingredients.filter((i) => stockLow(i)).length}품목`}
                  note="최소보유량 이하"
                />
              </div>
              <section className="card">
                <h2>현재 재고</h2>
                {ingredients.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>재료</th>
                          <th>현재</th>
                          <th>최소 / 목표</th>
                          <th>상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingredients.map((i) => (
                          <tr key={i.id}>
                            <td>
                              <strong>{i.name}</strong>
                              <div className="muted">{i.unit}</div>
                            </td>
                            <td>
                              {quantity(i.inventory?.quantity)} {i.unit}
                            </td>
                            <td className="nowrap">
                              {quantity(i.minimumQty)} / {quantity(i.targetQty)}
                            </td>
                            <td>
                              <span
                                className={`badge ${stockLow(i) ? 'warning' : ''}`}
                              >
                                {stockLow(i) ? '발주 필요' : '보유 중'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty>재료를 등록하고 최초 입고를 입력하세요.</Empty>
                )}
              </section>
              {ingredients.length > 0 && (
                <Form
                  title="재고 변동 기록"
                  busy={busy}
                  testId="inventory-form"
                  onSubmit={async (f) => {
                    await mutate(
                      '/inventory',
                      {
                        ingredientId: text(f, 'ingredientId'),
                        type: text(f, 'type'),
                        quantityDelta: text(f, 'quantity'),
                        reason: text(f, 'reason'),
                        ...(text(f, 'type') === 'COUNT'
                          ? {
                              expectedVersion: ingredients.find(
                                (i) => i.id === text(f, 'ingredientId'),
                              )?.inventory?.version,
                            }
                          : {}),
                      },
                      '재고 변동을 기록했습니다.',
                    );
                  }}
                >
                  <Field label="재료" name="ingredientId">
                    {ingredients.map((i) => (
                      <option value={i.id} key={i.id}>
                        {i.name} ({i.unit})
                      </option>
                    ))}
                  </Field>
                  <Field label="변동 유형" name="type">
                    {owner && <option value="RECEIPT">입고</option>}
                    <option value="USAGE">사용</option>
                    <option value="WASTE">폐기</option>
                    {owner && <option value="COUNT">실사 (실제 보유량)</option>}
                  </Field>
                  <Field
                    label="수량 (재료 기본 단위)"
                    name="quantity"
                    type="number"
                    min={0}
                    step="0.001"
                  />
                  <Field label="사유" name="reason" />
                </Form>
              )}
              {owner && (
                <Form
                  title="재료 추가"
                  busy={busy}
                  onSubmit={async (f) => {
                    await mutate(
                      '/ingredients',
                      {
                        name: text(f, 'name'),
                        unit: text(f, 'unit'),
                        minimumQty: text(f, 'minimumQty'),
                        targetQty: text(f, 'targetQty'),
                        packQty: text(f, 'packQty'),
                        unitCost: text(f, 'unitCost'),
                      },
                      '재료를 등록했습니다.',
                    );
                  }}
                >
                  <Field label="재료명" name="name" />
                  <Field label="기본 단위" name="unit">
                    <option>개</option>
                    <option>g</option>
                    <option>ml</option>
                  </Field>
                  <Field
                    label="최소보유량"
                    name="minimumQty"
                    type="number"
                    min={0}
                    step="0.001"
                    defaultValue="10"
                  />
                  <Field
                    label="목표재고"
                    name="targetQty"
                    type="number"
                    min={0}
                    step="0.001"
                    defaultValue="100"
                  />
                  <Field
                    label="발주 묶음 수량"
                    name="packQty"
                    type="number"
                    min="0.001"
                    step="0.001"
                    defaultValue="10"
                  />
                  <Field
                    label="참고 단가 (원/기본 단위)"
                    name="unitCost"
                    type="number"
                    min={0}
                    step="0.000001"
                    defaultValue="0"
                  />
                </Form>
              )}
              {owner && ingredients.length > 0 && (
                <Form
                  title="최소보유량과 발주 기준 변경"
                  busy={busy}
                  onSubmit={async (f) => {
                    await mutate(
                      `/ingredients/${text(f, 'ingredientId')}`,
                      {
                        minimumQty: text(f, 'minimumQty'),
                        targetQty: text(f, 'targetQty'),
                        packQty: text(f, 'packQty'),
                      },
                      '재고 기준을 변경했습니다.',
                      'PATCH',
                    );
                  }}
                >
                  <Field label="재료" name="ingredientId">
                    {ingredients.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </Field>
                  <Field
                    label="최소보유량"
                    name="minimumQty"
                    type="number"
                    min={0}
                    step="0.001"
                  />
                  <Field
                    label="목표재고"
                    name="targetQty"
                    type="number"
                    min={0}
                    step="0.001"
                  />
                  <Field
                    label="발주 묶음 수량"
                    name="packQty"
                    type="number"
                    min="0.001"
                    step="0.001"
                  />
                </Form>
              )}
              <section className="card">
                <h2>최근 변동 이력</h2>
                {list(data['inventory/transactions']).length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>시각</th>
                          <th>재료</th>
                          <th>변동</th>
                          <th>사유</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list(data['inventory/transactions']).map((i) => (
                          <tr key={i.id}>
                            <td className="nowrap">
                              {stamp(i.createdAt ?? i.occurredAt)}
                            </td>
                            <td>
                              {i.ingredient?.name ??
                                ingredients.find((x) => x.id === i.ingredientId)
                                  ?.name}
                            </td>
                            <td>{quantity(i.quantityDelta)}</td>
                            <td>{i.reason ?? i.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty>입고와 판매가 반영되면 이력이 남습니다.</Empty>
                )}
              </section>
            </>
          )}
          {section === 'purchasing' && (
            <>
              <section className="card">
                <h2>발주 추천</h2>
                {suggestions.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>재료</th>
                          <th>현재 / 최소</th>
                          <th>미입고</th>
                          <th>추천</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suggestions.map((i) => (
                          <tr key={i.ingredientId ?? i.id}>
                            <td>
                              <strong>{i.name}</strong>
                            </td>
                            <td>
                              {quantity(i.currentQty)} /{' '}
                              {quantity(i.minimumQty)}
                            </td>
                            <td>
                              {quantity(i.incomingQty)} {i.unit}
                            </td>
                            <td>
                              <span className="badge warning">
                                {quantity(i.recommendedQty)} {i.unit}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty>현재 추천할 추가 발주가 없습니다.</Empty>
                )}
              </section>
              {ingredients.length > 0 && (
                <Form
                  title="발주 초안 만들기"
                  submit="초안 저장"
                  busy={busy}
                  testId="purchase-form"
                  onSubmit={async (f) => {
                    await mutate(
                      '/purchase-orders',
                      {
                        supplierId: text(f, 'supplierId') || undefined,
                        note: text(f, 'note'),
                        items: [
                          {
                            ingredientId: text(f, 'ingredientId'),
                            orderedQty: text(f, 'orderedQty'),
                            unitPriceWon: text(f, 'unitPriceWon'),
                          },
                        ],
                      },
                      '발주 초안을 만들었습니다. 내용을 확인한 뒤 확정하세요.',
                    );
                  }}
                >
                  <Field label="공급업체" name="supplierId" required={false}>
                    <option value="">미지정</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Field>
                  <Field label="재료" name="ingredientId">
                    {ingredients.map((i) => (
                      <option value={i.id} key={i.id}>
                        {i.name} ({i.unit})
                      </option>
                    ))}
                  </Field>
                  <Field
                    label="발주 수량"
                    name="orderedQty"
                    type="number"
                    min="0.001"
                    step="0.001"
                  />
                  <Field
                    label="기본 단위당 발주단가 (원)"
                    name="unitPriceWon"
                    type="number"
                    min={0}
                    step="1"
                    defaultValue="0"
                  />
                  <Field label="메모" name="note" required={false} wide />
                </Form>
              )}
              <section className="card">
                <h2>발주 내역</h2>
                {orders.length ? (
                  <div className="mini-list">
                    {orders.map((o) => (
                      <article className="mini-item" key={o.id}>
                        <div>
                          <strong>
                            {o.supplier?.name ?? '공급업체 미지정'}
                          </strong>
                          <p className="muted">
                            {o.items
                              ?.map(
                                (i: Row) =>
                                  `${i.ingredient?.name ?? ingredients.find((x) => x.id === i.ingredientId)?.name} ${i.receivedQty ?? 0}/${i.orderedQty}`,
                              )
                              .join(' · ')}
                          </p>
                          <p className="muted">{stamp(o.createdAt)}</p>
                        </div>
                        <div className="row">
                          <Badge status={o.status} />
                          {o.status === 'DRAFT' && (
                            <button
                              className="btn small"
                              disabled={busy}
                              onClick={() =>
                                mutate(
                                  `/purchase-orders/${o.id}/submit`,
                                  {},
                                  '발주를 확정했습니다.',
                                )
                              }
                            >
                              발주 확정
                            </button>
                          )}
                          {['ORDERED', 'PARTIALLY_RECEIVED'].includes(
                            o.status,
                          ) && (
                            <button
                              className="btn secondary small"
                              onClick={() => setSelectedOrder(o)}
                            >
                              입고 기록
                            </button>
                          )}
                          {['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(
                            o.status,
                          ) && (
                            <button
                              className="btn danger small"
                              disabled={busy}
                              onClick={() =>
                                mutate(
                                  `/purchase-orders/${o.id}/cancel`,
                                  {},
                                  '미입고 발주를 취소했습니다.',
                                )
                              }
                            >
                              취소
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty>추천량을 확인하고 첫 발주를 만들어보세요.</Empty>
                )}
              </section>
              {selectedOrder && (
                <Form
                  title="부분 / 전체 입고 기록"
                  submit="입고 반영"
                  busy={busy}
                  testId="receipt-form"
                  onSubmit={async (f) => {
                    const out = await mutate(
                      `/purchase-orders/${selectedOrder.id}/receipts`,
                      {
                        items: [
                          {
                            ingredientId: text(f, 'ingredientId'),
                            quantity: text(f, 'quantity'),
                          },
                        ],
                      },
                      '입고와 재고를 반영했습니다.',
                    );
                    if (out) setSelectedOrder(null);
                  }}
                >
                  <Field label="발주 품목" name="ingredientId">
                    {selectedOrder.items.map((i: Row) => (
                      <option value={i.ingredientId} key={i.id}>
                        {i.ingredient?.name ??
                          ingredients.find((x) => x.id === i.ingredientId)
                            ?.name}{' '}
                        · 발주 {i.orderedQty}, 입고 {i.receivedQty}
                      </option>
                    ))}
                  </Field>
                  <Field
                    label="이번 입고 수량"
                    name="quantity"
                    type="number"
                    min="0.001"
                    step="0.001"
                  />
                  <p className="footer-note wide">
                    입고는 재고만 증가시킵니다. 실제 지급한 금액은 비용 화면에
                    별도로 기록하세요.
                  </p>
                </Form>
              )}
              <Form
                title="공급업체 등록"
                busy={busy}
                onSubmit={async (f) => {
                  await mutate(
                    '/suppliers',
                    { name: text(f, 'name'), contact: text(f, 'contact') },
                    '공급업체를 등록했습니다.',
                  );
                }}
              >
                <Field label="업체명" name="name" />
                <Field label="연락처" name="contact" required={false} />
              </Form>
            </>
          )}
          {section === 'reservations' && (
            <>
              {owner && (
                <Form
                  key={selectedReservation?.id ?? 'new-reservation'}
                  title={
                    selectedReservation ? '예약 내용 변경' : '받은 예약 등록'
                  }
                  busy={busy}
                  testId="reservation-form"
                  onSubmit={async (f) => {
                    const date = text(f, 'date'),
                      start = text(f, 'start'),
                      end = text(f, 'end');
                    const out = await mutate(
                      selectedReservation
                        ? `/reservations/${selectedReservation.id}`
                        : '/reservations',
                      {
                        customerName: text(f, 'customerName'),
                        phone: text(f, 'phone'),
                        startAt: new Date(
                          `${date}T${start}:00+09:00`,
                        ).toISOString(),
                        ...(end
                          ? {
                              endAt: new Date(
                                `${date}T${end}:00+09:00`,
                              ).toISOString(),
                            }
                          : {}),
                        partySize: number(f, 'partySize'),
                        tableId: text(f, 'tableId') || null,
                        source: text(f, 'source'),
                        note: text(f, 'note'),
                      },
                      selectedReservation
                        ? '예약을 변경했습니다.'
                        : '예약을 등록했습니다.',
                      selectedReservation ? 'PATCH' : 'POST',
                    );
                    if (out) setSelectedReservation(null);
                  }}
                >
                  <Field
                    label="고객명"
                    name="customerName"
                    defaultValue={selectedReservation?.customerName}
                  />
                  <Field
                    label="연락처"
                    name="phone"
                    type="tel"
                    required={false}
                    defaultValue={selectedReservation?.phone ?? ''}
                  />
                  <Field
                    label="예약 날짜"
                    name="date"
                    type="date"
                    defaultValue={
                      selectedReservation
                        ? localDate(selectedReservation.startAt)
                        : today()
                    }
                  />
                  <Field
                    label="시작 시간"
                    name="start"
                    type="time"
                    defaultValue={
                      selectedReservation
                        ? localTime(selectedReservation.startAt)
                        : '18:00'
                    }
                  />
                  <Field
                    label="종료 시간 (미입력 시 90분)"
                    name="end"
                    type="time"
                    required={false}
                    defaultValue={
                      selectedReservation
                        ? localTime(selectedReservation.endAt)
                        : ''
                    }
                  />
                  <Field
                    label="인원수"
                    name="partySize"
                    type="number"
                    min={1}
                    step="1"
                    defaultValue={selectedReservation?.partySize ?? 2}
                  />
                  <Field
                    label="테이블"
                    name="tableId"
                    required={false}
                    defaultValue={selectedReservation?.tableId ?? ''}
                  >
                    <option value="">미배정</option>
                    {tables.map((t) => (
                      <option value={t.id} key={t.id}>
                        {t.label} · {t.capacity}인
                      </option>
                    ))}
                  </Field>
                  <Field
                    label="예약 경로"
                    name="source"
                    defaultValue={selectedReservation?.source ?? '전화'}
                  >
                    <option>전화</option>
                    <option>현장</option>
                    <option>네이버</option>
                    <option>캐치테이블</option>
                    <option>카카오</option>
                    <option>기타</option>
                  </Field>
                  <Field
                    label="요청사항"
                    name="note"
                    required={false}
                    wide
                    defaultValue={selectedReservation?.note ?? ''}
                  />
                  {selectedReservation && (
                    <div className="wide">
                      <button
                        type="button"
                        className="btn secondary small"
                        onClick={() => setSelectedReservation(null)}
                      >
                        변경 취소
                      </button>
                    </div>
                  )}
                </Form>
              )}
              <section className="card">
                <h2>예약 목록</h2>
                {reservations.length ? (
                  <div className="mini-list">
                    {reservations.map((r) => (
                      <article className="mini-item" key={r.id}>
                        <div>
                          <strong>
                            {r.customerName} · {r.partySize}명
                          </strong>
                          <p>
                            {stamp(r.startAt)} — {stamp(r.endAt)} ·{' '}
                            {r.table?.label ??
                              tables.find((t) => t.id === r.tableId)?.label ??
                              '미배정'}
                          </p>
                          <p className="muted">
                            {r.source}
                            {r.phone ? ' · ' + r.phone : ''}
                            {r.note ? ' · ' + r.note : ''}
                          </p>
                        </div>
                        <div className="row">
                          <Badge status={r.status} />
                          {owner &&
                            ['PENDING', 'CONFIRMED'].includes(r.status) && (
                              <button
                                className="btn secondary small"
                                onClick={() => {
                                  setSelectedReservation(r);
                                  window.scrollTo({
                                    top: 0,
                                    behavior: 'smooth',
                                  });
                                }}
                              >
                                내용 변경
                              </button>
                            )}
                          {['PENDING', 'CONFIRMED'].includes(r.status) && (
                            <button
                              className="btn secondary small"
                              disabled={busy}
                              onClick={() =>
                                mutate(
                                  `/reservations/${r.id}/transitions`,
                                  { status: 'SEATED' },
                                  '착석으로 변경했습니다.',
                                )
                              }
                            >
                              착석
                            </button>
                          )}
                          {owner && r.status === 'SEATED' && (
                            <button
                              className="btn secondary small"
                              disabled={busy}
                              onClick={() =>
                                mutate(
                                  `/reservations/${r.id}/transitions`,
                                  { status: 'COMPLETED' },
                                  '이용 완료로 변경했습니다.',
                                )
                              }
                            >
                              완료
                            </button>
                          )}
                          {owner &&
                            ['PENDING', 'CONFIRMED'].includes(r.status) && (
                              <>
                                <button
                                  className="btn danger small"
                                  disabled={busy}
                                  onClick={() =>
                                    mutate(
                                      `/reservations/${r.id}/transitions`,
                                      { status: 'CANCELLED' },
                                      '예약을 취소했습니다.',
                                    )
                                  }
                                >
                                  취소
                                </button>
                                <button
                                  className="btn secondary small"
                                  disabled={busy}
                                  onClick={() =>
                                    mutate(
                                      `/reservations/${r.id}/transitions`,
                                      { status: 'NO_SHOW' },
                                      '노쇼로 기록했습니다.',
                                    )
                                  }
                                >
                                  노쇼
                                </button>
                              </>
                            )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty>등록된 예약이 없습니다.</Empty>
                )}
              </section>
              {owner && (
                <Form
                  title="테이블 등록"
                  busy={busy}
                  onSubmit={async (f) => {
                    await mutate(
                      '/tables',
                      {
                        label: text(f, 'label'),
                        capacity: number(f, 'capacity'),
                      },
                      '테이블을 등록했습니다.',
                    );
                  }}
                >
                  <Field label="테이블명" name="label" />
                  <Field
                    label="좌석수"
                    name="capacity"
                    type="number"
                    min={1}
                    step="1"
                    defaultValue={4}
                  />
                </Form>
              )}
            </>
          )}
          {section === 'facilities' && (
            <>
              <section className="card">
                <h2>시설 현황</h2>
                {facilities.length ? (
                  <div className="gridcards">
                    {facilities.map((f) => (
                      <article className="card" key={f.id}>
                        <span className="eyebrow">{f.category}</span>
                        <h3 style={{ margin: '12px 0' }}>{f.name}</h3>
                        <Badge status={f.status} />
                        <p className="footer-note" style={{ marginTop: 12 }}>
                          다음 점검:{' '}
                          {f.nextInspectionAt?.slice(0, 10) ?? '미설정'}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty>관리할 장비를 등록하세요.</Empty>
                )}
              </section>
              {facilities.length > 0 && (
                <Form
                  title="시설 이상 접수"
                  busy={busy}
                  testId="maintenance-form"
                  onSubmit={async (f) => {
                    await mutate(
                      '/maintenance-requests',
                      {
                        facilityId: text(f, 'facilityId'),
                        title: text(f, 'title'),
                        description: text(f, 'description'),
                      },
                      '시설 이상을 접수했습니다.',
                    );
                  }}
                >
                  <Field label="시설" name="facilityId">
                    {facilities.map((f) => (
                      <option value={f.id} key={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </Field>
                  <Field label="문제 요약" name="title" />
                  <Field
                    label="상세 내용"
                    name="description"
                    required={false}
                    wide
                  />
                </Form>
              )}
              <section className="card">
                <h2>점검과 수리 내역</h2>
                {requests.length ? (
                  <div className="mini-list">
                    {requests.map((r) => (
                      <article className="mini-item" key={r.id}>
                        <div>
                          <strong>{r.title}</strong>
                          <p className="muted">
                            {r.facility?.name ??
                              facilities.find((f) => f.id === r.facilityId)
                                ?.name}{' '}
                            · {stamp(r.createdAt)}
                          </p>
                          {r.description && <p>{r.description}</p>}
                          {owner && r.costWon != null && (
                            <p>수리비 {money(r.costWon)}</p>
                          )}
                        </div>
                        <Badge status={r.status} />
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty>접수된 이상이나 수리 내역이 없습니다.</Empty>
                )}
              </section>
              {owner &&
                requests.some(
                  (r) => !['COMPLETED', 'CANCELLED'].includes(r.status),
                ) && (
                  <Form
                    title="수리 진행 / 완료 기록"
                    busy={busy}
                    testId="repair-completion-form"
                    onSubmit={async (f) => {
                      await mutate(
                        `/maintenance-requests/${text(f, 'requestId')}/${text(f, 'status') === 'COMPLETED' ? 'completion' : 'transitions'}`,
                        text(f, 'status') === 'COMPLETED'
                          ? { costWon: text(f, 'costWon') }
                          : { status: text(f, 'status') },
                        '시설 작업을 반영했습니다. 완료 수리비는 비용 장부에 연결됩니다.',
                      );
                    }}
                  >
                    <Field label="작업" name="requestId">
                      {requests
                        .filter(
                          (r) => !['COMPLETED', 'CANCELLED'].includes(r.status),
                        )
                        .map((r) => (
                          <option value={r.id} key={r.id}>
                            {r.title}
                          </option>
                        ))}
                    </Field>
                    <Field label="상태" name="status">
                      <option value="COMPLETED">수리 완료</option>
                      <option value="IN_PROGRESS">수리 중</option>
                      <option value="CANCELLED">취소</option>
                    </Field>
                    <Field
                      label="완료 수리비 (원)"
                      name="costWon"
                      type="number"
                      min={0}
                      step="1"
                      defaultValue="0"
                    />
                  </Form>
                )}
              {owner && (
                <Form
                  title="시설 등록"
                  busy={busy}
                  onSubmit={async (f) => {
                    await mutate(
                      '/facilities',
                      {
                        name: text(f, 'name'),
                        category: text(f, 'category'),
                        nextInspectionAt: text(f, 'nextInspectionAt')
                          ? new Date(
                              `${text(f, 'nextInspectionAt')}T00:00:00+09:00`,
                            ).toISOString()
                          : undefined,
                        memo: text(f, 'memo'),
                      },
                      '시설을 등록했습니다.',
                    );
                  }}
                >
                  <Field label="장비명" name="name" />
                  <Field label="분류" name="category">
                    <option>조리</option>
                    <option>냉장·냉동</option>
                    <option>냉난방</option>
                    <option>기타</option>
                  </Field>
                  <Field
                    label="다음 점검일"
                    name="nextInspectionAt"
                    type="date"
                    required={false}
                  />
                  <Field label="메모" name="memo" required={false} />
                </Form>
              )}
            </>
          )}
          {section === 'finance' && (
            <>
              <div className="gridcards metrics">
                <Metric
                  primary
                  title="이번 달 매출"
                  value={money(summary.salesWon ?? summary.revenueWon)}
                  note="판매·할인·환불 기준"
                />
                <Metric
                  title="이번 달 운영 지출"
                  value={money(summary.expenseWon ?? summary.expensesWon)}
                  note="지급 기록 기준"
                />
                <Metric
                  title="추정 운영손익"
                  value={money(summary.estimatedOperatingProfitWon)}
                  note="정식 회계상 이익이 아닙니다."
                />
              </div>
              <div className="notice info">
                판매 매출은 자동 집계됩니다. 같은 판매를 기타 수입으로 다시
                입력하지 마세요. 실제 통장 잔액이나 세무상 손익과는 다를 수
                있습니다.
              </div>
              <Form
                title="기타 수입 / 비용 기록"
                busy={busy}
                testId="finance-form"
                onSubmit={async (f) => {
                  await mutate(
                    '/finance/transactions',
                    {
                      occurredAt: new Date(
                        `${text(f, 'date')}T12:00:00+09:00`,
                      ).toISOString(),
                      type: text(f, 'type'),
                      category: text(f, 'category'),
                      amountWon: text(f, 'amountWon'),
                      description: text(f, 'description'),
                    },
                    '장부에 기록했습니다.',
                  );
                }}
              >
                <Field
                  label="날짜"
                  name="date"
                  type="date"
                  defaultValue={today()}
                />
                <Field label="유형" name="type">
                  <option value="EXPENSE">비용</option>
                  <option value="INCOME">기타 수입</option>
                </Field>
                <Field label="카테고리" name="category">
                  <option>식재료 구매</option>
                  <option>인건비</option>
                  <option>임대료</option>
                  <option>공과금</option>
                  <option>수수료</option>
                  <option>시설수리</option>
                  <option>기타</option>
                  <option>자금투입</option>
                  <option>대출</option>
                  <option>이체</option>
                </Field>
                <Field
                  label="금액 (원)"
                  name="amountWon"
                  type="number"
                  min={1}
                  step="1"
                />
                <Field
                  label="내용 / 거래처"
                  name="description"
                  required={false}
                  wide
                />
              </Form>
              <section className="card">
                <h2>최근 장부 기록</h2>
                {finances.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>날짜</th>
                          <th>분류</th>
                          <th>내용</th>
                          <th>금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finances.map((f) => (
                          <tr key={f.id}>
                            <td className="nowrap">{stamp(f.occurredAt)}</td>
                            <td>
                              {f.category}
                              {f.reversed && (
                                <span
                                  className="badge gray"
                                  style={{ marginLeft: 6 }}
                                >
                                  취소됨
                                </span>
                              )}
                              {f.sourceType === 'REVERSAL' && (
                                <span
                                  className="badge gray"
                                  style={{ marginLeft: 6 }}
                                >
                                  취소 이력
                                </span>
                              )}
                            </td>
                            <td>{f.description ?? '—'}</td>
                            <td className="nowrap">
                              {f.type === 'EXPENSE' ? '−' : '+'}
                              {money(f.amountWon)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty>기타 수입과 비용을 기록해보세요.</Empty>
                )}
              </section>
              {finances.some(
                (f) => !f.reversed && f.sourceType !== 'REVERSAL',
              ) && (
                <Form
                  title="장부 오입력 취소"
                  submit="취소 이력 남기기"
                  busy={busy}
                  testId="finance-reversal-form"
                  onSubmit={async (f) => {
                    await mutate(
                      `/finance/transactions/${text(f, 'transactionId')}/reversals`,
                      { reason: text(f, 'reason') },
                      '원래 거래를 보존하고 반대 방향의 취소 기록을 남겼습니다.',
                    );
                  }}
                >
                  <Field label="취소할 거래" name="transactionId">
                    {finances
                      .filter((f) => !f.reversed && f.sourceType !== 'REVERSAL')
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.category} · {money(f.amountWon)} ·{' '}
                          {stamp(f.occurredAt)}
                        </option>
                      ))}
                  </Field>
                  <Field label="취소 사유" name="reason" />
                </Form>
              )}
            </>
          )}
          {section === 'settings' && (
            <>
              <section className="card">
                <h2>햄버거 메뉴</h2>
                {menus.length ? (
                  menus.map((m) => (
                    <div className="mini-item" key={m.id}>
                      <strong>{m.name}</strong>
                      <span>{money(m.priceWon)}</span>
                    </div>
                  ))
                ) : (
                  <Empty>최초 메뉴를 등록해 주세요.</Empty>
                )}
                {menus.map((m) => (
                  <div className="mini-list" key={'recipe' + m.id}>
                    {m.recipes?.[0] && (
                      <>
                        <h3>
                          등록된 최신 레시피 · 버전 {m.recipes[0].version}
                        </h3>
                        {m.recipes[0].items?.map((i: Row) => (
                          <div className="mini-item" key={i.id}>
                            <span>{i.ingredient?.name}</span>
                            <span>
                              {quantity(i.quantity)} {i.ingredient?.unit} /
                              햄버거 1개
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                ))}
                <p className="footer-note">
                  현재 MVP는 햄버거 1종입니다. 데모 가격·레시피는 실제 매장
                  값으로 확인해 변경하세요. 가격 변경은 하루 판매를 정리한 뒤
                  다음 영업 전에 진행하고, 판매 입력의 적용 단가를 확인하세요.
                </p>
              </section>
              <Form
                title={menu ? '메뉴 가격 변경' : '햄버거 메뉴 등록'}
                busy={busy}
                onSubmit={async (f) => {
                  await mutate(
                    menu ? `/menus/${menu.id}` : '/menus',
                    { name: text(f, 'name'), priceWon: text(f, 'priceWon') },
                    '메뉴를 저장했습니다.',
                    menu ? 'PATCH' : 'POST',
                  );
                }}
              >
                <Field
                  label="메뉴명"
                  name="name"
                  defaultValue={menu?.name ?? '햄버거'}
                />
                <Field
                  label="판매가격 (원)"
                  name="priceWon"
                  type="number"
                  min={0}
                  step="1"
                  defaultValue={menu?.priceWon ?? '6000'}
                />
              </Form>
              {menu && (
                <section className="card">
                  <h2>새 레시피 버전 등록</h2>
                  <p className="footer-note">
                    햄버거 1개당 재료 사용량을 기본 단위로 입력하세요. 첫
                    레시피는 바로 적용되고, 이후 새 버전은 다음 영업일부터
                    적용됩니다. 기존 판매 기록은 이전 레시피를 유지합니다.
                  </p>
                  <form
                    className="stack"
                    data-testid="recipe-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await mutate(
                        `/menus/${menu.id}/recipes`,
                        { items: recipeRows },
                        '레시피 버전을 등록했습니다. 첫 버전은 바로, 이후 변경은 다음 영업일부터 적용됩니다.',
                      );
                    }}
                  >
                    {recipeRows.map((r, index) => (
                      <div className="recipe-row" key={index}>
                        <label className="label">
                          재료
                          <select
                            className="field"
                            required
                            value={r.ingredientId}
                            onChange={(e) =>
                              setRecipeRows((rows) =>
                                rows.map((row, j) =>
                                  j === index
                                    ? { ...row, ingredientId: e.target.value }
                                    : row,
                                ),
                              )
                            }
                          >
                            <option value="">선택</option>
                            {ingredients.map((i) => (
                              <option value={i.id} key={i.id}>
                                {i.name} ({i.unit})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="label">
                          사용량
                          <input
                            className="field"
                            type="number"
                            step="0.001"
                            min="0.001"
                            required
                            value={r.quantity}
                            onChange={(e) =>
                              setRecipeRows((rows) =>
                                rows.map((row, j) =>
                                  j === index
                                    ? { ...row, quantity: e.target.value }
                                    : row,
                                ),
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="btn secondary small"
                          aria-label={`재료 ${index + 1} 삭제`}
                          disabled={recipeRows.length === 1}
                          onClick={() =>
                            setRecipeRows((rows) =>
                              rows.filter((_, j) => j !== index),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <div className="row">
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() =>
                          setRecipeRows((rows) => [
                            ...rows,
                            { ingredientId: '', quantity: '1' },
                          ])
                        }
                      >
                        재료 추가
                      </button>
                      <button
                        className="btn"
                        disabled={busy || !ingredients.length}
                      >
                        레시피 저장
                      </button>
                    </div>
                  </form>
                </section>
              )}
              <section className="card">
                <h2>직원과 권한</h2>
                {members.length ? (
                  <div className="mini-list">
                    {members.map((m) => (
                      <div className="mini-item" key={m.id}>
                        <div>
                          <strong>
                            {m.user?.name ?? m.name ?? m.user?.email}
                          </strong>
                          <p className="muted">{m.user?.email ?? m.email}</p>
                        </div>
                        <div className="row">
                          <select
                            className="field"
                            style={{ width: 110 }}
                            aria-label={`${m.user?.name ?? m.user?.email} 권한`}
                            value={m.role}
                            disabled={busy}
                            onChange={(e) =>
                              mutate(
                                '/members',
                                { id: m.id, role: e.target.value },
                                '직원 권한을 변경했습니다.',
                                'PATCH',
                              )
                            }
                          >
                            <option value="OWNER">사장님</option>
                            <option value="STAFF">직원</option>
                            {m.role === 'MANAGER' && (
                              <option value="MANAGER">매니저</option>
                            )}
                          </select>
                          <span className="badge">
                            {m.active ? '활성' : '중지'}
                          </span>
                          {m.role !== 'OWNER' && (
                            <button
                              className="btn secondary small"
                              disabled={busy}
                              onClick={() =>
                                mutate(
                                  '/members',
                                  { id: m.id, active: !m.active },
                                  m.active
                                    ? '직원 접근을 중지했습니다.'
                                    : '직원 접근을 활성화했습니다.',
                                  'PATCH',
                                )
                              }
                            >
                              {m.active ? '접근 중지' : '활성화'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty>직원 계정이 없습니다.</Empty>
                )}
              </section>
              <Form
                title="직원 초대"
                submit="초대 링크 만들기"
                busy={busy}
                onSubmit={async (f) => {
                  const out = await mutate(
                    '/invitations',
                    { email: text(f, 'email'), role: 'STAFF' },
                    '초대 링크를 생성했습니다. 직원에게 안전하게 전달하세요.',
                  );
                  if (out)
                    setInviteUrl(
                      out.url ??
                        out.inviteUrl ??
                        (out.token
                          ? `${location.origin}/invite?token=${out.token}`
                          : ''),
                    );
                }}
              >
                <Field label="직원 이메일" name="email" type="email" wide />
              </Form>
              {inviteUrl && (
                <div className="notice">
                  <label className="label">
                    일회용 초대 링크
                    <input
                      className="field"
                      readOnly
                      value={inviteUrl}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </label>
                  <p className="footer-note">
                    링크를 전달받은 직원은 계정을 설정할 수 있습니다. 외부에
                    공개하지 마세요.
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
function Metric({
  title,
  value,
  note,
  primary = false,
}: {
  title: string;
  value: string;
  note: string;
  primary?: boolean;
}) {
  return (
    <section className={`card metric-card ${primary ? 'primary' : ''}`}>
      <div className="metric-label">{title}</div>
      <div className="metric">{value}</div>
      <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>
        {note}
      </p>
    </section>
  );
}
