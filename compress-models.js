// compress-models.js — Draco-сжатие через @gltf-transform + draco3d
// node compress-models.js

const fs   = require('fs');
const path = require('path');

async function main() {
  const { NodeIO }             = await import('@gltf-transform/core');
  const { draco }              = await import('@gltf-transform/functions');
  const { KHRDracoMeshCompression } = await import('@gltf-transform/extensions');

  const draco3d      = require('draco3d');
  const encoderModule = await draco3d.createEncoderModule();
  const decoderModule = await draco3d.createDecoderModule();

  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({
      'draco3d.encoder': encoderModule,
      'draco3d.decoder': decoderModule,
    });

  const CATALOG = path.join(__dirname, 'Catalog');

  function findModels(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) results.push(...findModels(full));
      else if (entry.name === 'model.glb') results.push(full);
    }
    return results;
  }

  const models = findModels(CATALOG);
  console.log(`Найдено: ${models.length} моделей\n`);

  let ok = 0, skip = 0, fail = 0;

  for (const src of models) {
    const label      = path.relative(__dirname, src).padEnd(55);
    const sizeBefore = (fs.statSync(src).size / 1024).toFixed(0);
    try {
      const doc = await io.read(src);
      await doc.transform(
        draco({ compressionLevel: 7 })
      );
      const out = await io.writeBinary(doc);
      const sizeAfter = (out.byteLength / 1024).toFixed(0);

      if (parseInt(sizeAfter) < parseInt(sizeBefore)) {
        fs.writeFileSync(src, Buffer.from(out));
        const pct = Math.round((1 - sizeAfter / sizeBefore) * 100);
        console.log(`✓  ${label} ${sizeBefore}KB → ${sizeAfter}KB  (-${pct}%)`);
        ok++;
      } else {
        console.log(`–  ${label} уже оптимизирован (${sizeBefore}KB)`);
        skip++;
      }
    } catch(e) {
      console.error(`✗  ${label} ОШИБКА: ${e.message?.split('\n')[0]}`);
      fail++;
    }
  }

  console.log(`\nГотово: ✓${ok} сжато  –${skip} пропущено  ✗${fail} ошибок`);
}

main().catch(console.error);
