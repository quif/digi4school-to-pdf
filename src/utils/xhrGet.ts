export function xhrGetGeneric(url: string, setupRequest: (xhr: XMLHttpRequest) => void): void {
  const xhr = new XMLHttpRequest();

  setupRequest(xhr);

  xhr.open('GET', url);
  xhr.send();
}

export function xhrGet<T = any>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    xhrGetGeneric(url, (xhr) => {
      xhr.onerror = reject;
      xhr.onreadystatechange = () => {
        if (xhr.readyState !== XMLHttpRequest.DONE) {
          return;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
        }

        if (xhr.status >= 300) {
          reject(xhr.statusText);
        }
      };
    });
  });
}
