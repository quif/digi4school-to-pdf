import { modalHtml } from './modal.html';

export class ConversionModal {
  private static modal: HTMLDivElement | undefined;

  public static remove(): void {
    this.modal?.remove();
    this.modal = undefined;
  }

  public static show(): HTMLDivElement {
    this.remove();

    this.modal = document.createElement('div');
    this.modal.id = 'd4s-conversion-modal';
    this.modal.classList.add('modal', 'd4s2pdf-modal');

    this.modal.innerHTML = modalHtml;

    document.body.prepend(this.modal);

    return this.modal;
  }
}
