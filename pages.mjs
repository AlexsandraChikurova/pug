import {readFile,writeFile,readdir} from 'node:fs/promises';
import './build.mjs';
const repo=process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const base=repo && !repo.endsWith('.github.io') ? '/'+repo : '';
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){
const f=dir+'/'+e.name;if(e.isDirectory()){await walk(f);continue;}
if(!/\.(html|css|json|js|mjs)$/.test(f))continue;
let s=await readFile(f,'utf8');
if(f.endsWith('.html')){s=s.replace(/((?:src|href)=")\/(?!\/)/g,'$1'+base+'/').replace('baseURL:"/"','baseURL:"'+base+'/"');}
if(f.endsWith('.json') || f.endsWith('.html'))s=s.replaceAll('"/remote-api/','"'+base+'/remote-api/');
if(f.endsWith('.js')) for(const asset of ['/Dog.json','/Balls.json']) s=s.replaceAll(JSON.stringify(asset),JSON.stringify(base+asset));
if(f.endsWith('.css') || f.endsWith('.html'))s=s.replace(/url\((["']?)\/(?!\/)/g,(_,quote)=>'url('+quote+base+'/');
if(f.endsWith('/pug-motion.js')){
s=s.replace("'/assets/hero-pug.png'",JSON.stringify(base+'/assets/hero-pug.png'));
s=s.replace("window.location.pathname.replace(/\\/+$/, '') === ''", "window.location.pathname.replace(/\\/+$/, '') === "+JSON.stringify(base));
}
if(f.endsWith('/local-runtime.js')){
s='const SITE_BASE='+JSON.stringify(base)+';\n'+s;
s=s.replace("const method =", "if(SITE_BASE && url.pathname.startsWith(SITE_BASE+'/')) url.pathname=url.pathname.slice(SITE_BASE.length); const method =");
s=s.replace("nativeFetch(url.pathname + '.json')","nativeFetch(SITE_BASE + url.pathname + '.json')");
s=s.replace('return nativeFetch(input, options);',"if(SITE_BASE && url.origin===location.origin && !url.pathname.startsWith(SITE_BASE+'/')) return nativeFetch(SITE_BASE+url.pathname+url.search,options); return nativeFetch(input,options);");
}
await writeFile(f,s);
}}
await walk('dist');


