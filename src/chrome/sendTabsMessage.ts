export function sendTabsMessage<T = any>(tabId: number, message: any): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const r = chrome.tabs.sendMessage(tabId, message, resolve) as void | Promise<T>;
      if (r?.then) {
        return resolve(r);
      }
    } catch (e) {
      reject(e);
    }
  });
}
