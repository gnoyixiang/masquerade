import { execFileSync } from 'node:child_process';
import { unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const archive = resolve(root, 'masquerade.zip');
try { unlinkSync(archive); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const files = [
  'manifest.json', 'background.js', 'ua-utils.js', 'presets.js', 'popup.html', 'popup.css', 'popup.js',
  'icons/masquerade-16.png', 'icons/masquerade-32.png', 'icons/masquerade-48.png', 'icons/masquerade-128.png'
];
execFileSync('zip', ['-q', archive, ...files], { cwd: root, stdio: 'inherit' });
console.log(`Created ${archive}`);
