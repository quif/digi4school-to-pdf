export interface GenerationOptions {
  title: string;
  scale: number;
  fromPage: number;
  toPage: number;
  savemethod: 'png' | 'vector';
  pageCount: number;
}
