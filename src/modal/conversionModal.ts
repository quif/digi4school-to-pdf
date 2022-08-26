import { executeScript } from '../chromeSupport';
import { modalHtml } from './modal.html';

export class ConversionModal {
  private static modalId?: string;

  public static async remove(tabId: number): Promise<void> {
    if (this.modalId === undefined) {
      return;
    }

    await executeScript(tabId, {
      code: `document.querySelector('div#${this.modalId}')?.remove();`
    });

    this.modalId = undefined;
  }

  public static async show(tabId: number): Promise<{ modalId: string; }> {
    await this.remove(tabId);

    const result = await executeScript(tabId, {
      code: `(() => {
        const div = document.createElement('div');
        div.id = 'd4s-conversion-modal';
        div.classList.add('modal', 'd4s2pdf-modal');

        div.innerHTML = \`${modalHtml}\`;

        document.body.prepend(div);

        return div.id;
      })();`
    });

    const id = result?.[0] ?? undefined;
    this.modalId = id;

    return { modalId: id ?? '@@@' };
  }
}
