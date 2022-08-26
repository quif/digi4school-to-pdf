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
