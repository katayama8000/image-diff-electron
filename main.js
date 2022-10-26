// main.js

// アプリケーションの寿命の制御と、ネイティブなブラウザウインドウを作成するモジュール
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const glob = require("glob");
const fs = require("fs");
const PNG = require("pngjs").PNG;
const jpeg = require("jpeg-js");

var dataPath = app.getPath("appData");
var canOpenDevTool = false;
if (!app.isPackaged) {
  dataPath += "/diff";
  canOpenDevTool = true;

  require("electron-reload")(path.join(__dirname, "/src"), {
    electron: path.join(__dirname, "node_modules", ".bin", "electron"),
  });
}

var openPath = app.getPath("home");
if (process.platform === "win32") {
  openPath = app.getPath("recent");
}

const { imgDiff } = require("img-diff-js");

const Store = require("electron-store");
const store = new Store();

const log = require("electron-log");
(() => {
  const d = new Date();
  const prefix =
    d.getFullYear() +
    ("00" + (d.getMonth() + 1)).slice(-2) +
    ("00" + d.getDate()).slice(-2);

  const curr = log.transports.file.fileName;
  log.transports.file.fileName = `${prefix}_${curr}`;
})();

const createWindow = (mainWindow, previousUrl) => {
  let url = "";
  if (previousUrl === "") {
    url = path.join("file://", __dirname, "src/home.html");
  } else {
    url = previousUrl;
  }
  mainWindow.loadURL(url);

  // 開発中のみ起動時に DevTools を開く
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
};

let previousUrl = "";

// このメソッドは、Electron の初期化が完了し、
// ブラウザウインドウの作成準備ができたときに呼ばれます。
// 一部のAPIはこのイベントが発生した後にのみ利用できます。
app.whenReady().then(() => {
  // ブラウザウインドウを作成します。
  let mainWindow = new BrowserWindow({
    width: 1500,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      enableRemoteModule: true,
      contextIsolation: true,
      preload: path.join(__dirname, "src/preload.js"),
      devTools: canOpenDevTool,
    },
  });

  createWindow(mainWindow, previousUrl);

  ipcMain.handle("show-save-dialog", async (event, args) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    const selected = dialog.showSaveDialogSync(win, {
      buttonLabel: "保存", // ボタンのラベル
      defaultPath: "dact_pdf_" + args + ".pdf",
      properties: [
        "createDirectory", // ディレクトリの作成を許可 (macOS)
      ],
    });

    return {
      dir: path.dirname(selected),
      base: path.basename(selected, path.extname(selected)),
      ext: path.extname(selected),
    };
  });

  ipcMain.handle("capture", async (event, args) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    if (args.path !== undefined) {
      const param = {
        printBackground: true,
        marginsType: 2,
        pageSize: "A3",
      };
      // const param = {
      //   printBackground: true,
      //   marginsType: 2,
      //   pageSize: { height: args.height, width: args.width },
      // };

      await win.webContents
        .printToPDF(param)
        .then((data) => {
          fs.writeFile(args.path, data, (error) => {
            if (error) throw error;
            console.log(`Wrote PDF successfully to ${args.path}`);
            return true;
          });
        })
        .catch((error) => {
          console.log(`Failed to write PDF to ${args.path}: `, error);
          return false;
        });
    } else {
      return true;
    }
  });

  ipcMain.handle("home", () => {
    log.info("handle home");
    var url = path.join("file://", __dirname, "src/home.html");
    previousUrl = url;
    log.info("moved", previousUrl);
    return mainWindow.loadURL(url);
  });

  ipcMain.handle("result", async (event, args) => {
    log.info("handle result", args);
    var url = "file://" + __dirname + `/src/result.html?key=${args}`;
    previousUrl = url;
    log.info("moved", previousUrl);
    return mainWindow.loadURL(url);
  });

  app.on("activate", () => {
    // macOS では、Dock アイコンのクリック時に他に開いているウインドウがない
    // 場合、アプリのウインドウを再作成するのが一般的です。
    if (BrowserWindow.getAllWindows().length === 0) {
      log.info("reopen", previousUrl);
      log.info("activated");
      mainWindow = new BrowserWindow({
        width: 1500,
        height: 1000,
        webPreferences: {
          nodeIntegration: false,
          enableRemoteModule: true,
          contextIsolation: true,
          preload: path.join(__dirname, "src/preload.js"),
          devTools: canOpenDevTool,
        },
      });
      createWindow(mainWindow, previousUrl);
    }
  });

  // macOS を除き、全ウインドウが閉じられたときに終了します。 ユーザーが
  // Cmd + Q で明示的に終了するまで、アプリケーションとそのメニューバーを
  // アクティブにするのが一般的です。
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
});

// このファイルでは、アプリ内のとある他のメインプロセスコードを
// インクルードできます。
// 別々のファイルに分割してここで require することもできます。

ipcMain.handle("analyze", async (event, args) => {
  log.info("handle analyze", args);
  const images = findImages(args.expected, args.actual);
  const matchedImages = images.actualImages.filter((actualImage) =>
    images.expectedImages.includes(actualImage)
  );

  const date = new Date()
    .toLocaleString("sv", { timeZone: "Asia/Tokyo" })
    .replace(/\D/g, "");
  const savePath = dataPath + "/" + date;
  log.info(savePath);
  if (!fs.existsSync(savePath)) {
    // fs.mkdirSync(savePath);
    fs.mkdir(savePath, { recursive: true }, (err) => { });
  }

  const param = {};
  for (let i = 0; i < matchedImages.length; i++) {
    await imgDiff({
      actualFilename: args.actual + "/" + matchedImages[i],
      expectedFilename: args.expected + "/" + matchedImages[i],
      diffFilename: savePath + "/" + matchedImages[i],
    }).then(async (result) => {
      const ext = path.extname(matchedImages[i]);
      var wholePixel = 100;
      if (ext === ".png") {
        wholePixel = await getPngWholePixel(
          args.actual + "/" + matchedImages[i]
        );
      } else if (ext === ".jpg" || ext === ".jpeg") {
        wholePixel = await getJpegWholePixel(
          args.actual + "/" + matchedImages[i]
        );
      }
      // log.info("同じ", result.imagesAreSame);
      // log.info("全ピクセル数", wholePixel);
      // log.info("差分ピクセル数", result.diffCount);
      // log.info("差分率", (result.diffCount / wholePixel) * 100);
      const data = (result.diffCount / wholePixel) * 100;
      const digit = 2;
      const diffRate =
        Math.round(data * Math.pow(10, digit)) / Math.pow(10, digit);
      log.info("差分率2", diffRate);
      param[matchedImages[i]] = {
        isSame: result.imagesAreSame,
        diffRate: diffRate,
      };
    });
  }

  store.set(date, {
    actualDirectoryPath: args.actual,
    expectedDirectoryPath: args.expected,
    diffDirectoryPath: savePath,
    results: param,
  });

  return date;
});

ipcMain.handle("open-by-button", async () => {
  return dialog
    .showOpenDialog({
      properties: ["openDirectory"],
      title: "フォルダ選択",
      defaultPath: openPath,
    })
    .then((result) => {
      if (result.canceled) return;
      return result.filePaths[0];
    })
    .catch((err) => console.log(`Error: ${err}`));
});

ipcMain.handle("get-images", async (event, args) => {
  log.info("handle get-images", args);
  return findImages(args.expected, args.actual);
});

ipcMain.handle("get-all-store", async () => {
  log.info("handle get-all-store");
  return store.store;
});

ipcMain.handle("get-store-by-key", async (event, args) => {
  log.info("handle get-store-by-key");
  return store.get(args);
});

ipcMain.handle("check-directory", async (event, args) => {
  log.info("handle check-directory", args);
  const result = {};
  result.expected = fs.existsSync(args.expected);
  result.actual = fs.existsSync(args.actual);
  result.diff = fs.existsSync(args.diff);
  return result;
});

const difference = (arrA, arrB) => arrA.filter((a) => !arrB.includes(a));

const IMAGE_FILES = "/**/*.+(tiff|jpeg|jpg|gif|png|bmp)";

const findImages = (expectedDir, actualDir) => {
  const expectedImages = glob
    .sync(`${expectedDir}${IMAGE_FILES}`)
    .map((p) => path.relative(expectedDir, p))
    .map((p) => (p[0] === path.sep ? p.slice(1) : p));
  const actualImages = glob
    .sync(`${actualDir}${IMAGE_FILES}`)
    .map((p) => path.relative(actualDir, p))
    .map((p) => (p[0] === path.sep ? p.slice(1) : p));
  const deletedImages = difference(expectedImages, actualImages);
  const newImages = difference(actualImages, expectedImages);
  return {
    expectedImages,
    actualImages,
    deletedImages,
    newImages,
  };
};

const getPngWholePixel = (filename) => {
  return new Promise((resolve) => {
    fs.createReadStream(filename)
      .pipe(new PNG())
      .on("parsed", function () {
        resolve(this.height * this.width);
      });
  });
};

const getJpegWholePixel = async (filename) => {
  const rawBuffer = await fs.promises.readFile(filename);
  const imageData = jpeg.decode(rawBuffer);
  return imageData.height + imageData.width;
};
