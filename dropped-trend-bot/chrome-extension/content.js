function sleep(ms) {
  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}


function clean(
  value
) {
  return String(
    value ||
    ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function inspectPage() {
  const text =
    clean(
      document.body
        ?.innerText ||
      ""
    );

  return {
    accessDenied:
      /access denied/i.test(
        text
      ),

    security:
      /captcha|verify you are human|보안 확인/i.test(
        text
      ),

    loginExpired:
      /로그인.*필요|로그인.*만료|다시 로그인|세션.*만료/i.test(
        text
      ),

    linkPage:
      /간편 링크|링크 생성/i.test(
        text
      )
  };
}


function findInput() {
  const elements =
    [
      ...document
        .querySelectorAll(
          'input[type="text"], input[type="url"], textarea'
        )
    ];


  const visible =
    elements.filter(
      element =>
        element.offsetParent !==
        null
    );


  /*
    URL 관련 placeholder 우선
  */
  for (
    const element of
    visible
  ) {
    const placeholder =
      clean(
        element.getAttribute(
          "placeholder"
        )
      )
        .toLowerCase();

    if (
      placeholder.includes(
        "url"
      ) ||
      placeholder.includes(
        "주소"
      ) ||
      placeholder.includes(
        "링크"
      )
    ) {
      return element;
    }
  }


  return visible[0] ||
    null;
}


function findGenerateButton() {
  const buttons =
    [
      ...document
        .querySelectorAll(
          "button"
        )
    ];


  return buttons.find(
    button =>
      button.offsetParent !==
        null &&
      /링크 생성/.test(
        clean(
          button.innerText
        )
      )
  ) || null;
}


function setValue(
  element,
  value
) {
  const prototype =
    element instanceof
    HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;


  const descriptor =
    Object.getOwnPropertyDescriptor(
      prototype,
      "value"
    );


  if (
    descriptor?.set
  ) {
    descriptor.set.call(
      element,
      value
    );
  } else {
    element.value =
      value;
  }


  element.dispatchEvent(
    new Event(
      "input",
      {
        bubbles: true
      }
    )
  );


  element.dispatchEvent(
    new Event(
      "change",
      {
        bubbles: true
      }
    )
  );
}


function extractLinks() {
  const values = [];


  const text =
    document.body
      ?.innerText ||
    "";


  values.push(
    text
  );


  document
    .querySelectorAll(
      "input, textarea, a"
    )
    .forEach(
      element => {
        values.push(
          element.value ||
          element.href ||
          element.textContent ||
          ""
        );
      }
    );


  const matches =
    values
      .join(
        "\n"
      )
      .match(
        /https:\/\/link\.coupang\.com\/a\/[A-Za-z0-9_-]+/g
      ) ||
    [];


  return [
    ...new Set(
      matches
    )
  ];
}


async function generate(
  originalUrl
) {
  let state =
    inspectPage();


  if (
    state.accessDenied
  ) {
    throw new Error(
      "Access Denied 상태입니다."
    );
  }


  if (
    state.security
  ) {
    throw new Error(
      "보안 확인이 필요합니다."
    );
  }

  if (state.loginExpired) {
    const error = new Error("쿠팡 파트너스 로그인이 만료되었습니다.");
    error.fatal = true;
    throw error;
  }


  if (
    !state.linkPage
  ) {
    throw new Error(
      "쿠팡 파트너스 간편링크 화면을 먼저 열어주세요."
    );
  }


  const input =
    findInput();


  if (!input) {
    throw new Error(
      "URL 입력창을 찾지 못했습니다."
    );
  }


  const before =
    extractLinks();


  setValue(
    input,
    ""
  );


  await sleep(
    150
  );


  setValue(
    input,
    originalUrl
  );


  await sleep(
    350
  );


  const button =
    findGenerateButton();


  if (!button) {
    throw new Error(
      "링크 생성 버튼을 찾지 못했습니다."
    );
  }


  button.click();


  const timeout =
    Date.now() +
    12000;


  while (
    Date.now() <
    timeout
  ) {
    await sleep(
      400
    );


    state =
      inspectPage();


    if (
      state.accessDenied
    ) {
      throw new Error(
        "Access Denied가 발생했습니다."
      );
    }


    if (
      state.security
    ) {
      throw new Error(
        "보안 확인이 필요합니다."
      );
    }

    if (state.loginExpired) {
      const error = new Error("쿠팡 파트너스 로그인이 만료되었습니다.");
      error.fatal = true;
      throw error;
    }


    const links =
      extractLinks();


    const newLink =
      links.find(
        link =>
          !before.includes(
            link
          )
      );


    if (
      newLink
    ) {
      return newLink;
    }


    if (
      before.length === 0 &&
      links.length
    ) {
      return links[
        links.length -
        1
      ];
    }
  }


  throw new Error(
    "생성된 파트너스 링크를 찾지 못했습니다."
  );
}


chrome.runtime.onMessage
  .addListener(
    (
      message,
      sender,
      sendResponse
    ) => {
      if (
        message?.type !==
        "DROPPED_GENERATE"
      ) {
        return;
      }


      const originalUrl =
        message
          ?.item
          ?.originalUrl;


      if (
        !originalUrl
      ) {
        sendResponse({
          ok: false,

          error:
            "쿠팡 상품 URL이 없습니다."
        });

        return;
      }


      generate(
        originalUrl
      )
        .then(
          affiliateUrl => {
            sendResponse({
              ok: true,

              affiliateUrl
            });
          }
        )
        .catch(
          error => {
            sendResponse({
              ok: false,

              error:
                error?.message ||
                String(
                  error
                ),

              fatal:
                Boolean(error?.fatal) ||
                /Access Denied|보안 확인|로그인|간편링크 화면/i.test(error?.message || "")
            });
          }
        );


      return true;
    }
  );
