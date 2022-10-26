let params = new URLSearchParams(location.search);
const key = params.get("key");

const container = document.getElementById("container");
const diffList = document.getElementById("diff-list");
const newList = document.getElementById("new-list");
const deleteList = document.getElementById("delete-list");

const capture = document.getElementById("capture");

const loader = document.getElementById("loader");

const mmHeight = document.getElementById("my_mm").clientHeight;

myAPI.getStoreByKey(key).then((store) => {
  loader.classList.remove("loaded");

  myAPI
    .checkDirectory({
      expected: store.expectedDirectoryPath,
      actual: store.actualDirectoryPath,
      diff: store.diffDirectoryPath,
    })
    .then((checkResult) => {
      var canDisplay = true;
      var errorText = "";

      if (!checkResult.actual) {
        canDisplay = false;
        errorText += "<p>今回テストフォルダが見つかりません。</p>";
      }
      if (!checkResult.expected) {
        canDisplay = false;
        errorText += "<p>前回テストフォルダが見つかりません。</p>";
      }
      if (!checkResult.diff) {
        canDisplay = false;
        errorText += "<p>差分結果フォルダが見つかりません。</p>";
      }

      document.getElementById("actual-directory-path-display").innerHTML =
        "<li class='list-content'>" + store.actualDirectoryPath + "</li>";
      document.getElementById("expected-directory-path-display").innerHTML =
        "<li class='list-content'>" + store.expectedDirectoryPath + "</li>";
      document.getElementById("diff-directory-path-display").innerHTML =
        "<li class='list-content'>" + store.diffDirectoryPath + "</li>";

      if (canDisplay) {
        myAPI
          .getImages({
            expected: store.expectedDirectoryPath,
            actual: store.actualDirectoryPath,
          })
          .then((images) => {
            const mergedImages = {};
            const users = [];
            const imageForEachUser = {};

            const matchedImages = images.actualImages.filter((actualImage) =>
              images.expectedImages.includes(actualImage)
            );

            if (matchedImages.length > 0) {
              matchedImages.map((image) => {
                if (typeof store.results[image] === "boolean") {
                  if (store.results[image]) {
                    mergedImages[image] = "OK";
                  } else {
                    mergedImages[image] = "NG";
                  }
                } else {
                  if (store.results[image].isSame) {
                    mergedImages[image] = "OK";
                  } else {
                    mergedImages[image] = "NG";
                  }
                }

                if (!users.includes(image.split("/")[0])) {
                  users.push(image.split("/")[0]);
                }
              });
            }

            if (images.newImages.length > 0) {
              images.newImages.map((image) => {
                mergedImages[image] = "NEW";

                if (!users.includes(image.split("/")[0])) {
                  users.push(image.split("/")[0]);
                }
              });
            }

            if (images.deletedImages.length > 0) {
              images.deletedImages.map((image) => {
                mergedImages[image] = "DELETE";

                if (!users.includes(image.split("/")[0])) {
                  users.push(image.split("/")[0]);
                }
              });
            }

            users.map((user) => {
              imageForEachUser[user] = {};
            });

            const ordered = Object.keys(mergedImages)
              .sort()
              .reduce((obj, key) => {
                obj[key] = mergedImages[key];
                const user = key.split("/")[0];
                imageForEachUser[user][key] = mergedImages[key];
                return obj;
              }, {});

            const generate = generateHtml(ordered, store);

            container.innerHTML = generate.container;
            diffList.innerHTML = generate.list;
            loader.classList.add("loaded");

            capture?.addEventListener("click", async () => {
              loader.classList.remove("loaded");
              const paths = await myAPI.showSaveDialog(key);
              for (let i = 0; i < users.length; i++) {
                const generate = generateHtml(
                  imageForEachUser[users[i]],
                  store
                );

                container.innerHTML = generate.container;
                diffList.innerHTML = generate.list;

                await new Promise((resolve) => setTimeout(resolve, 1000));

                // const scrollContainer = document.getElementById("container");
                // const header = document.getElementById("header");
                // const imageHeader = document.getElementById("image-header");
                // const body = document.getElementById("body");

                // const width = body.offsetWidth;
                // const height =
                //   scrollContainer.scrollHeight +
                //   header.offsetHeight +
                //   imageHeader.offsetHeight;

                // const param = {
                //   path:
                //     paths.dir + "/" + paths.base + "_" + users[i] + paths.ext,
                //   width: pxToMm(width),
                //   height: pxToMm(height),
                // };
                const param = {
                  path:
                    paths.dir + "/" + paths.base + "_" + users[i] + paths.ext,
                };
                await myAPI.capture(param);
              }

              const generate = generateHtml(ordered, store);
              container.innerHTML = generate.container;
              diffList.innerHTML = generate.list;
              loader.classList.add("loaded");
            });
          });
      } else {
        container.innerHTML += errorText;
        loader.classList.add("loaded");
      }
    });
});

// home画面に戻るボタン
const home = document.getElementById("home");

home?.addEventListener("click", async () => {
  await myAPI.home();
});

const generateHtml = (images, store) => {
  let containerHtml = "";
  let listHtml = "";

  Object.keys(images).map((image) => {
    if (images[image] === "OK") {
      containerHtml +=
        "<div class='columns'><div class='column'><p class='image-name' id='" +
        image +
        "'><span class='image-category ok-color'>OK</span>" +
        image +
        "</p></div></div>" +
        '<div class="columns">' +
        '<div class="column"><image class="result-image" src="' +
        store.actualDirectoryPath +
        "/" +
        image +
        '"></div>' +
        '<div class="column"><image class="result-image" src="' +
        store.expectedDirectoryPath +
        "/" +
        image +
        '"></div>' +
        '<div class="column"><image class="result-image" src="' +
        store.diffDirectoryPath +
        "/" +
        image +
        '"></div>' +
        "</div>";
    } else if (images[image] === "NG") {
      var imageCategory = "";
      if (typeof store.results[image] === "boolean") {
        imageCategory = "'><span class='image-category ng-color'>NG</span>";
      } else {
        imageCategory =
          "'><span class='image-category ng-color'>NG 差分率 " +
          store.results[image].diffRate +
          "%</span>";
      }
      containerHtml +=
        "<div class='columns'><div class='column'><p class='image-name' id='" +
        image +
        imageCategory +
        image +
        "</p></div></div>" +
        '<div class="columns">' +
        '<div class="column"><image class="result-image" src="' +
        store.actualDirectoryPath +
        "/" +
        image +
        '"></div>' +
        '<div class="column"><image class="result-image" src="' +
        store.expectedDirectoryPath +
        "/" +
        image +
        '"></div>' +
        '<div class="column"><image class="result-image" src="' +
        store.diffDirectoryPath +
        "/" +
        image +
        '"></div>' +
        "</div>";
    } else if (images[image] === "NEW") {
      containerHtml +=
        "<div class='columns'><div class='column'><p class='image-name' id='" +
        image +
        "'><span class='image-category new-color'>NEW</span>" +
        image +
        "</p></div></div>" +
        '<div class="columns">' +
        '<div class="column"><image class="result-image" src="' +
        store.actualDirectoryPath +
        "/" +
        image +
        '"></div>' +
        '<div class="column"></div>' +
        '<div class="column"></div>' +
        "</div>";
    } else if (images[image] === "DELETE") {
      containerHtml +=
        "<div class='columns'><div class='column'><p class='image-name' id='" +
        image +
        "'><span class='image-category delete-color'>DELETE</span>" +
        image +
        "</p></div></div>" +
        '<div class="columns">' +
        '<div class="column"></div>' +
        '<div class="column"><image class="result-image" src="' +
        store.expectedDirectoryPath +
        "/" +
        image +
        '"></div>' +
        '<div class="column"></div>' +
        "</div>";
    }

    // リスト部
    listHtml += "<li class='list-content'>";
    if (images[image] === "OK") {
      listHtml += "<span class='image-category ok-color'>OK</span>";
    } else if (images[image] === "NG") {
      if (typeof store.results[image] === "boolean") {
        listHtml += "<span class='image-category ng-color'>NG</span>";
      } else {
        listHtml +=
          "<span class='image-category ng-color'>NG 差分率 " +
          store.results[image].diffRate +
          "%</span>";
      }
    } else if (images[image] === "NEW") {
      listHtml += "<span class='image-category new-color'>NEW</span>";
    } else if (images[image] === "DELETE") {
      listHtml += "<span class='image-category delete-color'>DELETE</span>";
    }
    listHtml +=
      "</li><li class='list-content'><a href='#" +
      image +
      "'>" +
      image +
      "</a></li>";
  });

  return { container: containerHtml, list: listHtml };
};

const pxToMm = function (px) {
  return Math.floor(px / (mmHeight / 100));
};
