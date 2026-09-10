import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const PROFILE_DIR = path.resolve("./browser-profile");
const RESULT_DIR = path.resolve("./results");

const KEYWORDS = [
  "바람막이",
  "러닝벨트",
  "보습크림",
];

function normalizeCoupangUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);

    const keepParams = [
      "itemId",
      "vendorItemId",
    ];

    for (const key of [...url.searchParams.keys()]) {
      if (!keepParams.includes(key)) {
        url.searchParams.delete(key);
      }
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

async function searchCoupang(page: any, keyword: string) {
  console.log(`\n검색: ${keyword}`);

  const searchUrl =
    "https://www.coupang.com/np/search?q=" +
    encodeURIComponent(keyword);

  await page.goto(searchUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(3000);

  const bodyText = await page.locator("body").innerText();

  if (
    bodyText.includes("CAPTCHA") ||
    bodyText.includes("보안 확인")
  ) {
    throw new Error(
      "쿠팡 보안 화면이 나타났습니다."
    );
  }

  const productSelectors = [
    "li.search-product",
    ".search-product",
    "[data-product-id]",
  ];

  let selector = "";

  for (const s of productSelectors) {
    if ((await page.locator(s).count()) > 0) {
      selector = s;
      break;
    }
  }

  if (!selector) {
    throw new Error(
      "쿠팡 검색 결과 상품을 찾지 못했습니다."
    );
  }

  const cards = page.locator(selector);

  const count = Math.min(
    await cards.count(),
    10
  );

  const products = [];

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);

    try {
      const link = card.locator("a").first();

      const href =
        await link.getAttribute("href");

      if (!href) continue;

      const title =
        await card
          .locator(
            ".name, .search-product-name"
          )
          .first()
          .innerText()
          .catch(() => "");

      if (!title) continue;

      const url = href.startsWith("http")
        ? href
        : `https://www.coupang.com${href}`;

      products.push({
        title: title.trim(),
        url: normalizeCoupangUrl(url),
      });
    } catch {
      //
    }
  }

  return products;
}

async function createPartnerLink(
  page: any,
  coupangUrl: string
) {
  console.log("파트너스 링크 생성 중...");

  await page.goto(
    "https://partners.coupang.com/#affiliate/ws/link-to-any-page",
    {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    }
  );

  await page.waitForTimeout(3000);

  const bodyText =
    await page.locator("body").innerText();

  if (
    bodyText.includes("로그인") &&
    !bodyText.includes("간편 링크")
  ) {
    console.log(
      "\n쿠팡 파트너스 로그인이 필요합니다."
    );
    console.log(
      "열린 브라우저에서 직접 로그인해주세요."
    );
    console.log(
      "로그인 완료 후 터미널에서 Enter를 누르세요."
    );

    await waitForEnter();

    await page.goto(
      "https://partners.coupang.com/#affiliate/ws/link-to-any-page"
    );

    await page.waitForTimeout(3000);
  }

  const inputs = page.locator(
    "input[type=text], textarea"
  );

  const inputCount = await inputs.count();

  if (!inputCount) {
    throw new Error(
      "URL 입력창을 찾지 못했습니다."
    );
  }

  let input = null;

  for (let i = 0; i < inputCount; i++) {
    const candidate = inputs.nth(i);

    if (await candidate.isVisible()) {
      input = candidate;
      break;
    }
  }

  if (!input) {
    throw new Error(
      "사용 가능한 입력창을 찾지 못했습니다."
    );
  }

  await input.fill(coupangUrl);

  const generateButton =
    page.getByRole("button", {
      name: /링크 생성/,
    });

  if (
    !(await generateButton
      .first()
      .isVisible()
      .catch(() => false))
  ) {
    throw new Error(
      "링크 생성 버튼을 찾지 못했습니다."
    );
  }

  await generateButton.first().click();

  await page.waitForTimeout(2000);

  const affiliateUrl =
    await page.evaluate(() => {
      const elements =
        document.querySelectorAll(
          "input, textarea, a, div, span"
        );

      for (const element of elements) {
        let text = "";

        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement
        ) {
          text = element.value;
        } else if (
          element instanceof HTMLAnchorElement
        ) {
          text =
            element.href ||
            element.textContent ||
            "";
        } else {
          text =
            element.textContent || "";
        }

        const match = text.match(
          /https:\/\/link\.coupang\.com\/a\/[A-Za-z0-9_-]+/
        );

        if (match) {
          return match[0];
        }
      }

      return "";
    });

  if (!affiliateUrl) {
    throw new Error(
      "생성된 파트너스 링크를 찾지 못했습니다."
    );
  }

  return affiliateUrl;
}

function waitForEnter() {
  return new Promise<void>((resolve) => {
    process.stdin.resume();

    process.stdin.once(
      "data",
      () => resolve()
    );
  });
}

async function main() {
  fs.mkdirSync(RESULT_DIR, {
    recursive: true,
  });

  const context =
    await chromium.launchPersistentContext(
      PROFILE_DIR,
      {
        headless: false,
        viewport: {
          width: 1400,
          height: 900,
        },
        locale: "ko-KR",
      }
    );

  const page =
    context.pages()[0] ||
    (await context.newPage());

  const results = [];

  for (const keyword of KEYWORDS) {
    try {
      console.log(
        "\n=============================="
      );

      console.log(
        `키워드: ${keyword}`
      );

      const products =
        await searchCoupang(
          page,
          keyword
        );

      if (!products.length) {
        console.log(
          "검색 상품 없음"
        );
        continue;
      }

      /*
       * 첫 MVP에서는
       * 그냥 첫 상품 선택.
       *
       * 다음 단계에서
       * 평점/리뷰/가격 점수화를 붙인다.
       */
      const product = products[0];

      console.log(
        "선택 상품:",
        product.title
      );

      console.log(
        "일반 URL:",
        product.url
      );

      const affiliateUrl =
        await createPartnerLink(
          page,
          product.url
        );

      console.log(
        "제휴 URL:",
        affiliateUrl
      );

      results.push({
        keyword,
        title: product.title,
        originalUrl: product.url,
        affiliateUrl,
        createdAt:
          new Date().toISOString(),
      });

      await page.waitForTimeout(5000);
    } catch (error) {
      console.error(
        `${keyword} 처리 실패:`,
        error
      );
    }
  }

  const resultFile =
    path.join(
      RESULT_DIR,
      `result-${Date.now()}.json`
    );

  fs.writeFileSync(
    resultFile,
    JSON.stringify(
      results,
      null,
      2
    ),
    "utf8"
  );

  console.log(
    "\n완료"
  );

  console.log(
    `결과 파일: ${resultFile}`
  );

  console.log(
    "브라우저는 로그인 상태 보존을 위해 열어둡니다."
  );
}

main().catch(console.error);