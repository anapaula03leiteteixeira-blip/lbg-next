import cloudinary from '@/lib/cloudinary';

const TTL_SECONDS = 3_600; // 1 hora

/** Extrai o public_id de uma secure_url Cloudinary */
function extractPublicId(url: string): string {
  // https://res.cloudinary.com/CLOUD/image/upload/v123/path/to/file.ext
  const match = url.match(/\/upload\/(?:s--[^/]+--\/)?(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i);
  return match?.[1] ?? '';
}

/**
 * Gera URL assinada com expiração (1h por padrão).
 * Cloudinary rejeita a URL após o timestamp — acesso real controlado por CDN.
 * Retorna a URL original como fallback se não conseguir extrair o public_id.
 */
export function signCloudinaryUrl(secureUrl: string, ttlSeconds = TTL_SECONDS): string {
  const publicId = extractPublicId(secureUrl);
  if (!publicId) return secureUrl;

  try {
    return cloudinary.url(publicId, {
      sign_url:   true,
      expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
      secure:     true,
    });
  } catch {
    return secureUrl; // fallback: cloudinary não configurado ou erro de assinatura
  }
}
