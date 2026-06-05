import { v2 as cloudinary } from 'cloudinary';

// Configura cloudinary — só lança erro se chamado em contexto de upload (L2)
// Não lança em módulo-level para não quebrar rotas que apenas geram URLs assinadas
if (process.env.CLOUDINARY_CLOUD) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD,
    api_key:    process.env.CLOUDINARY_API_KEY ?? '',
    api_secret: process.env.CLOUDINARY_SECRET  ?? '',
    secure:     true,
  });
}

export function assertCloudinaryConfigured(): void {
  if (!process.env.CLOUDINARY_CLOUD || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_SECRET) {
    throw new Error('[cloudinary] Missing required env vars: CLOUDINARY_CLOUD, CLOUDINARY_API_KEY, CLOUDINARY_SECRET');
  }
}

export default cloudinary;
