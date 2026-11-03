import { cp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, 'dist');
await mkdir(output, { recursive: true });
await cp(path.join(root, 'source-site'), output, { recursive: true });
await cp(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
await cp(path.join(root, 'src'), path.join(output, 'src'), { recursive: true });
// The blog query helper is server-side only, not a browser asset.


// Keep the original Nuxt/GSAP/Swiper/Lottie frontend intact. Only localize
// its public media URLs and add the isolated homepage character adaptation.
let count = 0;
async function localize(folder) {
  for (const item of await readdir(folder, { withFileTypes: true })) {
    const filename = path.join(folder, item.name);
    if (item.isDirectory()) { await localize(filename); continue; }
    if (!/\.(html|css|js|json)$/.test(item.name)) continue;
    let content = await readFile(filename, 'utf8');
    content = content.replaceAll('https://api.dontboardme.com', '/remote-api');
    content = content.replace(/href="\+18584492691"/g, 'href="tel:+18584492691"');
    // Original carousel callbacks may run after route teardown or on mobile,
    // where the offscreen desktop icon does not exist. Keep its animation but
    // skip that final DOM mutation when the corresponding node is absent.
    if (item.name === 'index.d67f6018.js') {
      content = content.replace(
        'c.set(h,{autoAlpha:1,position:"relative",rotate:-90*l.value}),i[0].innerHTML="",i[0].appendChild(h)',
        'h&&i[0]&&(c.set(h,{autoAlpha:1,position:"relative",rotate:-90*l.value}),i[0].innerHTML="",i[0].appendChild(h))'
      );
    }
    if (item.name.endsWith('.html')) {
      content = content.replace(/<head>/i, '<head><script src="/src/local-runtime.js"></script><link rel="stylesheet" href="/src/pug-motion.css"><script type="module" src="/src/pug-motion.js"></script>');
    }
    await writeFile(filename, content);
    count++;
  }
}
await localize(output);
console.log(`Built local website: ${output} (${count} localized documents)`);

const home = await readFile(path.join(output, 'index.html'), 'utf8');
const head = home.slice(0, home.indexOf('</head>') + 7);
const moduleTag = home.match(/<script type="module" src="\/_nuxt\/[^>]+><\/script>/)?.[0] || '';
const configTag = home.match(/<script>window\.__NUXT__[\s\S]*?<\/script>/)?.[0] || '';
for (const route of ['about-us','services']) {
 await mkdir(path.join(output,route),{recursive:true});
 await writeFile(path.join(output,route,'index.html'), `${head}<body><div id="__nuxt"></div>${configTag}${moduleTag}</body></html>`);
}
await writeFile(path.join(output,'.nojekyll'),'');
