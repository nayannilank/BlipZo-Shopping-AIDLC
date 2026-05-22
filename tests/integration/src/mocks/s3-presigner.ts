/**
 * Mock for @aws-sdk/s3-request-presigner.
 * Returns a fake pre-signed URL for testing.
 */
export async function getSignedUrl(
  _client: unknown,
  _command: unknown,
  _options?: unknown,
): Promise<string> {
  return `https://blipzo-test-product-images.s3.amazonaws.com/mock-presigned-url-${Date.now()}`;
}
