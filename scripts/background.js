function isValidPage(url) {
  return url.match(/https:\/\/.*\/ebook\/.*/);
}

function updateIcon() {
  browser.tabs.query({ currentWindow: true, active: true }).then((tabs) => {
    let tab = tabs[0]; // Safe to assume there will only be one result

    let path = '../assets/icon-64-disabled.png';
    if (isValidPage(tab.url)) {
      path = '../assets/icon-64.png';
    }

    browser.browserAction.setIcon({ path });
  }, console.error);
}

browser.tabs.onActivated.addListener(updateIcon);
browser.tabs.onUpdated.addListener(updateIcon);
browser.windows.onFocusChanged.addListener(updateIcon);

let converting = false;
let convertingTab = -1;
let conversionProgress = {
  title: '',
  fromPage: -1,
  toPage: -1,
  curPage: -1,
  pageCount: -1,
  timestampStart: 0
};

browser.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'update-tab-id':
      convertingTab = message.tabid;
      break;
    case 'start-conversion':
      converting = true;
      conversionProgress = message.conversionProgress;
      break;
    case 'stop-conversion':
      converting = false;
      convertingTab = -1;
      break;
    case 'is-converting':
      return Promise.resolve({ converting, converting_tab: convertingTab });
    case 'get-progress':
      return Promise.resolve({ conversionProgress });
    case 'update-progress':
      conversionProgress = message.conversionProgress;
      if (conversionProgress.curPage === conversionProgress.toPage) {
        converting = false;
        convertingTab = -1;
      }
      break;
  }
});
