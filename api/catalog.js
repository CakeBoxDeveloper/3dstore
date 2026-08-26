// api/catalog.js — Vercel Serverless Function (CommonJS)
// Динамически сканирует папки Catalog/<Category>/<Product>/ и возвращает структуру каталога

const fs = require('fs');
const path = require('path');

const CATEGORY_NAMES = {
  'plastic': 'Пластик',
  'wax': 'Воск',
  'epoxy': 'Эпоксидка'
};

const PREVIEW_EXTENSIONS = ['.webp', '.png', '.jpg', '.jpeg'];

module.exports = function handler(req, res) {
  try {
    const catalogDir = path.join(process.cwd(), 'Catalog');

    if (!fs.existsSync(catalogDir)) {
      return res.status(200).json({ categories: [] });
    }

    const categories = [];
    const catEntries = fs.readdirSync(catalogDir, { withFileTypes: true });

    for (const catEntry of catEntries) {
      if (!catEntry.isDirectory()) continue;
      if (catEntry.name === '__MACOSX') continue; // игнорировать мусор macOS

      const catId = catEntry.name.toLowerCase();
      const catPath = path.join(catalogDir, catEntry.name);
      const catDisplayName = CATEGORY_NAMES[catId] || catEntry.name;

      const products = [];
      const prodEntries = fs.readdirSync(catPath, { withFileTypes: true });

      for (const prodEntry of prodEntries) {
        if (!prodEntry.isDirectory()) continue;

        const prodId = prodEntry.name;
        const prodPath = path.join(catPath, prodEntry.name);
        const filesInDir = fs.readdirSync(prodPath);

        // Читаем info.json
        const infoPath = path.join(prodPath, 'info.json');
        let info = {};
        if (fs.existsSync(infoPath)) {
          try {
            info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
          } catch (e) {
            console.error(`Ошибка парсинга ${infoPath}:`, e);
          }
        }

        // Ищем модель (.glb / .gltf)
        let modelRelPath = null;
        const modelFile = filesInDir.find(f => f === 'model.glb' || f === 'model.gltf' || f.endsWith('.glb') || f.endsWith('.gltf'));
        if (modelFile) {
          modelRelPath = `Catalog/${catEntry.name}/${prodEntry.name}/${modelFile}`;
        }

        // Если нет модели — пропускаем (нет смысла показывать пустой товар)
        if (!modelRelPath) continue;

        // Ищем превью в папке товара
        let thumbRelPath = null;
        for (const ext of PREVIEW_EXTENSIONS) {
          if (filesInDir.includes(`preview${ext}`)) {
            thumbRelPath = `Catalog/${catEntry.name}/${prodEntry.name}/preview${ext}`;
            break;
          }
        }

        // Если не найдено в папке товара — проверяем thumbnails/
        if (!thumbRelPath) {
          const thumbnailsDir = path.join(process.cwd(), 'thumbnails');
          if (fs.existsSync(thumbnailsDir)) {
            const thumbFiles = fs.readdirSync(thumbnailsDir);
            for (const ext of PREVIEW_EXTENSIONS) {
              if (thumbFiles.includes(`${prodId}${ext}`)) {
                thumbRelPath = `thumbnails/${prodId}${ext}`;
                break;
              }
            }
          }
        }

        products.push({
          id: prodId,
          name: info.name || prodId,
          price: info.price || 0,
          sizes: info.sizes || '',
          description: info.description || '',
          colors: info.colors || null,
          model: modelRelPath,
          thumbnail: thumbRelPath
        });
      }

      categories.push({
        id: catId,
        name: catDisplayName,
        products: products
      });
    }

    // Сортировка: Plastic, Wax, Epoxy
    const order = ['plastic', 'wax', 'epoxy'];
    categories.sort((a, b) => {
      const idxA = order.indexOf(a.id);
      const idxB = order.indexOf(b.id);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ categories });

  } catch (err) {
    console.error('Ошибка сборки каталога:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};
