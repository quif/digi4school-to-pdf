export class PopUpUi {
  constructor(
    public readonly convertBtn: HTMLAnchorElement,
    public readonly progress: HTMLDivElement,
    public readonly progressBar: HTMLDivElement,
    public readonly currentBookText: HTMLParagraphElement,
    public readonly convertingText: HTMLParagraphElement,
    public readonly convertDetails: HTMLDivElement,
    public readonly currentBook: HTMLSpanElement,
    public readonly currentConverting: HTMLSpanElement,
    public readonly currentPage: HTMLSpanElement,
    public readonly numPages: HTMLSpanElement,
    public readonly timerLbl: HTMLSpanElement
  ) { }

  public static create(): PopUpUi {
    const convertBtn = document.querySelector('a#convert-btn');
    const progress = document.querySelector('div#progress');
    const progressBar = document.querySelector('div#progress-bar');
    const currentBookText = document.querySelector('p#cur-book-text');
    const convertingText = document.querySelector('p#converting-text');
    const convertDetails = document.querySelector('div#convert-details');
    const currentBook = document.querySelector('span#cur-book');
    const currentConverting = document.querySelector('span#cur-converting');
    const currentPage = document.querySelector('span#cur-page');
    const numPages = document.querySelector('span#num-pages');
    const timerLbl = document.querySelector('span#timer');

    if (convertBtn instanceof HTMLAnchorElement &&
      progress instanceof HTMLDivElement &&
      progressBar instanceof HTMLDivElement &&
      currentBookText instanceof HTMLParagraphElement &&
      convertingText instanceof HTMLParagraphElement &&
      convertDetails instanceof HTMLDivElement &&
      currentBook instanceof HTMLSpanElement &&
      currentConverting instanceof HTMLSpanElement &&
      currentPage instanceof HTMLSpanElement &&
      numPages instanceof HTMLSpanElement &&
      timerLbl instanceof HTMLSpanElement
    ) {
      return new PopUpUi(
        convertBtn,
        progress,
        progressBar,
        currentBookText,
        convertingText,
        convertDetails,
        currentBook,
        currentConverting,
        currentPage,
        numPages,
        timerLbl
      );
    }

    throw new PopUpUiLoadingError();
  }
}

export class PopUpUiLoadingError extends Error {
  public readonly type = PopUpUiLoadingError;

  constructor() {
    super('Could not load pop up UI elements');
  }
}
