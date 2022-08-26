import { ConversionModal } from './modal/conversionModal';
import { PopUpUi } from './popupUi';
import { queryTabs, sendRuntimeMessage } from './chromeSupport';
import { detectDigi4School } from './digi4SchoolDetector';

export class PopUp {
  private constructor(private readonly ui: PopUpUi) { }

  public static async start(): Promise<void> {
    await new PopUp(PopUpUi.create()).start();
  }

  private async start(): Promise<void> {
    this.ui.progress.style.display = 'none';

    const tabId = await this.validateActiveTab();

    this.ui.convertBtn.onclick = async () => await this.openConversionModal(tabId);

    const msg = await sendRuntimeMessage({ type: 'is-converting' });
    if (msg?.converting) {
      this.onIsConverting(msg);
    } else {
      this.ui.currentBookText.style.display = 'initial';
      this.ui.convertingText.style.display = 'none';
      this.ui.progress.style.display = 'none';
      this.ui.convertBtn.innerText = 'Konvertieren';
    }
  }

  private disable(): void {
    this.ui.currentBook.innerText = 'Buch nicht geöffnet';
    this.ui.convertBtn.classList.add('disabled');
  }

  private async validateActiveTab(): Promise<number> {
    try {
      const tabs = await queryTabs({ currentWindow: true, active: true });

      if (tabs.length <= 0 || !/https:\/\/.*\/ebook\/.*/.test(tabs[0].url ?? '')) {
        this.disable();
        return -1;
      }

      const tabId = tabs[0].id ?? -1;
      const detectionResult = await detectDigi4School(tabId);

      if (detectionResult.detected) {
        this.ui.currentBook.innerText = detectionResult.title;
        return tabId;
      } else {
        this.disable();
      }
    } catch (e) {
      console.error(e);
      this.disable();
    }

    return -1;
  }

  private async updateProgressBar(): Promise<void> {
    const msg = await chrome.runtime.sendMessage({ type: 'get-progress' });
    const { curPage, fromPage, toPage, timestampStart } = msg.conversionProgress;

    this.ui.currentConverting.innerText = msg.conversionProgress.title;

    const pageCount = toPage - fromPage + 1;
    const currentPage = curPage - fromPage + 1;
    const remainingPages = toPage - curPage + 1;

    this.ui.currentPage.innerText = currentPage.toString();
    this.ui.numPages.innerText = pageCount.toString();

    const timeInS = (Date.now() - timestampStart) / 1000;
    const timePerPage = timeInS / currentPage;

    let remainingTime = Math.round(timePerPage * remainingPages);
    const hours = Math.floor(remainingTime / 3600);
    remainingTime -= hours * 3600;
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;

    this.ui.timerLbl.innerText = Number.isFinite(hours)
      ? `${hours}h ${minutes}m ${seconds}s`
      : 'Nicht berechenbar';

    this.ui.progressBar.style.width = (100 * currentPage) / pageCount + '%';
  }

  private async openConversionModal(tabId: number): Promise<void> {
    const modal = ConversionModal.show();

    await chrome.tabs.sendMessage(tabId, { type: 'run-inject', modalId: modal.id });
    await chrome.runtime.sendMessage({ type: 'update-tab-id', tabid: tabId });

    window.close();
  }

  private onIsConverting(msg: { convertingTab: number; }): void {
    this.ui.currentBookText.style.display = 'none';
    this.ui.convertingText.style.display = 'initial';
    this.ui.convertDetails.style.display = 'initial';
    this.ui.progress.style.display = 'initial';
    this.ui.convertBtn.innerText = 'Abbrechen';

    setInterval(async () => await this.updateProgressBar(), 250);

    this.ui.convertBtn.onclick = async () => {
      await chrome.tabs.sendMessage(msg.convertingTab, { type: 'cancel-conversion' });
      window.close();
    };
  }
}
