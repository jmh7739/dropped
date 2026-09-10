const {
  contextBridge,
  ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld(
  "api",
  {
    findAutomaticTrends: () =>
      ipcRenderer.invoke(
        "find-automatic-trends"
      ),

    runSelectedTrends: trends =>
      ipcRenderer.invoke(
        "prepare-selected-products",
        trends
      ),

    onLog: callback => {
      ipcRenderer.on(
        "app-log",
        (
          event,
          message
        ) => {
          callback(message);
        }
      );
    }
  }
);