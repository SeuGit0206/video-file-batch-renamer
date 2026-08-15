import { Readable } from 'stream';
import type { Response } from 'express';

export interface IStreamOptimizer {
  pipeJsonArrayAsStream<T>(res: Response, items: T[], chunkSize?: number): void;
  createChunkedStream<T>(items: T[], chunkSize?: number): Readable;
}

export class StreamOptimizer implements IStreamOptimizer {
  /**
   * 配列データを Chunked Transfer Encoding でストリーミング出力
   */
  public pipeJsonArrayAsStream<T>(res: Response, items: T[], chunkSize: number = 50): void {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const stream = this.createChunkedStream(items, chunkSize);
    stream.pipe(res);
  }

  public createChunkedStream<T>(items: T[], chunkSize: number = 50): Readable {
    let index = 0;
    const total = items.length;

    return new Readable({
      objectMode: false,
      read() {
        if (index === 0 && total === 0) {
          this.push('[]');
          this.push(null);
          return;
        }

        if (index === 0) {
          this.push('[');
        }

        if (index >= total) {
          this.push(']');
          this.push(null); // EOF
          return;
        }

        const end = Math.min(index + chunkSize, total);
        const chunkItems = items.slice(index, end);
        const isFirstChunk = index === 0;
        index = end;

        const jsonParts = chunkItems.map((item) => JSON.stringify(item));
        let chunkString = jsonParts.join(',');

        if (!isFirstChunk) {
          chunkString = ',' + chunkString;
        }

        this.push(chunkString);
      },
    });
  }
}
