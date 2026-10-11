// Local build-time bridge only. No PSD parser or private metadata enters the app.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const website = path.resolve(__dirname, '..');
const recipePath = path.resolve(website, '../psd-extractor/output/normal-monster-bbd3410031c1f798-v1/template.json');
const template = JSON.parse(fs.readFileSync(recipePath, 'utf8'));
const source = path.resolve(path.dirname(recipePath), template.asset_root_relative_to_this_file);
const destination = path.join(website, 'public/card-creator/normal');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
// Reviewed hidden gold holo variant from the same raw extraction; no recoloring.
const goldSticker = 'layer-95b63bee4e0f02838c20a5f2';
template.catalog[goldSticker] = {bounds:[743,1114,785,1156],z:129,opacity:255,
  asset:{path:`assets/${goldSticker}.png`,sha256:'54fb0fbc1c23c5a7668a18ebd008f91e87d1756cd86bce74183c22ce3923177d'}};
const selected = [...template.fixed.map(x => x.layer_id), ...Object.values(template.attributes),
  ...template.level_layers, template.sticker_layer_id, goldSticker];
const catalog = {};
fs.mkdirSync(destination, { recursive: true });
for (const id of selected) {
  const item = template.catalog[id];
  const original = path.resolve(source, item.asset.path);
  if (!original.startsWith(source + path.sep)) throw new Error('Asset path escapes extraction');
  const bytes = fs.readFileSync(original);
  if (hash(bytes) !== item.asset.sha256) throw new Error('Asset checksum mismatch');
  const target = path.join(destination, `${id}.png`);
  if (fs.existsSync(target)) {
    if (hash(fs.readFileSync(target)) !== hash(bytes)) throw new Error('Refusing to overwrite changed asset');
  } else fs.writeFileSync(target, bytes, { flag: 'wx' });
  catalog[id] = { url: `/card-creator/normal/${id}.png`, bounds: item.bounds,
    z: item.z, opacity: item.opacity / 255, sha256: item.asset.sha256 };
}
const output = { id: template.id, sourceSha256: template.source_sha256,
  width: template.coordinate_space.width, height: template.coordinate_space.height,
  fixed: template.fixed, attributes: template.attributes, levels: template.level_layers,
  sticker: template.sticker_layer_id, goldSticker, artwork: template.artwork.bounds,
  fields: template.fields.map(f => ({ id: f.id, bounds: f.bounds, align: f.align,
    maxLength: f.max_length, default: f.default, pattern: f.pattern ?? null })), catalog };
const data = JSON.stringify(output, null, 2) + '\n';
const target = path.join(website, 'lib/card-creator/normal.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
if (fs.existsSync(target)) {
  if (!require('node:util').isDeepStrictEqual(JSON.parse(fs.readFileSync(target, 'utf8')),output)) throw new Error('Generated manifest differs; review before replacing');
} else fs.writeFileSync(target, data, { flag: 'wx' });
console.log(`Verified ${selected.length} graphics. No source artwork, dynamic text pixels or PSD copied.`);
