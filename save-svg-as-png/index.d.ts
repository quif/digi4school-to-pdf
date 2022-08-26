export interface SaveSvgAsPngOptions {
  backgroundColor: string;
  encoderOptions: number;
  encoderType: string;
  fonts: { text: string; url: string; format: string; }[];
  height: number;
  left: number;
  scale: number;
  width: number;
  top: number;
  excludeUnusedCss: boolean;
  excludeCss: boolean;
}

export function svgAsPngUri(element: SVGElement, options: Partial<SaveSvgAsPngOptions>, callback: (uri: string) => void): Promise<string>;
