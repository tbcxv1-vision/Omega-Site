#!/usr/bin/env node
/**
 * Omega Incorporated — static site builder (zero dependencies).
 *
 *   node build.mjs          → builds ./public (upload its contents to the host)
 *
 * Templating used in src/pages and src/partials:
 *   {{> name}}              include src/partials/name.html (nested includes allowed)
 *   {{icon:Name}}           inline Lucide SVG icon from src/icons.json (decorative)
 *   {{icon:Name class}}     same, with extra CSS classes
 *   {{key}}                 value from src/config.json, or page front-matter
 *
 * Each page starts with a front-matter comment:
 *   <!--
 *   title: Page title
 *   description: Meta description
 *   page: services            (marks the active nav item)
 *   -->
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, 'src');
const out = path.join(root, 'public');

const config = JSON.parse(fs.readFileSync(path.join(src, 'config.json'), 'utf8'));
const icons = JSON.parse(fs.readFileSync(path.join(src, 'icons.json'), 'utf8'));
config.year = String(new Date().getFullYear());
config.phoneHref = config.phone.replace(/[^\d+]/g, '');

const partial = (name) => fs.readFileSync(path.join(src, 'partials', `${name}.html`), 'utf8');

function icon(name, cls = '') {
  const body = icons[name];
  if (!body) throw new Error(`Unknown icon: ${name}`);
  return `<svg class="icon${cls ? ' ' + cls : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

function render(tpl, vars, depth = 0) {
  if (depth > 10) throw new Error('Partial nesting too deep');
  tpl = tpl.replace(/\{\{>\s*([\w/-]+)\s*\}\}/g, (_, n) => render(partial(n), vars, depth + 1));
  tpl = tpl.replace(/\{\{icon:(\w+)(?:\s+([^}]+))?\}\}/g, (_, n, c) => icon(n, (c || '').trim()));
  tpl = tpl.replace(/\{\{([\w.]+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
  return tpl;
}

function frontMatter(html) {
  const m = html.match(/^<!--([\s\S]*?)-->\s*/);
  const meta = {};
  if (m) {
    for (const line of m[1].split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    html = html.slice(m[0].length);
  }
  return { meta, body: html };
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    e.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b);
  }
}

fs.rmSync(out, { recursive: true, force: true });
copyDir(path.join(src, 'assets'), path.join(out, 'assets'));
copyDir(path.join(src, 'static'), out);

const layout = partial('layout');
const pages = fs.readdirSync(path.join(src, 'pages')).filter((f) => f.endsWith('.html'));
const urls = [];

for (const file of pages) {
  const { meta, body } = frontMatter(fs.readFileSync(path.join(src, 'pages', file), 'utf8'));
  const slug = file === 'index.html' ? '' : file;
  const vars = {
    ...config,
    ...meta,
    content: '',
    canonical: `${config.siteUrl}/${slug}`,
    baseTag: meta.base ? `<base href="${meta.base}">` : '',
    page: meta.page || 'none',
    [`active_${meta.page || 'none'}`]: 'aria-current="page"',
  };
  // unset active flags render as empty strings
  for (const p of ['home', 'services', 'training', 'fellowship', 'about', 'contact']) {
    vars[`active_${p}`] ??= '';
  }
  vars.content = render(body, vars);
  let html = render(layout, vars);
  const leftover = html.match(/\{\{[^}]+\}\}/g);
  if (leftover) console.warn(`  ! ${file}: unresolved tokens ${[...new Set(leftover)].join(', ')}`);
  fs.writeFileSync(path.join(out, file), html);
  if (meta.noindex !== 'true') urls.push(vars.canonical);
  console.log(`  ✓ ${file}`);
}

fs.writeFileSync(
  path.join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`
);
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${config.siteUrl}/sitemap.xml\n`);
console.log(`\nBuilt ${pages.length} pages → public/`);
