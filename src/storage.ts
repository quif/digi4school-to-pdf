import { addRuntimeListener } from './chrome';
import { ConversionProgress } from './models/conversionProgress';

export class Storage {
  private static isConverting = false;
  private static convertingTab = -1;
  private static conversionProgress: ConversionProgress = {
    title: '',
    fromPage: -1,
    toPage: -1,
    curPage: -1,
    pageCount: -1,
    timestampStart: 0
  };

  public static setup(): void {
    addRuntimeListener((msg) => this.handleMessage(msg));
  }

  private static handleMessage(message: any) {
    switch (message.type) {
      case 'update-tab-id':
        this.convertingTab = message.tabid;
        break;
      case 'start-conversion':
        this.isConverting = true;
        this.conversionProgress = message.conversionProgress;
        break;
      case 'stop-conversion':
        this.isConverting = false;
        this.convertingTab = -1;
        break;
      case 'is-converting':
        return { converting: this.isConverting, convertingTab: this.convertingTab };
      case 'get-progress':
        return { conversionProgress: this.conversionProgress };
      case 'update-progress':
        this.conversionProgress = message.conversionProgress;
        if (this.conversionProgress.curPage >= this.conversionProgress.toPage) {
          this.isConverting = false;
          this.convertingTab = -1;
        }
        break;
    }
  }
}
