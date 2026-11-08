import Link from "next/link";
import {
  homeSlugs,
  quickSlugs,
  homeCardNames,
  getCategory,
  siteConfig,
} from "@/config/site";
import { Illustration } from "@/components/Illustration";
import { LiveDate } from "@/components/LiveDate";
import { GuidedStart } from "@/components/GuidedStart";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata(
  "무료 사주와 운세",
  siteConfig.description,
  "/",
);
const faqs = [
  [
    "무료로 이용할 수 있는 기능은 무엇인가요?",
    "기본 사주·오늘·지정일·이번 달·올해 운세와 만세력은 회원가입과 결제 없이 볼 수 있어요. AI 사주는 아직 준비 중이에요.",
  ],
  [
    "같은 정보로 다시 보면 결과가 같나요?",
    "같은 출생정보·조회 기간·원고 버전이면 기본 운세의 계산과 선정 결과가 같아요. 출생 원국은 고정이고 기간 운세는 한국시간의 조회 날짜·달·해에 따라 달라져요. 원고가 매일 전부 달라지는 것은 아니에요.",
  ],
  [
    "태어난 시간을 몰라도 볼 수 있나요?",
    "네. 시간 모름을 선택하면 시주를 제외하고 풀이해요. 절입 경계일에는 연주·월주도 미확정으로 표시할 수 있어요. 자정을 시간 모름으로 대신 입력하지 않아도 돼요.",
  ],
  [
    "오늘의 운세와 지정일 운세는 어떻게 다른가요?",
    "오늘의 운세는 한국시간 오늘을 바로 보여줘요. 지정일 운세는 별도 메뉴에서 원하는 날짜를 골라요. 조회 날짜를 바꿔도 위쪽의 출생 원국은 그대로예요.",
  ],
  [
    "입력한 정보와 AI 대화는 저장되나요? 어떻게 지우나요?",
    "기본 운세 입력은 브라우저 메모리에만 두고 서버로 보내지 않아요. 결과의 입력 지우기나 개인정보 안내의 삭제 버튼으로 지울 수 있어요. 준비 중인 AI는 전송을 따로 안내하고 출생정보·대화 저장을 각각 선택하도록 만들었어요.",
  ],
  [
    "AI 사주는 누가, 하루에 몇 번 이용할 수 있나요?",
    "아직 회원가입과 AI 진단을 열지 않았어요. 개방 후에는 소셜 가입 회원만 한국시간 하루 첫 진단 1회와 후속 질문 2회, 총 3회를 이용할 예정이에요.",
  ],
  [
    "음력 생일도 입력할 수 있나요?",
    "한국 음력과 윤달 생일을 입력하면 날짜를 확인한 뒤 양력으로 바꿔요. 지원 범위는 변환한 양력 1962년 1월 1일부터 한국시간 오늘까지예요.",
  ],
  [
    "다른 사이트와 결과가 다른 이유는요?",
    "입춘·절입 시각, 날짜 경계, 서머타임과 시간 보정 기준이 다를 수 있어요. 하루사주는 한국 표준시와 날짜 변경 0시를 기준으로 계산해요.",
  ],
];
export default function Home() {
  return (
    <main id="main" className="wrap home">
      <h1 className="sr-only">하루사주 운세</h1>
      <div className="home-feature-section">
            <Link
              prefetch={false}
              className="year-banner"
              href="/fortune/year/"
            >
              <div>
                <span className="banner-label">내 사주로 보는 올해 운세</span>
                <h2>
                  올해 운세를
                  <br className="mobile-only" /> 확인해 보세요
                </h2>
                <span>
                  내 사주로 보는 <LiveDate yearOnly />{" "}
                  <span aria-hidden="true">→</span>
                </span>
              </div>
              <Illustration name="calendar" size={100} />
            </Link>
          <aside className="home-aside">
            <div className="today-panel">
              <span className="aside-kicker">오늘의 운세</span>
              <div className="today-art">
                <Illustration name="sun" size={112} />
                <span className="art-hill hill-one" />
                <span className="art-hill hill-two" />
              </div>
              <p className="today-date">
                <LiveDate />
              </p>
              <h2>
                오늘의 운세를
                <br />
                확인해 보세요
              </h2>
              <p>
                오늘의 일, 돈, 연애 등<br />
                여섯 가지 운세를 살펴보세요.
              </p>
              <Link
                prefetch={false}
                className="button primary"
                href="/fortune/day/"
              >
                오늘의 운세 보기 <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="aside-note">
              <span className="note-line" aria-hidden="true">
                ▤
              </span>
              <h3>처음 오셨나요?</h3>
              <p>
                태어난 시간을 몰라도 괜찮아요.
                <br />
                아는 정보만으로 시작해 보세요.
              </p>
              <GuidedStart />
            </div>
          </aside>
      </div>
      <nav className="quick-nav" aria-label="운세 바로가기">
        {quickSlugs.map((s) => {
          const c = getCategory(s)!;
          return (
            <Link prefetch={false} href={`/fortune/${s}/`} key={s}>
              <Illustration name={c.icon} size={30} />
              {c.slug === "saju" ? "신년 운세" : c.name}
              <span aria-hidden="true">↗</span>
            </Link>
          );
        })}
      </nav>
      <section className="home-section">
        <div className="section-heading"><h2>다른 운세도 살펴보세요</h2></div>
        <div className="home-columns">
          <div>
            <div className="category-grid">
              {homeSlugs.map((s) => {
                const c = getCategory(s)!;
                return (
                  <Link
                    prefetch={false}
                    className={`category-tile tile-${c.color}`}
                    href={`/fortune/${s}/`}
                    key={s}
                  >
                    <span className="tile-text">
                      <strong>{homeCardNames[c.slug] ?? c.name}</strong>
                      <span>{c.short}</span>
                    </span>
                    <Illustration name={c.icon} size={90} />
                    <span className="tile-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      <div className="home-bottom">
        <section className="recommend-section">
          <div className="small-section-title">
            <span className="red-marker" />
            <h2>이런 풀이도 있어요</h2>
          </div>
          {["career-money", "month", "mbti"].map((s, i) => {
            const c = getCategory(s)!;
            return (
              <Link
                prefetch={false}
                className="recommend-row"
                key={s}
                href={`/fortune/${s}/`}
              >
                <span className="row-number">0{i + 1}</span>
                <span>
                  <strong>{c.name}</strong>
                  <span>{c.short}</span>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            );
          })}
          <Link prefetch={false} className="text-link" href="/glossary/">
            낯선 사주 용어, 쉽게 알아보기 <span aria-hidden="true">↗</span>
          </Link>
        </section>
        <section className="faq-section">
          <div className="small-section-title">
            <span className="red-marker" />
            <h2>자주 묻는 질문</h2>
          </div>
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{a.replaceAll("하루사주", siteConfig.name)}</p>
            </details>
          ))}
        </section>
      </div>
      <div className="home-reassurance">
        <span aria-hidden="true">◇</span>
        <p>
          기본 운세는 브라우저 안에서 계산해요.
          <br className="mobile-only" /> AI 사주는 요청 전 별도 전송·저장 안내를
          확인해요.
        </p>
        <Link prefetch={false} href="/privacy/">
          자세히 보기 →
        </Link>
      </div>
    </main>
  );
}
