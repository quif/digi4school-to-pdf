export function sendRuntimeMessage<T = any>(message: any): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const r = chrome.runtime.sendMessage(message, resolve) as void | Promise<T>;
      if (r?.then) {
        return resolve(r);
      }
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      }
    } catch (e) {
      reject(e);
    }
  });
}

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

export function addRuntimeListener<T = any>(handle: (result: T) => any | Promise<any>): void {
  async function runHandle(message: T, respond: (response: any) => void): Promise<void> {
    const result = await Promise.resolve(handle(message));
    respond(result);
  }

  chrome.runtime.onMessage.addListener((message, _, respond) => {
    runHandle(message, respond);
    return true;
  });
}

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
