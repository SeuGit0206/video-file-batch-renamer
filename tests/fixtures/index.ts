import type { ScrapedMetadata, DocumentInfo } from '../../src/types';
import type { Cookie } from 'playwright';

export const mockScrapedMetadata: ScrapedMetadata = {
  productId: 'ABC-123',
  title: 'サンプルタイトル ABC-123',
  actress: '山田花子',
  releaseDate: '2026-01-01',
  series: 'MissAV',
  debug: {
    finalUrl: 'https://missav.ai/ja/abc-123',
    pageTitle: 'サンプルタイトル ABC-123 - MissAV',
    htmlLength: 1500,
    htmlPreview: '<html><head><title>サンプル</title></head><body>...</body></html>',
    bodyPreview: 'サンプル本文テキスト',
    titleTag: '<title>サンプルタイトル ABC-123 - MissAV</title>',
    matchedSelectors: ['h1', 'video'],
    unmatchedSelectors: [],
    selectorResults: {
      h1: { found: true, value: 'サンプルタイトル ABC-123' }
    },
    ldJsonCount: 1,
    hasNextData: true,
    hasLdJson: true,
    hasVideo: true,
    status: 200,
    cloudflareReasons: [],
    searchFlowLogs: ['SearchFlow skipped']
  }
};

export const mockDocInfo: DocumentInfo = {
  title: 'サンプルタイトル ABC-123',
  h1: 'サンプルタイトル ABC-123',
  titleDom: 'サンプルタイトル ABC-123',
  canonical: 'https://missav.ai/ja/abc-123',
  description: 'サンプルメタディスクリプション',
  actresses: '山田花子',
  maker: 'サンプルメーカー'
};

export const mockSampleHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <title>サンプルタイトル ABC-123 - MissAV</title>
  <link rel="canonical" href="https://missav.ai/ja/abc-123" />
  <script type="application/ld+json">
    {
      "@type": "VideoObject",
      "name": "サンプルタイトル ABC-123",
      "actor": [{ "@type": "Person", "name": "山田花子" }]
    }
  </script>
</head>
<body>
  <h1>サンプルタイトル ABC-123</h1>
  <video src="https://example.com/video.mp4"></video>
  <div class="actor">
    <a href="https://missav.ai/ja/actresses/yamada-hanako">山田花子</a>
  </div>
</body>
</html>
`;

export const mockCookies: Cookie[] = [
  {
    name: 'cf_clearance',
    value: 'mock_cf_clearance_token',
    domain: '.missav.ai',
    path: '/',
    expires: 1770000000,
    httpOnly: true,
    secure: true,
    sameSite: 'None'
  }
];

export const mockNotFoundMetadata: ScrapedMetadata = {
  productId: 'XYZ-999',
  status: 'NotFound',
  error: 'MissAVに作品が存在しません',
  debug: {
    finalUrl: 'https://missav.ai/ja/xyz-999',
    pageTitle: 'Not Found',
    htmlLength: 0,
    htmlPreview: '',
    bodyPreview: '',
    titleTag: '<title>Not Found</title>',
    matchedSelectors: [],
    unmatchedSelectors: ['h1'],
    selectorResults: {},
    ldJsonCount: 0,
    hasNextData: false,
    hasLdJson: false,
    hasVideo: false,
    status: 404,
    cloudflareReasons: [],
    searchFlowLogs: ['Returning NotFound']
  }
};
