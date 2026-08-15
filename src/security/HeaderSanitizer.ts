export interface IHeaderSanitizer {
  sanitizeHeaderValue(value: string): string;
  sanitizeHeaders(headers: Record<string, string>): Record<string, string>;
}

export class HeaderSanitizer implements IHeaderSanitizer {
  public sanitizeHeaderValue(value: string): string {
    if (typeof value !== 'string') {
      return '';
    }
    // CRLF インジェクション (\r, \n) や ヌルバイト (\0) の除去
    return value.replace(/[\r\n\0]/g, '').trim();
  }

  public sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const cleanHeaders: Record<string, string> = {};
    for (const [key, val] of Object.entries(headers)) {
      const cleanKey = this.sanitizeHeaderValue(key);
      const cleanVal = this.sanitizeHeaderValue(val);
      if (cleanKey) {
        cleanHeaders[cleanKey] = cleanVal;
      }
    }
    return cleanHeaders;
  }
}
