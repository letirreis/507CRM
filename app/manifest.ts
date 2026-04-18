import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gravidade 507',
    short_name: 'G507',
    description: 'CRM Inteligente para Gestão de Vendas',
    start_url: '/boards',
    display: 'standalone',
    background_color: '#1a0f14',
    theme_color: '#e45fa6',
    icons: [
      // SVG icons keep the repo text-only. If you need iOS splash/touch icons later,
      // add PNGs in a follow-up.
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}

