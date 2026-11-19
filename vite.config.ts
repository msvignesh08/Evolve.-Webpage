import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

function injectSubresourceIntegrity(distDir: string) {
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) return;

  let html = fs.readFileSync(indexPath, 'utf8');

  const computeIntegrity = (assetHref: string): string | null => {
    const rel = assetHref.replace(/^\/+/, '');
    const filePath = path.join(distDir, rel);
    if (!filePath.startsWith(distDir) || !fs.existsSync(filePath)) return null;
    const hash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('base64');
    return `sha256-${hash}`;
  };

  html = html.replace(
    /<script([^>]*?)\ssrc="(\/assets\/[^"]+)"([^>]*)><\/script>/gi,
    (match, pre: string, src: string, post: string) => {
      if (/\bintegrity=/i.test(match)) return match;
      const integrity = computeIntegrity(src);
      if (!integrity) return match;
      const hasCors = /\bcrossorigin\b/i.test(match);
      return `<script${pre} src="${src}" integrity="${integrity}"${hasCors ? '' : ' crossorigin="anonymous"'}${post}></script>`;
    },
  );

  html = html.replace(
    /<link([^>]*?)\shref="(\/assets\/[^"]+\.(?:css|js))"([^>]*)>/gi,
    (match, pre: string, href: string, post: string) => {
      if (/\bintegrity=/i.test(match)) return match;
      const integrity = computeIntegrity(href);
      if (!integrity) return match;
      const hasCors = /\bcrossorigin\b/i.test(match);
      return `<link${pre} href="${href}" integrity="${integrity}"${hasCors ? '' : ' crossorigin="anonymous"'}${post}>`;
    },
  );

  fs.writeFileSync(indexPath, html, 'utf8');
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets-and-sri',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
          injectSubresourceIntegrity(distDir);
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      sourcemap: false,
      minify: true,
      chunkSizeWarningLimit: 500,
      assetsInlineLimit: 4096,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[hash].js',
          chunkFileNames: 'assets/[hash].js',
          assetFileNames: 'assets/[hash][extname]',
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'v1';
            }
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) {
              return 'v2';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'v3';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
