import { v2 as cloudinary } from 'cloudinary';

// L2 — validate + configure uma única vez (importado por qualquer rota que use cloudinary)
const required = { CLOUDINARY_CLOUD: process.env.CLOUDINARY_CLOUD, CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY, CLOUDINARY_SECRET: process.env.CLOUDINARY_SECRET };
for (const [key, val] of Object.entries(required)) {
  if (!val) throw new Error(`[cloudinary] Missing required env var: ${key}`);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_SECRET!,
  secure:     true,
});

export default cloudinary;
