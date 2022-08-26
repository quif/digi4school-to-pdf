export class ModalUi {
  constructor(
    public readonly modal: HTMLDivElement,
    public readonly vectorInfo: HTMLParagraphElement,
    public readonly pngInfo: HTMLDivElement,
    public readonly saveMethodSelect: HTMLSelectElement,
    public readonly scaleLabel: HTMLSpanElement,
    public readonly scaleInput: HTMLInputElement,
    public readonly convertButton: HTMLButtonElement,
    public readonly fromPageInput: HTMLInputElement,
    public readonly toPageInput: HTMLInputElement,
    public readonly pageErrorElement: HTMLSpanElement,
    public readonly closeButton: HTMLButtonElement,
  ) { }

  public static create(modalId: string): ModalUi {
    const modal = document.querySelector(`div#${modalId}`);
    const vectorInfo = document.querySelector('p#vector-info');
    const pngInfo = document.querySelector('div#png-info');
    const saveMethodSelect = document.querySelector('select#save-method-select');
    const scaleLabel = document.querySelector('span#scale-display');
    const scaleInput = document.querySelector('input#scale');
    const convertButton = document.querySelector('button#button-convert');
    const fromPageInput = document.querySelector('input#from-page');
    const toPageInput = document.querySelector('input#to-page');
    const pageErrorElement = document.querySelector('span#page-error');
    const closeButton = document.querySelector('button#button-close');

    if (
      modal instanceof HTMLDivElement &&
      vectorInfo instanceof HTMLParagraphElement &&
      pngInfo instanceof HTMLDivElement &&
      saveMethodSelect instanceof HTMLSelectElement &&
      scaleLabel instanceof HTMLSpanElement &&
      scaleInput instanceof HTMLInputElement &&
      convertButton instanceof HTMLButtonElement &&
      fromPageInput instanceof HTMLInputElement &&
      toPageInput instanceof HTMLInputElement &&
      pageErrorElement instanceof HTMLSpanElement &&
      closeButton instanceof HTMLButtonElement
    ) {
      return new ModalUi(
        modal,
        vectorInfo,
        pngInfo,
        saveMethodSelect,
        scaleLabel,
        scaleInput,
        convertButton,
        fromPageInput,
        toPageInput,
        pageErrorElement,
        closeButton
      );
    }

    throw new ModalUiLoadingError();
  }
}

export class ModalUiLoadingError extends Error {
  public readonly type = ModalUiLoadingError;

  constructor() {
    super('Could not load modal UI elements');
  }
}
