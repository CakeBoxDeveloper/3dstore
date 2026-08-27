// api/catalog.js — Vercel Serverless Function
// Автоматически сканирует Catalog/<Category>/<Product>/
// Мета-данные товара читаются из info.json в папке товара

const fs   = require('fs');
const path = require('path');

const CATEGORY_META = {
  plastic: { name: '3D Печать',        order: 0 },
  wax:     { name: 'Свічки',           order: 1 },
  epoxy:   { name: 'Епоксидна смола',  order: 2 },
};

const PREVIEW_EXTS = ['.webp', '.png', '.jpg', '.jpeg'];

module.exports = function handler(req, res) {
  try {
    const catalogDir = path.join(process.cwd(), 'Catalog');
    if (!fs.existsSync(catalogDir)) {
      return res.status(200).json({ categories: [] });
    }

    const categories = [];

    for (const catEntry of fs.readdirSync(catalogDir, { withFileTypes: true })) {
      if (!catEntry.isDirectory() || catEntry.name === '__MACOSX') continue;

      const catId   = catEntry.name.toLowerCase();
      const catPath = path.join(catalogDir, catEntry.name);
      const meta    = CATEGORY_META[catId] || { name: catEntry.name, order: 99 };

      const products = [];

      for (const prodEntry of fs.readdirSync(catPath, { withFileTypes: true })) {
        if (!prodEntry.isDirectory()) continue;

        const prodId   = prodEntry.name;
        const prodPath = path.join(catPath, prodEntry.name);
        const files    = fs.readdirSync(prodPath);

        // info.json — все мета-данные товара
        let info = {};
        const infoPath = path.join(prodPath, 'info.json');
        if (fs.existsSync(infoPath)) {
          try { info = JSON.parse(fs.readFileSync(infoPath, 'utf8')); }
          catch (e) { console.error(`Bad info.json: ${infoPath}`, e); }
        }

        // Модель — обязательна, иначе пропускаем товар
        const modelFile = files.find(f => /\.(glb|gltf)$/i.test(f));
        if (!modelFile) continue;
        const model = `Catalog/${catEntry.name}/${prodEntry.name}/${modelFile}`;

        // Превью — ищем в папке товара, потом в thumbnails/
        let thumbnail = null;
        for (const ext of PREVIEW_EXTS) {
          if (files.includes(`preview${ext}`)) {
            thumbnail = `Catalog/${catEntry.name}/${prodEntry.name}/preview${ext}`;
            break;
          }
        }
        if (!thumbnail) {
          const thumbDir = path.join(process.cwd(), 'thumbnails');
          if (fs.existsSync(thumbDir)) {
            for (const ext of PREVIEW_EXTS) {
              if (fs.existsSync(path.join(thumbDir, `${prodId}${ext}`))) {
                thumbnail = `thumbnails/${prodId}${ext}`;
                break;
              }
            }
          }
        }

        products.push({
          id:           prodId,
          name:         info.name         || prodId,
          price:        info.price        || 0,
          sizes:        info.sizes        || '',
          description:  info.description  || '',
          colors:       info.colors       || null,
          accentColors: info.accentColors || null,
          model,
          thumbnail,
        });
      }

      categories.push({ id: catId, name: meta.name, products, _order: meta.order });
    }

    categories.sort((a, b) => a._order - b._order);
    categories.forEach(c => delete c._order);

    // Добавляем пустые категории если их нет в папках (без дублирования)
    for (const [id, meta] of Object.entries(CATEGORY_META)) {
      if (!categories.find(c => c.id === id)) {
        const insertAt = Math.min(meta.order, categories.length);
        categories.splice(insertAt, 0, { id, name: meta.name, products: [] });
      }
    }

    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
    return res.status(200).json({ categories });

  } catch (err) {
    console.error('Catalog scan error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};
