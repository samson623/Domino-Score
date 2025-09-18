import type { VercelRequest } from '@vercel/node';

const FALLBACK_SITE_URL = 'http://localhost:3000';

export function getSiteUrl(req: VercelRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    const normalized = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
    return normalized.replace(/\/$/, '');
  }

  const protoHeader = req.headers['x-forwarded-proto'] || req.headers['x-forwarded-protocol'];
  const hostHeader = req.headers['x-forwarded-host'] || req.headers['host'];

  const protocol = Array.isArray(protoHeader) ? protoHeader[0] : (protoHeader || '').split(',')[0];
  const host = Array.isArray(hostHeader) ? hostHeader[0] : (hostHeader || '').split(',')[0];

  if (protocol && host) {
    return `${protocol}://${host}`.replace(/\/$/, '');
  }

  if (host) {
    return `https://${host}`.replace(/\/$/, '');
  }

  return FALLBACK_SITE_URL;
}
