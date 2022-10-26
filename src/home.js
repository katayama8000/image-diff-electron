// const { myAPI } = window;

// 今回のテスト
const actualPath = document.getElementById("actual-path");
const actual = document.getElementById("actual");

// クリック時にファイルのパスを取得
actual?.addEventListener("click", async () => {
  const filepath = await myAPI.openByButton();

  if (filepath) {
    if (actualPath) actualPath.textContent = filepath;
  } else {
    if (actualPath) actualPath.textContent = "";
  }
});

// 前回のテスト
const expected = document.getElementById("expected");
const expectedPath = document.getElementById("expected-path");

// クリック時にファイルのパスを取得
expected?.addEventListener("click", async () => {
  const filepath = await myAPI.openByButton();

  if (filepath) {
    if (expectedPath) expectedPath.textContent = filepath;
  } else {
    if (expectedPath) expectedPath.textContent = "";
  }
});


const submit = document.getElementById("submit");
const loader = document.getElementById("loader");

// 実行クリック時
submit?.addEventListener("click", async () => {
  if (actualPath.textContent !== "" && expectedPath.textContent !== "") {
    // ローディング表示
    loader.classList.remove("loaded");
    const key = await myAPI.analyze({
      actual: actualPath.textContent,
      expected: expectedPath.textContent,
    });
    // keyには日付が入る  ex)20221026155139
    if (key) {
      myAPI.result(key);
    }
  }
});

// 最初のHTMLを読み込んだ時に実行
document.addEventListener("DOMContentLoaded", async () => {
  const storeList = document.getElementById("storeList");
  let html = "";

  await myAPI.getAllStore().then((stores) => {
    // storesはエレクトロンのstoreの配列
    const isEmptyStore =
      Object.keys(stores).length === 0 && stores.constructor === Object;

    if (!isEmptyStore) {
      const ordered = Object.keys(stores)
        .reverse()
        .reduce((obj, key) => {
          obj[key] = stores[key];
          return obj;
        }, {});

      console.log(ordered, "ordered");

      // storeの配列を文字列に変換して、htmlに追加
      Object.keys(ordered).map((key) => {
        const year = key.substring(0, 4) + "年";
        const month = key.substring(4, 6) + "月";
        const day = key.substring(6, 8) + "日";
        const hour = key.substring(8, 10) + "時";
        const min = key.substring(10, 12) + "分";
        const sec = key.substring(12, 14) + "秒";
        html +=
          '<div class="columns">' +
          "<div class='column'><ul><li class='list-subject'>" +
          year +
          month +
          day +
          hour +
          min +
          sec +
          "</li><ul class='nested-list'><li class='list-content home-list-content'>今回テストフォルダ：" +
          stores[key].actualDirectoryPath +
          "</li><li class='list-content home-list-content'>前回テストフォルダ：" +
          stores[key].expectedDirectoryPath +
          "</li></ul></ul></div>" +
          '<div class="column col-2 watch-button">' +
          '<button class="watch" data-key="' +
          key +
          '">確認</button>' +
          "</div>" +
          "</div>";
      });
      storeList.innerHTML = html;
    }
  });

  storeList.querySelectorAll(".watch").forEach((store) => {
    store.addEventListener("click", (event) => {
      console.log(event.target.dataset.key);
      myAPI.result(event.target.dataset.key);
    });
  });
});
