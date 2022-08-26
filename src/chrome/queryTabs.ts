export function queryTabs(info: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
  return new Promise((resolve, reject) => {
    try {
      const r = chrome.tabs.query(info, resolve) as void | Promise<chrome.tabs.Tab[]>;
      if (r?.then) {
        return resolve(r);
      }
    } catch (e) {
      reject(e);
    }
  });
}
