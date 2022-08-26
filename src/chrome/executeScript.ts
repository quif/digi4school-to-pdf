export function executeScript(tabId: number, details: chrome.tabs.InjectDetails): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      const r = chrome.tabs.executeScript(tabId, details, resolve) as void | Promise<any[]>;
      if (r?.then) {
        return resolve(r);
      }
    } catch (e) {
      reject(e);
    }
  });
}
