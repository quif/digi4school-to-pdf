import { xhrGet } from './xhrGet';

export async function getPageUrlFormatter(baseUrl: string, page: number): Promise<(page: number) => string> {
  try {
    await xhrGet(`${baseUrl}${page}/${page}.svg`);

    return (page) => `${baseUrl}${page}/${page}`;
  } catch {
    await xhrGet(`${baseUrl}${page}.svg`);

    return (page) => `${baseUrl}${page}`;
  }
}
