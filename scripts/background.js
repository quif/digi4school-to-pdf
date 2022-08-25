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
let convertProgress = {
  title: '',
  from_page: -1,
  cur_page: -1,
  to_page: -1,
  page_count: -1,
  time_begin: 0
};

browser.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'update_tabid':
      convertingTab = message.tabid;
      break;
    case 'start_converting':
      converting = true;
      convertProgress = message.convert_progress;
      break;
    case 'stop_converting':
      converting = false;
      convertingTab = -1;
      break;
    case 'is_converting':
      return Promise.resolve({ converting, converting_tab: convertingTab });
    case 'get_progress':
      return Promise.resolve({ convert_progress: convertProgress });
    case 'update_progress':
      convertProgress = message.convert_progress;
      if (convertProgress.cur_page === convertProgress.to_page) {
        converting = false;
        convertingTab = -1;
      }
      break;
  }
});
