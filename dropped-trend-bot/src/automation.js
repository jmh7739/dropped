const { chromium } = require("playwright");
const {
  config,
  calculateHotScore: coreCalculateHotScore,
  classifyTrend: coreClassifyTrend,
  genericPenalty: coreGenericPenalty,
  specificityBonus: coreSpecificityBonus,
  selectHotTrends,
  calculateProductScore: coreCalculateProductScore,
  productQueueItem,
} = require("./core");


/* =========================================================
   기본 설정
========================================================= */

const NAV_TIMEOUT = 18000;
const REQUEST_TIMEOUT = 10000;

const CATEGORY_MIN = 5;
const FINAL_TREND_COUNT = config.REALTIME_TREND_LIMIT;

const PRODUCT_LIMIT = config.PRODUCT_CANDIDATE_LIMIT;

/*
  네이버에서 쿠팡 상품 2개 이상 찾으면
  Bing 검색을 생략한다.
*/
const NAVER_PRODUCT_TARGET = config.NAVER_PRODUCT_TARGET;

const MIN_PRODUCT_SCORE = config.MIN_PRODUCT_SCORE;


const NAVER_PAGE =
  "https://datalab.naver.com/shoppingInsight/sCategory.naver";

const NAVER_ENDPOINT =
  "/shoppingInsight/getCategoryKeywordRank.naver";


/* =========================================================
   카테고리
========================================================= */

const CATEGORIES = [
  {
    name: "패션의류",
    category: "패션",
    cid: "50000000"
  },
  {
    name: "패션잡화",
    category: "패션잡화",
    cid: "50000001"
  },
  {
    name: "화장품/미용",
    category: "뷰티",
    cid: "50000002"
  },
  {
    name: "디지털/가전",
    category: "디지털",
    cid: "50000003"
  },
  {
    name: "가구/인테리어",
    category: "인테리어",
    cid: "50000004"
  },
  {
    name: "출산/육아",
    category: "육아",
    cid: "50000005"
  },
  {
    name: "식품",
    category: "식품",
    cid: "50000006"
  },
  {
    name: "스포츠/레저",
    category: "스포츠",
    cid: "50000007"
  },
  {
    name: "생활/건강",
    category: "생활",
    cid: "50000008"
  },
  {
    name: "여가/생활편의",
    category: "여가",
    cid: "50000009"
  }
];


/* =========================================================
   범용 키워드

   삭제하지 않고 점수만 감점.
========================================================= */

const GENERIC_WORDS = new Set([
  "원피스",
  "티셔츠",
  "셔츠",
  "바지",
  "치마",
  "자켓",
  "재킷",
  "코트",
  "점퍼",
  "가디건",

  "신발",
  "운동화",
  "구두",
  "슬리퍼",
  "샌들",
  "가방",

  "화장품",
  "샴푸",

  "컴퓨터",
  "노트북",
  "모니터",

  "의자",
  "책상",
  "침대",
  "소파",
  "쇼파",

  "쌀",
  "고기",
  "과일",
  "채소",

  "캠핑",
  "등산",
  "낚시",
  "골프"
]);


/*
  이것들만 완전 제외.
*/
const HARD_EXCLUDE = new Set([
  "상품",
  "제품",
  "추천",
  "할인",
  "세일"
]);


/* =========================================================
   공통
========================================================= */

function sleep(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  );
}


function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/새 창 열림/gi, "")
    .trim();
}


function normalize(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]/gi, "");
}


function clamp(value, min, max) {
  return Math.min(
    max,
    Math.max(min, value)
  );
}


function formatDate(date) {
  return [
    date.getFullYear(),

    String(
      date.getMonth() + 1
    ).padStart(2, "0"),

    String(
      date.getDate()
    ).padStart(2, "0")
  ].join("-");
}


function addDays(date, amount) {
  const copy =
    new Date(date);

  copy.setDate(
    copy.getDate() + amount
  );

  return copy;
}


/* =========================================================
   키워드 판단
========================================================= */

function isHardExcluded(keyword) {
  const word =
    normalize(keyword);

  if (!word) {
    return true;
  }

  if (word.length < 2) {
    return true;
  }

  if (/^[0-9]+$/.test(word)) {
    return true;
  }

  return HARD_EXCLUDE.has(word);
}


function genericPenalty(keyword) {
  return GENERIC_WORDS.has(
    normalize(keyword)
  )
    ? 8
    : 0;
}


function specificityBonus(keyword) {
  const word =
    normalize(keyword);

  let bonus = 0;

  if (/\d/.test(word)) {
    bonus += 4;
  }

  if (
    /[a-z]/i.test(word) &&
    /[가-힣]/.test(word)
  ) {
    bonus += 5;
  }

  if (word.length >= 6) {
    bonus += 3;
  }

  if (word.length >= 9) {
    bonus += 2;
  }

  return bonus;
}


/* =========================================================
   네이버 쇼핑인사이트 요청
========================================================= */

async function requestRanking(
  page,
  {
    cid,
    date,
    pageNumber = 1,
    count = 20
  },
  log
) {
  for (
    let attempt = 1;
    attempt <= 3;
    attempt++
  ) {
    try {
      const result =
        await page.evaluate(
          async data => {
            const controller =
              new AbortController();

            const timer =
              setTimeout(
                () =>
                  controller.abort(),
                data.timeout
              );

            try {
              const body =
                new URLSearchParams();

              body.set(
                "cid",
                data.cid
              );

              body.set(
                "timeUnit",
                "date"
              );

              body.set(
                "startDate",
                data.date
              );

              body.set(
                "endDate",
                data.date
              );

              body.set(
                "age",
                ""
              );

              body.set(
                "gender",
                ""
              );

              body.set(
                "device",
                ""
              );

              body.set(
                "page",
                String(
                  data.pageNumber
                )
              );

              body.set(
                "count",
                String(
                  data.count
                )
              );

              const response =
                await fetch(
                  data.endpoint,
                  {
                    method: "POST",

                    credentials:
                      "include",

                    headers: {
                      "Content-Type":
                        "application/x-www-form-urlencoded; charset=UTF-8",

                      "X-Requested-With":
                        "XMLHttpRequest"
                    },

                    body:
                      body.toString(),

                    signal:
                      controller.signal
                  }
                );

              const text =
                await response.text();

              let json = null;

              try {
                json =
                  JSON.parse(text);
              } catch {}

              return {
                ok:
                  response.ok,

                status:
                  response.status,

                json
              };

            } catch (error) {
              return {
                ok: false,

                error:
                  error?.name ===
                  "AbortError"
                    ? "timeout"
                    : error?.message ||
                      String(error)
              };

            } finally {
              clearTimeout(timer);
            }
          },

          {
            endpoint:
              NAVER_ENDPOINT,

            cid,
            date,
            pageNumber,
            count,

            timeout:
              REQUEST_TIMEOUT
          }
        );


      if (
        result?.ok &&
        Array.isArray(
          result?.json?.ranks
        )
      ) {
        await sleep(300);

        return result.json.ranks;
      }

    } catch (error) {
      const message =
        error?.message ||
        String(error);

      /*
        페이지가 navigation 중이었으면 다시 시도.
      */
      if (
        /execution context was destroyed|navigation/i.test(
          message
        )
      ) {
        log(
          `  ↻ 네이버 데이터 페이지 이동 감지 → 재시도`
        );

        await page
          .waitForLoadState(
            "domcontentloaded",
            {
              timeout: 3000
            }
          )
          .catch(() => {});

        await sleep(350);

      } else {
        log(
          `  ⚠ 네이버 데이터 요청 오류: ${message}`
        );
      }
    }


    if (attempt < 3) {
      const delay =
        attempt === 1
          ? 1800
          : 3500;

      await sleep(delay);
    }
  }


  return [];
}


/* =========================================================
   랭킹 파싱
========================================================= */

function parseRanks(
  rows,
  pageNumber = 1
) {
  return (
    Array.isArray(rows)
      ? rows
      : []
  )
    .map(
      (
        item,
        index
      ) => {
        let rank =
          Number(
            item.rank
          );


        if (
          !rank ||
          (
            pageNumber > 1 &&
            rank <= 20
          )
        ) {
          rank =
            (
              pageNumber - 1
            ) *
              20 +
            index +
            1;
        }


        return {
          keyword:
            cleanText(
              item.keyword
            ),

          rank
        };
      }
    )
    .filter(
      item =>
        item.keyword
    );
}


/* =========================================================
   최신 데이터 날짜
========================================================= */

async function findLatestDate(
  page,
  log
) {
  const today =
    new Date();


  for (
    let back = 1;
    back <= 7;
    back++
  ) {
    const date =
      formatDate(
        addDays(
          today,
          -back
        )
      );


    log(
      `네이버 최신 데이터 확인: ${date}`
    );


    const rows =
      await requestRanking(
        page,
        {
          cid:
            CATEGORIES[0]
              .cid,

          date,

          count:
            20
        },
        log
      );


    if (rows.length) {
      log(
        `✓ 최신 데이터: ${date}`
      );

      return date;
    }
  }


  throw new Error(
    "네이버 쇼핑인사이트 최신 데이터를 찾지 못했습니다."
  );
}


/* =========================================================
   현재 랭킹
========================================================= */

async function getCurrentRanking(
  page,
  category,
  date,
  log
) {
  const rows1 =
    await requestRanking(
      page,
      {
        cid:
          category.cid,

        date,

        pageNumber:
          1,

        count:
          20
      },
      log
    );


  let ranking =
    parseRanks(
      rows1,
      1
    );


  log(
    `  데이터 ${ranking.length}개`
  );


  const top10 =
    ranking
      .slice(0, 10)
      .filter(
        item =>
          !isHardExcluded(
            item.keyword
          )
      );


  log(
    `  TOP10 → 유효 ${top10.length}개`
  );


  if (
    top10.length >=
    CATEGORY_MIN
  ) {
    log(
      `  ✓ TOP10에서 후보 확보`
    );

    return top10;
  }


  log(
    `  후보 부족 → TOP20 확장`
  );


  const top20 =
    ranking
      .slice(0, 20)
      .filter(
        item =>
          !isHardExcluded(
            item.keyword
          )
      );


  log(
    `  TOP20 → 유효 ${top20.length}개`
  );


  if (
    top20.length >=
    CATEGORY_MIN
  ) {
    return top20;
  }


  log(
    `  후보 부족 → TOP40 확장 시도`
  );


  const rows2 =
    await requestRanking(
      page,
      {
        cid:
          category.cid,

        date,

        pageNumber:
          2,

        count:
          20
      },
      log
    );


  const page2 =
    parseRanks(
      rows2,
      2
    );


  const signature1 =
    ranking
      .slice(0, 5)
      .map(
        item =>
          normalize(
            item.keyword
          )
      )
      .join("|");


  const signature2 =
    page2
      .slice(0, 5)
      .map(
        item =>
          normalize(
            item.keyword
          )
      )
      .join("|");


  if (
    signature2 &&
    signature1 !==
      signature2
  ) {
    const seen =
      new Set(
        ranking.map(
          item =>
            normalize(
              item.keyword
            )
        )
      );


    for (
      const item of
      page2
    ) {
      const key =
        normalize(
          item.keyword
        );


      if (
        !seen.has(key)
      ) {
        seen.add(key);

        ranking.push(item);
      }
    }

  } else {
    log(
      `  ⚠ page2 반복 응답 → TOP20까지만 사용`
    );
  }


  const result =
    ranking
      .slice(0, 40)
      .filter(
        item =>
          !isHardExcluded(
            item.keyword
          )
      );


  log(
    `  최종 유효 ${result.length}개`
  );


  return result;
}


/* =========================================================
   이전 순위
========================================================= */

async function getPreviousRanking(
  page,
  category,
  date,
  log
) {
  const rows =
    await requestRanking(
      page,
      {
        cid:
          category.cid,

        date,

        pageNumber:
          1,

        count:
          20
      },
      log
    );


  return parseRanks(
    rows,
    1
  );
}


/* =========================================================
   Trend Score
========================================================= */

function calculateTrendScore(
  currentRank,
  previousRank,
  keyword
) {
  let score;


  if (
    currentRank === 1
  ) {
    score = 80;

  } else if (
    currentRank === 2
  ) {
    score = 77;

  } else if (
    currentRank === 3
  ) {
    score = 74;

  } else if (
    currentRank <= 5
  ) {
    score = 69;

  } else if (
    currentRank <= 7
  ) {
    score = 64;

  } else if (
    currentRank <= 10
  ) {
    score = 60;

  } else if (
    currentRank <= 20
  ) {
    score = 53;

  } else if (
    currentRank <= 30
  ) {
    score = 47;

  } else {
    score = 42;
  }


  if (
    previousRank == null
  ) {
    score += 10;

  } else {
    const rise =
      previousRank -
      currentRank;


    if (
      rise >= 10
    ) {
      score += 18;

    } else if (
      rise >= 6
    ) {
      score += 15;

    } else if (
      rise >= 3
    ) {
      score += 11;

    } else if (
      rise >= 1
    ) {
      score += 7;

    } else if (
      rise === 0
    ) {
      score += 3;
    }
  }


  score +=
    specificityBonus(
      keyword
    );


  score -=
    genericPenalty(
      keyword
    );


  return clamp(
    score,
    0,
    100
  );
}


function classifyTrend(
  currentRank,
  previousRank
) {
  if (
    previousRank == null
  ) {
    return "🆕 인기진입";
  }


  const rise =
    previousRank -
    currentRank;


  if (
    rise >= 6
  ) {
    return "🔥 급상승";
  }


  if (
    rise >= 2
  ) {
    return "📈 상승";
  }


  if (
    currentRank <= 3
  ) {
    return "✨ TOP3";
  }


  if (
    currentRank <= 10
  ) {
    return "⭐ TOP10";
  }


  return "📌 인기권";
}


/* =========================================================
   전체 트렌드 수집
========================================================= */

async function collectTrends(
  page,
  log
) {
  log(
    "네이버 쇼핑인사이트 접속..."
  );


  await page.goto(
    NAVER_PAGE,
    {
      waitUntil:
        "domcontentloaded",

      timeout:
        NAV_TIMEOUT
    }
  );


  await sleep(600);


  const latestDate =
    await findLatestDate(
      page,
      log
    );


  const previousDate =
    formatDate(
      addDays(
        new Date(
          `${latestDate}T12:00:00`
        ),
        -1
      )
    );


  log(
    `수집 기준: 카테고리 TOP10 · 필요 시 TOP20~40`
  );


  log(
    `${previousDate} → ${latestDate}`
  );


  const groups = [];


  for (
    let i = 0;
    i <
    CATEGORIES.length;
    i++
  ) {
    const category =
      CATEGORIES[i];


    log(
      `[${i + 1}/${CATEGORIES.length}] ${category.name}`
    );


    const current =
      await getCurrentRanking(
        page,
        category,
        latestDate,
        log
      );


    const previous =
      await getPreviousRanking(
        page,
        category,
        previousDate,
        log
      );


    const previousMap =
      new Map(
        previous.map(
          item => [
            normalize(
              item.keyword
            ),

            item.rank
          ]
        )
      );


    const candidates =
      current.map(
        item => {
          const key =
            normalize(
              item.keyword
            );


          const previousRank =
            previousMap.has(
              key
            )
              ? previousMap.get(
                  key
                )
              : null;


          return {
            keyword:
              item.keyword,

            normalizedKeyword:
              key,

            category:
              category.category,

            sourceCategory:
              category.name,

            currentRank:
              item.rank,

            previousRank,

            rankChange:
              previousRank == null
                ? null
                : previousRank -
                  item.rank,

            trendScore:
              coreCalculateHotScore(
                item.rank,
                previousRank,
                item.keyword
              ),

            trendType:
              coreClassifyTrend(
                item.rank,
                previousRank
              ),

            genericPenalty:
              coreGenericPenalty(
                item.keyword
              ),

            specificityBonus:
              coreSpecificityBonus(
                item.keyword
              ),

            observedDate:
              latestDate,

            reason:
              previousRank == null
                ? `${category.name} 현재 ${item.rank}위 · 이전 TOP20 밖/미확인`
                : `${category.name} ${previousRank}위 → ${item.rank}위`
          };
        }
      );


    candidates.sort(
      (a, b) =>
        b.trendScore -
          a.trendScore ||
        a.currentRank -
          b.currentRank
    );


    log(
      `  ✓ 후보 ${candidates.length}개`
    );


    log(
      `  유지: ${candidates
        .slice(0, 7)
        .map(
          item =>
            item.keyword
        )
        .join(", ")}`
    );


    groups.push({
      category,
      candidates
    });


    await sleep(350);
  }


  // 품질 우선 전체 선발. 카테고리별 강제 할당은 하지 않고
  // 한 카테고리의 과도한 독점만 느슨하게 제한한다.
  const selected = selectHotTrends(
    groups.flatMap(group => group.candidates),
    FINAL_TREND_COUNT
  );


  log(
    `✓ 최종 인기 검색품목 ${selected.length}개`
  );


  return selected.slice(
    0,
    FINAL_TREND_COUNT
  );
}


/* =========================================================
   Coupang URL 처리
========================================================= */

function decodeRepeatedly(
  value
) {
  let text =
    String(
      value || ""
    );


  for (
    let i = 0;
    i < 4;
    i++
  ) {
    try {
      const decoded =
        decodeURIComponent(
          text
        );


      if (
        decoded ===
        text
      ) {
        break;
      }


      text =
        decoded;

    } catch {
      break;
    }
  }


  return text;
}


function findCoupangUrl(raw) {
  const decoded =
    decodeRepeatedly(
      raw
    );


  const match =
    decoded.match(
      /https?:\/\/(?:www\.)?coupang\.com\/vp\/products\/\d+[^\s"'<>]*/i
    );


  return match
    ? match[0]
    : null;
}


function normalizeCoupangUrl(raw) {
  try {
    const candidate =
      findCoupangUrl(
        raw
      );


    if (!candidate) {
      return null;
    }


    const url =
      new URL(candidate);


    const hostname =
      url.hostname
        .toLowerCase();


    if (
      hostname !==
        "coupang.com" &&
      !hostname.endsWith(
        ".coupang.com"
      )
    ) {
      return null;
    }


    if (
      !url.pathname.includes(
        "/vp/products/"
      )
    ) {
      return null;
    }


    const allowed =
      new Set([
        "itemId",
        "vendorItemId"
      ]);


    for (
      const key of
      [
        ...url
          .searchParams
          .keys()
      ]
    ) {
      if (
        !allowed.has(key)
      ) {
        url.searchParams.delete(
          key
        );
      }
    }


    return url.toString();

  } catch {
    return null;
  }
}


function productIdFromUrl(url) {
  const match =
    String(url).match(
      /\/products\/(\d+)/
    );


  return match
    ? match[1]
    : url;
}


/* =========================================================
   이상한 제목 제거
========================================================= */

function isBadTitle(title) {
  const text =
    cleanText(
      title
    );


  if (!text) {
    return true;
  }


  if (
    /^쿠팡\s*www\.coupang\.com/i.test(
      text
    )
  ) {
    return true;
  }


  if (
    /coupang\.com\s*[›>]/i.test(
      text
    )
  ) {
    return true;
  }


  const arrows =
    (
      text.match(
        /›/g
      ) || []
    ).length;


  if (arrows >= 2) {
    return true;
  }


  if (
    /^쿠팡\s*[-–|]/i.test(
      text
    )
  ) {
    return true;
  }

  if (
    /현재 별점.*리뷰.*지금 쿠팡|쿠팡에서.*구매하고 더 많은 혜택|지금 쿠팡에서 더 저렴하고/i.test(
      text
    )
  ) {
    return true;
  }


  return false;
}


/* =========================================================
   검색 URL
========================================================= */

function buildSearchUrl(
  engine,
  query
) {
  if (
    engine === "naver"
  ) {
    return (
      "https://search.naver.com/search.naver?query=" +
      encodeURIComponent(
        query
      )
    );
  }


  if (
    engine === "bing"
  ) {
    return (
      "https://www.bing.com/search?q=" +
      encodeURIComponent(
        query
      )
    );
  }


  return "";
}


/* =========================================================
   검색 페이지 안정화
========================================================= */

async function waitForPageStable(
  page,
  engine,
  log
) {
  for (
    let attempt = 1;
    attempt <= 4;
    attempt++
  ) {
    try {
      await page
        .waitForLoadState(
          "domcontentloaded",
          {
            timeout: 3000
          }
        )
        .catch(() => {});


      await sleep(250);


      await page.evaluate(
        () =>
          document.readyState
      );


      return true;

    } catch (error) {
      if (
        attempt < 4
      ) {
        await sleep(300);

        continue;
      }


      log(
        `  ⚠ ${engine} 페이지 안정화 실패`
      );


      return false;
    }
  }


  return false;
}


/* =========================================================
   검색결과 읽기

   navigation 때문에 evaluate가 깨져도
   전체 작업이 죽지 않게 최대 3회 재시도.
========================================================= */

async function collectSearchPage(
  page,
  searchUrl,
  engine,
  log
) {
  try {
    await page.goto(
      searchUrl,
      {
        waitUntil:
          "domcontentloaded",

        timeout:
          NAV_TIMEOUT
      }
    );

  } catch (error) {
    log(
      `  ⚠ ${engine} 검색 이동 실패: ${
        error?.message ||
        String(error)
      }`
    );


    return [];
  }


  const stable =
    await waitForPageStable(
      page,
      engine,
      log
    );


  if (!stable) {
    return [];
  }


  let body = "";


  try {
    body =
      await page
        .locator("body")
        .innerText({
          timeout:
            4000
        });

  } catch {
    log(
      `  ⚠ ${engine} 본문 읽기 실패 → 건너뜀`
    );


    return [];
  }


  if (
    /captcha|verify you are human|access denied|보안 확인/i.test(
      body
    )
  ) {
    log(
      `  ⚠ ${engine} 보안확인 감지`
    );


    return [];
  }


  for (
    let attempt = 1;
    attempt <= 3;
    attempt++
  ) {
    try {
      const rows =
        await page.evaluate(
          () => {
            const output = [];


            const links =
              [
                ...document.querySelectorAll(
                  "a"
                )
              ];


            for (
              const link of
              links
            ) {
              const href =
                link.href ||
                link.getAttribute(
                  "href"
                ) ||
                "";


              if (!href) {
                continue;
              }


              /*
                네이버/Bing redirect 주소에
                coupang 문자열이 들어갈 수도 있음.
              */

              if (
                !href
                  .toLowerCase()
                  .includes(
                    "coupang"
                  )
              ) {
                continue;
              }


              const titleNode =
                link.querySelector(
                  "h3, h2, strong"
                );


              let title =
                (
                  titleNode
                    ?.textContent ||
                  link.getAttribute(
                    "aria-label"
                  ) ||
                  link.textContent ||
                  ""
                )
                  .replace(
                    /\s+/g,
                    " "
                  )
                  .replace(
                    /새 창 열림/gi,
                    ""
                  )
                  .trim();


              if (
                title.length >
                180
              ) {
                title =
                  title.slice(
                    0,
                    180
                  );
              }


              const resultCard =
                link.closest(
                  "li, article, [class*='product'], [class*='item'], [class*='api_subject_bx'], [class*='total_wrap']"
                );

              const image =
                link.querySelector(
                  "img"
                ) ||
                resultCard?.querySelector(
                  "img"
                );

              // 쿠팡 검색결과는 lazy-load라 src가 빈/플레이스홀더일 수 있음
              //  → data-src/srcset 우선, 프로토콜상대(//) 보정.
              let imageUrl =
                image?.getAttribute("data-src") ||
                image?.getAttribute("data-img-src") ||
                image?.getAttribute("data-lazysrc") ||
                image?.getAttribute("data-original") ||
                (image?.getAttribute("srcset") || "").split(" ")[0] ||
                image?.currentSrc ||
                image?.getAttribute("src") ||
                "";
              if (/^data:/.test(imageUrl) || /blank|placeholder|1x1|spacer/i.test(imageUrl)) {
                imageUrl =
                  image?.getAttribute("data-src") ||
                  image?.getAttribute("src") ||
                  "";
              }
              if (imageUrl.startsWith("//")) imageUrl = "https:" + imageUrl;

              // 가격: 쿠팡은 가격이 <a> 밖(상품 카드 li)에 있을 수 있어
              //  가장 가까운 카드 컨테이너까지 텍스트를 훑어 '12,900원' 패턴 추출.
              const priceScope =
                resultCard ||
                link.parentElement ||
                link;
              const priceText =
                (priceScope && priceScope.textContent) ||
                link.textContent ||
                "";
              const priceMatch = priceText.match(/([0-9][0-9,]{3,})\s*원/);
              const price = priceMatch
                ? parseInt(priceMatch[1].replace(/,/g, ""), 10)
                : null;

              output.push({
                href,

                title,

                imageUrl,

                price
              });
            }


            return output;
          }
        );


      return rows;

    } catch (error) {
      const message =
        error?.message ||
        String(error);


      if (
        /execution context was destroyed|navigation/i.test(
          message
        )
      ) {
        if (
          attempt < 3
        ) {
          log(
            `  ↻ ${engine} 페이지 이동 감지 → 다시 읽기`
          );


          await page
            .waitForLoadState(
              "domcontentloaded",
              {
                timeout:
                  3000
              }
            )
            .catch(() => {});


          await sleep(400);


          continue;
        }


        log(
          `  ⚠ ${engine} 페이지가 계속 이동 중 → 이 검색만 건너뜀`
        );


        return [];
      }


      log(
        `  ⚠ ${engine} 결과 분석 실패: ${message}`
      );


      return [];
    }
  }


  return [];
}


/* =========================================================
   빠른 상품 검색
========================================================= */

async function fastProductSearch(
  page,
  keyword,
  log
) {
  const collected = [];


  /* -------------------------------------------------------
     NAVER 1회
  ------------------------------------------------------- */

  const naverQuery =
    `${keyword} 쿠팡`;


  log(
    `  NAVER 검색`
  );


  const naverRows =
    await collectSearchPage(
      page,

      buildSearchUrl(
        "naver",
        naverQuery
      ),

      "NAVER",

      log
    );


  collected.push(
    ...naverRows
  );


  let uniqueCount =
    countUniqueCoupangProducts(
      collected
    );


  log(
    `  NAVER → 쿠팡 상품 ${uniqueCount}개`
  );


  /*
    2개 이상이면 충분.
    Bing 생략.
  */

  if (
    uniqueCount >=
    NAVER_PRODUCT_TARGET
  ) {
    log(
      `  ✓ NAVER에서 후보 확보 → 추가 검색 생략`
    );


    return collected;
  }


  /* -------------------------------------------------------
     BING
     네이버가 0~1개일 때만.
  ------------------------------------------------------- */

  log(
    `  후보 부족 → BING 1회 보조검색`
  );


  const bingQuery =
    `${keyword} site:coupang.com/vp/products`;


  const bingRows =
    await collectSearchPage(
      page,

      buildSearchUrl(
        "bing",
        bingQuery
      ),

      "BING",

      log
    );


  collected.push(
    ...bingRows
  );


  uniqueCount =
    countUniqueCoupangProducts(
      collected
    );


  log(
    `  BING 포함 → 쿠팡 상품 ${uniqueCount}개`
  );


  return collected;
}


/* =========================================================
   URL 개수
========================================================= */

function countUniqueCoupangProducts(
  rows
) {
  const ids =
    new Set();


  for (
    const row of
    rows
  ) {
    const url =
      normalizeCoupangUrl(
        row.href
      );


    if (!url) {
      continue;
    }


    ids.add(
      productIdFromUrl(
        url
      )
    );
  }


  return ids.size;
}


/* =========================================================
   키워드 토큰
========================================================= */

function keywordTokens(
  keyword
) {
  const original =
    String(
      keyword || ""
    ).toLowerCase();


  const latin =
    original.match(
      /[a-z]+/gi
    ) || [];


  const korean =
    original.match(
      /[가-힣]+/g
    ) || [];


  const numbers =
    original.match(
      /\d+(?:kg|g|ml|l|tb|gb|인치)?/gi
    ) || [];


  return [
    ...new Set(
      [
        ...latin,
        ...korean,
        ...numbers
      ]
        .map(
          token =>
            normalize(token)
        )
        .filter(
          token =>
            token.length >= 2
        )
    )
  ];
}


/* =========================================================
   Product Score
========================================================= */

function calculateProductScore(
  keyword,
  product,
  index
) {
  if (
    isBadTitle(
      product.title
    )
  ) {
    return 0;
  }


  const title =
    normalize(
      product.title
    );


  const fullKeyword =
    normalize(
      keyword
    );


  let score = 20;


  if (
    fullKeyword &&
    title.includes(
      fullKeyword
    )
  ) {
    score += 55;

  } else {
    const tokens =
      keywordTokens(
        keyword
      );


    if (tokens.length) {
      const matched =
        tokens.filter(
          token =>
            title.includes(
              token
            )
        );


      const coverage =
        matched.length /
        tokens.length;


      score +=
        Math.round(
          coverage * 50
        );


      if (
        matched.length ===
          tokens.length &&
        tokens.length >= 2
      ) {
        score += 10;
      }
    }
  }


  score +=
    Math.max(
      0,
      8 - index
    );


  if (
    product.imageUrl
  ) {
    score += 4;
  }


  if (
    cleanText(
      product.title
    ).length < 8
  ) {
    score -= 10;
  }


  return clamp(
    Math.round(score),
    0,
    100
  );
}


/* =========================================================
   상품 후보
========================================================= */

async function findProductCandidates(
  page,
  keyword,
  log
) {
  log(
    `상품 후보 검색: ${keyword}`
  );


  let raw = [];


  try {
    raw =
      await fastProductSearch(
        page,
        keyword,
        log
      );

  } catch (error) {
    /*
      특정 검색어에서 오류가 나도
      전체 20개 수집은 계속.
    */

    log(
      `  ⚠ 상품 검색 오류 → 이 품목만 건너뜀: ${
        error?.message ||
        String(error)
      }`
    );


    return [];
  }


  const uniqueProducts =
    new Map();


  for (
    const item of
    raw
  ) {
    const url =
      normalizeCoupangUrl(
        item.href
      );


    if (!url) {
      continue;
    }


    const productId =
      productIdFromUrl(
        url
      );


    const candidate = {
      productId,

      url,

      title:
        cleanText(
          item.title
        ),

      imageUrl:
        item.imageUrl ||
        "",

      price:
        typeof item.price === "number" && item.price > 0
          ? item.price
          : null
    };


    if (
      isBadTitle(
        candidate.title
      )
    ) {
      continue;
    }


    const existing =
      uniqueProducts.get(
        productId
      );


    if (!existing) {
      uniqueProducts.set(productId, candidate);
    } else {
      const betterTitle = candidate.title.length > existing.title.length
        ? candidate.title
        : existing.title;
      uniqueProducts.set(productId, {
        ...existing,
        ...candidate,
        title: betterTitle,
        imageUrl: candidate.imageUrl || existing.imageUrl || "",
        price: candidate.price || existing.price || null,
      });
    }
  }


  const products =
    [
      ...uniqueProducts.values()
    ];


  const scored =
    products
      .map(
        (
          product,
          index
        ) => ({
          ...product,

          productScore:
            coreCalculateProductScore(
              keyword,
              product,
              index
            )
        })
      )
      .sort(
        (a, b) =>
          b.productScore -
          a.productScore
      );


  let selected =
    scored
      .filter(
        item =>
          item.productScore >=
          MIN_PRODUCT_SCORE
      )
      .slice(
        0,
        PRODUCT_LIMIT
      );


  log(
    `  ✓ 최종 상품 후보 ${selected.length}개`
  );


  return selected;
}


/* =========================================================
   메인
========================================================= */

async function findRealtimeTrends({
  profileDir,
  minTrendScore = 0,
  log = console.log
}) {
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    locale: "ko-KR",
    viewport: { width: 1280, height: 800 }
  });
  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(NAV_TIMEOUT);
  try {
    const trends = await collectTrends(page, log);
    return trends.filter(trend => trend.trendScore >= minTrendScore);
  } finally {
    await context.close().catch(() => {});
  }
}

async function findAutomaticTrends({
  profileDir,
  minTrendScore = 0,
  log = console.log
}) {
  const context =
    await chromium
      .launchPersistentContext(
        profileDir,
        {
          headless: true,

          locale:
            "ko-KR",

          viewport: {
            width:
              1280,

            height:
              800
          }
        }
      );


  const page =
    context.pages()[0] ||
    await context.newPage();


  page.setDefaultTimeout(
    8000
  );


  page
    .setDefaultNavigationTimeout(
      NAV_TIMEOUT
    );


  try {
    const trends =
      await collectTrends(
        page,
        log
      );


    const filtered =
      trends.filter(
        trend =>
          trend.trendScore >=
          minTrendScore
      );


    log(
      `상품 검색 시작 · ${filtered.length}개 품목`
    );


    const results = [];


    for (
      let i = 0;
      i <
      filtered.length;
      i++
    ) {
      const trend =
        filtered[i];


      log(
        `[상품 ${i + 1}/${filtered.length}] ${trend.keyword} · Trend ${trend.trendScore}`
      );


      let products = [];


      try {
        products =
          await findProductCandidates(
            page,
            trend.keyword,
            log
          );

      } catch (error) {
        /*
          마지막 안전장치.
          어떤 상품에서 오류가 나도 다음으로 진행.
        */

        log(
          `  ⚠ ${trend.keyword} 검색 실패 → 다음 품목 진행: ${
            error?.message ||
            String(error)
          }`
        );


        products = [];
      }


      results.push({
        ...trend,

        productCandidates:
          products
      });


      await sleep(200);
    }


    const productCount =
      results.reduce(
        (
          total,
          trend
        ) =>
          total +
          trend
            .productCandidates
            .length,
        0
      );


    log(
      `✓ 완료 · 인기 검색품목 ${results.length}개 · 상품 후보 ${productCount}개`
    );


    return results;

  } finally {
    await context
      .close()
      .catch(
        () => {}
      );
  }
}


/* =========================================================
   파트너스 Extension Queue
========================================================= */

async function prepareSelectedProducts({
  trends,
  log = console.log
}) {
  if (
    !Array.isArray(
      trends
    )
  ) {
    throw new Error(
      "선택상품 데이터가 올바르지 않습니다."
    );
  }


  const results = [];


  for (
    const trend of
    trends
  ) {
    for (
      const product of
      trend.selectedProducts ||
      []
    ) {
      results.push({
        ...productQueueItem(trend, product),
        category: trend.category,
        sourceCategory: trend.sourceCategory,
        trendScore: trend.trendScore,
        trendType: trend.trendType,
        currentRank: trend.currentRank,
        previousRank: trend.previousRank,
        productScore: product.productScore,
        imageUrl: product.imageUrl || "",
      });
    }
  }


  if (
    !results.length
  ) {
    throw new Error(
      "선택된 상품이 없습니다."
    );
  }


  log(
    `파트너스용 상품 ${results.length}개 준비`
  );


  return {
    results,

    extensionMode:
      true
  };
}


/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  findRealtimeTrends,
  findAutomaticTrends,
  prepareSelectedProducts
};
