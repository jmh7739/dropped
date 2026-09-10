const {
  app,
  BrowserWindow,
  ipcMain,
  clipboard
} = require("electron");

const path =
  require("path");

const fs =
  require("fs");

const {
  findAutomaticTrends,
  prepareSelectedProducts
} =
  require("./automation");

const {
  startLocalScheduler
} = require("./scheduler");


let mainWindow = null;


/* =========================================================
   LOG
========================================================= */

function sendLog(message) {
  if (
    mainWindow &&
    !mainWindow.isDestroyed()
  ) {
    mainWindow
      .webContents
      .send(
        "app-log",
        String(message)
      );
  }
}


/* =========================================================
   WINDOW
========================================================= */

function createWindow() {
  mainWindow =
    new BrowserWindow({
      width: 1450,
      height: 950,

      minWidth: 950,
      minHeight: 650,

      backgroundColor:
        "#07111f",

      webPreferences: {
        preload:
          path.join(
            __dirname,
            "preload.js"
          ),

        contextIsolation:
          true,

        nodeIntegration:
          false
      }
    });


  mainWindow.loadFile(
    path.join(
      __dirname,
      "renderer",
      "index.html"
    )
  );
}


/* =========================================================
   APP
========================================================= */

app.whenReady().then(
  () => {
    createWindow();

    startLocalScheduler({
      log: sendLog
    }).catch(error => {
      sendLog(`자동 갱신 시작 실패: ${error?.message || String(error)}`);
    });


    app.on(
      "activate",
      () => {
        if (
          BrowserWindow
            .getAllWindows()
            .length === 0
        ) {
          createWindow();
        }
      }
    );
  }
);


app.on(
  "window-all-closed",
  () => {
    if (
      process.platform !==
      "darwin"
    ) {
      app.quit();
    }
  }
);


/* =========================================================
   TREND FINDER
========================================================= */

ipcMain.handle(
  "find-automatic-trends",

  async () => {
    const profileDir =
      path.join(
        app.getPath(
          "userData"
        ),

        "trend-browser-profile"
      );


    fs.mkdirSync(
      profileDir,
      {
        recursive: true
      }
    );


    sendLog(
      "Dropped Trend Finder v1.0 시작"
    );


    try {
      const result =
        await findAutomaticTrends({
          profileDir,

          minTrendScore:
            0,

          log:
            sendLog
        });


      return result;

    } catch (error) {
      const message =
        error?.message ||
        String(error);


      sendLog(
        `오류: ${message}`
      );


      throw error;
    }
  }
);


/* =========================================================
   PARTNERS QUEUE
========================================================= */

ipcMain.handle(
  "prepare-selected-products",

  async (
    event,
    trends
  ) => {
    try {
      const result =
        await prepareSelectedProducts({
          trends,

          log:
            sendLog
        });


      const json =
        JSON.stringify(
          result.results,
          null,
          2
        );


      /*
        Chrome Extension에서 바로 가져갈 수 있도록
        클립보드에 저장.
      */

      clipboard.writeText(
        json
      );


      const resultDir =
        path.join(
          app.getPath(
            "documents"
          ),

          "DroppedTrendResults"
        );


      fs.mkdirSync(
        resultDir,
        {
          recursive: true
        }
      );


      const queueFile =
        path.join(
          resultDir,

          "partners-queue.json"
        );


      fs.writeFileSync(
        queueFile,
        json,
        "utf8"
      );


      sendLog(
        `✓ 파트너스 대기상품 ${result.results.length}개`
      );


      sendLog(
        "✓ 클립보드에 상품 목록 복사 완료"
      );


      sendLog(
        `✓ 저장: ${queueFile}`
      );


      return {
        ...result,

        queueFile
      };

    } catch (error) {
      const message =
        error?.message ||
        String(error);


      sendLog(
        `파트너스 준비 오류: ${message}`
      );


      throw error;
    }
  }
);
