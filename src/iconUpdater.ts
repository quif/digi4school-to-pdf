import { queryTabs } from './chromeSupport';

export class IconUpdater {
  public static setup(): void {
    chrome.tabs.onActivated.addListener(IconUpdater.updateIcon);
    chrome.tabs.onUpdated.addListener(IconUpdater.updateIcon);
    chrome.windows.onFocusChanged.addListener(IconUpdater.updateIcon);
  }

  private static async updateIcon(): Promise<void> {
    const tabs = await queryTabs({ currentWindow: true, active: true });

    const tab = tabs[0];

    const path = IconUpdater.isValidPage(tab.url)
      ? 'assets/icon-64.png'
      : 'assets/icon-64-disabled.png';

    chrome.browserAction.setIcon({ path });
  }

  private static isValidPage(url?: string): boolean {
    return url !== undefined && /https:\/\/.*\/ebook\/.*/.test(url);
  }
}
