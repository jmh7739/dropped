const findButton =
  document.getElementById(
    "findTrendsButton"
  );

const partnersButton =
  document.getElementById(
    "partnersButton"
  );

const clearLogButton =
  document.getElementById(
    "clearLogButton"
  );

const summary =
  document.getElementById(
    "summary"
  );

const trendResults =
  document.getElementById(
    "trendResults"
  );

const partnersResult =
  document.getElementById(
    "partnersResult"
  );

const logBox =
  document.getElementById(
    "log"
  );

let trends = [];


function escapeHtml(
  value
) {
  return String(
    value ||
    ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


function addLog(
  message
) {
  const row =
    document.createElement(
      "div"
    );

  const time =
    new Date()
      .toLocaleTimeString(
        "ko-KR"
      );

  row.textContent =
    `[${time}] ${message}`;

  logBox.appendChild(
    row
  );

  logBox.scrollTop =
    logBox.scrollHeight;
}


function renderTrends(
  data
) {
  trendResults.innerHTML =
    "";

  const totalProducts =
    data.reduce(
      (
        sum,
        trend
      ) =>
        sum +
        (
          trend
            .productCandidates
            ?.length ||
          0
        ),
      0
    );

  summary.innerHTML =
    `완료 · <strong>인기 검색품목 ${data.length}개</strong> · 상품 후보 ${totalProducts}개`;


  data.forEach(
    (
      trend,
      trendIndex
    ) => {
      const card =
        document.createElement(
          "article"
        );

      card.className =
        "trend-card";


      const previous =
        trend.previousRank ==
        null
          ? "TOP20 밖/미확인"
          : `${trend.previousRank}위`;


      card.innerHTML = `
        <div class="trend-card-top">

          <div class="trend-info">

            <div class="trend-keyword">
              ${escapeHtml(
                trend.keyword
              )}
            </div>

            <div class="badges">

              <span class="badge score">
                Trend ${trend.trendScore}
              </span>

              <span class="badge">
                ${escapeHtml(
                  trend.trendType
                )}
              </span>

              <span class="badge">
                ${escapeHtml(
                  trend.sourceCategory
                )}
              </span>

            </div>

          </div>


          <div class="rank">

            <strong>
              현재 ${trend.currentRank}위
            </strong>

            <span>
              이전 ${escapeHtml(
                previous
              )}
            </span>

          </div>

        </div>


        <div class="reason">
          ${escapeHtml(
            trend.reason
          )}
          ${
            trend.genericPenalty
              ? ` · 범용어 감점 -${trend.genericPenalty}`
              : ""
          }
          ${
            trend.specificityBonus
              ? ` · 구체성 +${trend.specificityBonus}`
              : ""
          }
        </div>


        <div class="product-count">
          상품 ${
            trend
              .productCandidates
              ?.length ||
            0
          }개
        </div>


        <div class="products"></div>
      `;


      const productsBox =
        card.querySelector(
          ".products"
        );


      const products =
        trend
          .productCandidates ||
        [];


      if (
        products.length ===
        0
      ) {
        productsBox.innerHTML = `
          <div class="no-product">
            관련 쿠팡 상품을 찾지 못했습니다.
            트렌드 자체는 유지합니다.
          </div>
        `;
      }


      products.forEach(
        (
          product,
          productIndex
        ) => {
          const row =
            document.createElement(
              "div"
            );

          row.className =
            "product";


          row.innerHTML = `
            <div class="product-select">

              <input
                type="checkbox"
                class="product-checkbox"
                data-trend="${trendIndex}"
                data-product="${productIndex}"
                ${productIndex === 0 ? "checked" : ""}
              >

            </div>


            <div class="product-main">

              <div class="product-score">
                #${productIndex + 1}
                · Product ${product.productScore}
              </div>

              <div class="product-title">
                ${escapeHtml(
                  product.title
                )}
              </div>

              <a
                class="product-link"
                href="${escapeHtml(
                  product.url
                )}"
                target="_blank"
              >
                쿠팡 상품 열기
              </a>

            </div>
          `;


          productsBox.appendChild(
            row
          );
        }
      );


      trendResults.appendChild(
        card
      );
    }
  );
}


function getSelected() {
  const selected =
    trends.map(
      trend => ({
        ...trend,

        selectedProducts:
          []
      })
    );


  document
    .querySelectorAll(
      ".product-checkbox:checked"
    )
    .forEach(
      checkbox => {
        const trendIndex =
          Number(
            checkbox.dataset
              .trend
          );

        const productIndex =
          Number(
            checkbox.dataset
              .product
          );

        const product =
          trends[
            trendIndex
          ]
            ?.productCandidates?.[
              productIndex
            ];

        if (!product) {
          return;
        }

        selected[
          trendIndex
        ].selectedProducts.push(
          product
        );
      }
    );


  return selected.filter(
    trend =>
      trend
        .selectedProducts
        .length
  );
}


/* =========================================================
   인기상품
========================================================= */

findButton.addEventListener(
  "click",
  async () => {
    if (
      !window.api
        ?.findAutomaticTrends
    ) {
      addLog(
        "preload API 연결 실패"
      );

      return;
    }

    findButton.disabled =
      true;

    partnersButton.disabled =
      true;

    summary.textContent =
      "네이버 쇼핑 트렌드 수집 중...";

    trendResults.innerHTML =
      "";

    try {
      const result =
        await window.api
          .findAutomaticTrends();

      trends =
        Array.isArray(
          result
        )
          ? result
          : [];

      renderTrends(
        trends
      );
    } catch (
      error
    ) {
      const message =
        error?.message ||
        String(error);

      summary.textContent =
        `실패 · ${message}`;

      addLog(
        `오류: ${message}`
      );
    } finally {
      findButton.disabled =
        false;

      partnersButton.disabled =
        false;
    }
  }
);


/* =========================================================
   파트너스 준비
========================================================= */

partnersButton.addEventListener(
  "click",
  async () => {
    const selected =
      getSelected();

    const count =
      selected.reduce(
        (
          total,
          trend
        ) =>
          total +
          trend
            .selectedProducts
            .length,
        0
      );

    if (
      count === 0
    ) {
      partnersResult.textContent =
        "선택된 상품이 없습니다.";

      return;
    }

    partnersButton.disabled =
      true;


    try {
      const result =
        await window.api
          .runSelectedTrends(
            selected
          );

      partnersResult.innerHTML = `
        <strong>${result.results.length}개 상품 준비 완료</strong><br>
        상품 목록을 클립보드에 복사했습니다.<br>
        Chrome의 Dropped Link Helper에서
        <b>클립보드에서 가져오기</b>를 누르세요.
      `;
    } catch (
      error
    ) {
      partnersResult.textContent =
        `실패 · ${
          error?.message ||
          String(error)
        }`;
    } finally {
      partnersButton.disabled =
        false;
    }
  }
);


/* =========================================================
   로그
========================================================= */

clearLogButton.addEventListener(
  "click",
  () => {
    logBox.innerHTML =
      "";
  }
);


if (
  window.api?.onLog
) {
  window.api.onLog(
    message => {
      addLog(
        message
      );
    }
  );
}
