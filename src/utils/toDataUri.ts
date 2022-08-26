import { xhrGetGeneric } from './xhrGet';

export function toDataUri(url: string): Promise<{ uri: string; url: string; }> {
  return new Promise((resolve, reject) => {
    xhrGetGeneric(url, (xhr) => {
      xhr.responseType = 'blob';

      xhr.onerror = reject;
      xhr.onload = function () {
        const reader = new FileReader();

        reader.onerror = reject;
        reader.onloadend = () => {
          resolve({
            uri: typeof reader.result === 'string' ? reader.result : '',
            url
          });
        };

        reader.readAsDataURL(xhr.response);
      };
    });
  });
}
