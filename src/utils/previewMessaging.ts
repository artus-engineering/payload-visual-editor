/** Only a web origin can receive live document data. */
export function previewOrigin(previewUrl: string, baseUrl: string): string {
  const url = new URL(previewUrl, baseUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new TypeError("Preview URLs must use HTTP or HTTPS");
  }
  return url.origin;
}

export function sendPreviewDocument(
  target: Pick<Window, "postMessage"> | null,
  document: unknown,
  previewUrl: string,
  baseUrl: string,
): void {
  target?.postMessage(
    { cmsLivePreviewData: document },
    previewOrigin(previewUrl, baseUrl),
  );
}
