/**
 * タイトルクリーンアップユーティリティ
 * スクレイピングタイトル等のノイズ・宣伝文句・タグ・品番を除去
 */
export class TitleCleaner {
  public static clean(title: string, productId?: string): string {
    if (!title) return '';
    let cleaned = title;
    cleaned = cleaned.replace(/[\r\n\t]/g, ' ').replace(/　/g, ' ');

    const unwantedPatterns = [
      /\s*[|#-]\s*(?:MissAV|オンラインで無料|無料|High Quality|Subbed|日本語字幕|AV女優一覧|AV女優|無料動画|高画質|オンライン視聴).*$/gi,
      /- MissAV\.ai/gi,
      /\| MissAV\.ai/gi,
      /- MissAV/gi,
      /\| MissAV/gi,
      /無料動画/g,
      /高画質/g,
      /オンライン視聴/g,
      /日本語字幕/g,
      /AV女優一覧/g,
      /無料/g,
      /オンラインで無料/g,
      /High Quality/gi,
      /Subbed/gi,
    ];
    for (const pat of unwantedPatterns) {
      cleaned = cleaned.replace(pat, '');
    }

    if (productId && productId.trim() !== '') {
      const id = productId.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const idNoHyphen = productId.trim().replace(/-/g, '').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const reId = new RegExp(`(?<![A-Za-z0-9])${id}(?![A-Za-z0-9])`, 'gi');
      const reIdNoHyphen = new RegExp(`(?<![A-Za-z0-9])${idNoHyphen}(?![A-Za-z0-9])`, 'gi');
      cleaned = cleaned.replace(reId, '').replace(reIdNoHyphen, '');
    }

    cleaned = cleaned.replace(/(?:【|\[|\()(?:無修正|高画質|字幕|4K|フルHD|先行配信|独占|VR|ハイレゾ|無料|プレビュー|サンプル|配信|日本語字幕|画質|HD|SD|HQ|SUB)(?:】|\]|\))/gi, '');
    cleaned = cleaned.replace(/【[^】]*】/g, '');
    cleaned = cleaned.replace(/\[[^\]]*\]/g, '');
    cleaned = cleaned.replace(/［[^］]*］/g, '');
    cleaned = cleaned.replace(/\(\s*\)/g, '').replace(/（\s*）/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ').replace(/^[\s\-_|+#/\\]+|[\s\-_|+#/\\]+$/g, '');

    return cleaned.trim();
  }
}
