import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const threeSrc = fs.readFileSync(path.join(root, 'vendor/three.module.js'), 'utf8');
// Strip the single trailing ES export block so three's classes live in the same
// module scope as the game code (no namespace objects, no extra requests).
const stripped = threeSrc.replace(/^export \{[\s\S]*?\};\s*$/m, '');
if (stripped === threeSrc) {
  console.error('build: export block not found in three.module.js');
  process.exit(1);
}
const files = fs.readdirSync(path.join(root, 'src'))
  .filter(f => f.endsWith('.js'))
  .sort();
const game = files.map(f => `\n/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
const tpl = fs.readFileSync(path.join(root, 'src/index.template.html'), 'utf8');
/* Generated material maps live in assets/tex and are inlined so index.html
   stays a single self-contained file. */
const texDir = path.join(root, 'assets/tex');
const tex = {};
if (fs.existsSync(texDir)) {
  for (const f of fs.readdirSync(texDir).filter(n => n.endsWith('.webp')).sort()) {
    tex[f.replace(/\.webp$/, '')] = 'data:image/webp;base64,' + fs.readFileSync(path.join(texDir, f)).toString('base64');
  }
}
/* ElevenLabs effects and voice lines are inlined the same way. */
const sfx = {};
for (const dir of ['assets/sfx', 'assets/voice']) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) continue;
  for (const f of fs.readdirSync(full).filter(n => n.endsWith('.mp3')).sort()) {
    sfx[f.replace(/\.mp3$/, '')] = 'data:audio/mpeg;base64,' + fs.readFileSync(path.join(full, f)).toString('base64');
  }
}
const assetJs = 'const GT_TEX = ' + JSON.stringify(tex) + ';\nconst GT_SFX = ' + JSON.stringify(sfx) + ';';
const out = tpl
  .replace('/*__ASSETS__*/', () => assetJs)
  .replace('/*__THREE__*/', () => stripped)
  .replace('/*__GAME__*/', () => game);
fs.writeFileSync(path.join(root, 'index.html'), out);
const lines = out.split('\n').length;
console.log('built index.html  ' + (out.length / 1024 / 1024).toFixed(2) + ' MB  ' + lines + ' lines');
console.log('three lines: ' + stripped.split('\n').length + ', game lines: ' + game.split('\n').length);
console.log('modules: ' + files.join(' '));
console.log('material maps: ' + Object.keys(tex).join(' '));
console.log('audio samples: ' + Object.keys(sfx).length + ' (' + Object.keys(sfx).join(' ') + ')');
