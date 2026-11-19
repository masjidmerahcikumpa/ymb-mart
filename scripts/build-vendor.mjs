import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const vendorDir = path.join(rootDir, 'frontend', 'vendor');

async function downloadFile(url, dest) {
  console.log(`[Vendor Build] Downloading ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.statusText}`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(buffer));
  console.log(`[Vendor Build] Saved ${path.basename(dest)} (${buffer.byteLength} bytes).`);
}

async function bundleTailwind() {
  console.log('[Vendor Build] Compiling Tailwind CSS for dashboard.html...');
  const htmlPath = path.join(rootDir, 'frontend', 'dashboard.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const classRegex = /class(?:Name)?=["'`]([^"'`]+)["'`]/g;
  const candidates = new Set();
  let match;
  while ((match = classRegex.exec(html)) !== null) {
    const classNames = match[1].split(/\s+/);
    for (const c of classNames) {
      if (c && !c.includes('${')) {
        candidates.add(c.trim());
      }
    }
  }

  const extraTokens = [
    'bg-slate-50', 'min-h-screen', 'text-slate-800', 'bg-white', 'border-b', 'border-slate-200',
    'px-6', 'py-3', 'flex', 'justify-between', 'items-center', 'sticky', 'top-0', 'z-20', 'shadow-sm',
    'gap-3', 'gap-2', 'w-9', 'h-9', 'bg-[#8b1538]', 'border-[#d4af37]', 'rounded-lg', 'text-white',
    'font-extrabold', 'text-xs', 'text-base', 'font-bold', 'text-slate-900', 'leading-none',
    'text-[11px]', 'font-medium', 'text-[#d4af37]', 'mt-1', 'text-slate-300', 'mx-2', 'text-slate-500',
    'px-3', 'py-1.5', 'font-semibold', 'text-white', 'hover:bg-[#73112e]', 'transition',
    'bg-slate-100', 'hover:bg-slate-200', 'text-slate-700', 'bg-emerald-50', 'text-emerald-700',
    'hover:bg-emerald-100', 'max-w-7xl', 'mx-auto', 'p-4', 'space-y-4', 'grid', 'grid-cols-6',
    'grid-cols-4', 'grid-cols-3', 'grid-cols-2', 'col-span-2', 'rounded-xl', 'shadow', 'text-sm',
    'mb-2', 'space-y-1', 'max-h-[200px]', 'overflow-y-auto', 'border-l-4', 'text-[10px]',
    'text-xl', 'font-black', 'border-green-500', 'text-green-600', 'border-blue-500', 'text-blue-600',
    'border-purple-500', 'text-purple-600', 'border-red-500', 'text-red-600', 'border-yellow-500',
    'text-yellow-600', 'border-indigo-500', 'text-indigo-600', 'border-slate-300', 'text-slate-400',
    'text-slate-500', 'w-3', 'h-3', 'rounded', 'text-right', 'ml-1', 'font-mono', 'bg-green-50',
    'p-2', 'mb-1', 'text-orange-500', 'hover:opacity-90', 'text-2xl', 'text-white/70', 'p-3',
    'bg-blue-600', 'bg-slate-700', 'bg-emerald-600', 'bg-purple-600', 'border-t', 'border-gray-200'
  ];
  for (const t of extraTokens) candidates.add(t);

  const twPath = pathToFileURL(path.join(rootDir, 'frontend-app', 'node_modules', 'tailwindcss', 'dist', 'lib.mjs')).href;
  const { compile } = await import(twPath);
  const compiler = await compile('@import "tailwindcss";', {
    base: path.join(rootDir, 'frontend-app'),
    loadStylesheet: async (id, base) => {
      let targetPath;
      if (id === 'tailwindcss' || id === 'tailwindcss/index.css') {
        targetPath = path.join(rootDir, 'frontend-app', 'node_modules', 'tailwindcss', 'index.css');
      } else if (id.startsWith('tailwindcss/')) {
        targetPath = path.join(rootDir, 'frontend-app', 'node_modules', 'tailwindcss', id.replace('tailwindcss/', '') + '.css');
      } else {
        targetPath = path.resolve(base, id);
      }
      return {
        base: path.dirname(targetPath),
        content: fs.readFileSync(targetPath, 'utf8')
      };
    }
  });

  const css = compiler.build([...candidates]);
  const outPath = path.join(vendorDir, 'tailwind.dashboard.min.css');
  fs.writeFileSync(outPath, css);
  console.log(`[Vendor Build] Built ${path.basename(outPath)} (${css.length} bytes).`);
}

async function bundleSweetAlert2() {
  const swalSrc = path.join(rootDir, 'frontend-app', 'node_modules', 'sweetalert2', 'dist', 'sweetalert2.all.min.js');
  const swalDest = path.join(vendorDir, 'sweetalert2.all.min.js');
  if (fs.existsSync(swalSrc)) {
    console.log('[Vendor Build] Copying SweetAlert2 from local node_modules...');
    fs.copyFileSync(swalSrc, swalDest);
    console.log(`[Vendor Build] Copied ${path.basename(swalDest)} (${fs.statSync(swalDest).size} bytes).`);
  } else {
    await downloadFile('https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js', swalDest);
  }
}

async function bundleChartJS() {
  const chartDest = path.join(vendorDir, 'chart.umd.min.js');
  await downloadFile('https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js', chartDest);
}

async function main() {
  if (!fs.existsSync(vendorDir)) {
    fs.mkdirSync(vendorDir, { recursive: true });
  }

  await Promise.all([
    bundleTailwind(),
    bundleSweetAlert2(),
    bundleChartJS()
  ]);

  console.log('[Vendor Build] All vendor assets successfully bundled into frontend/vendor/');
}

main().catch(err => {
  console.error('[Vendor Build] Error:', err);
  process.exit(1);
});
