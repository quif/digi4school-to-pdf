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
