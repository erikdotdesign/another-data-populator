const parseDataExpression = (name) => {
  const match = name.match(/{{(.*?)}}/);
  if (!match) return null;

  const parts = match[1].split('|').map(p => p.trim());
  const key = parts[0];
  const filters = parts.slice(1).reduce((acc, part) => {
    const [filterName, ...args] = part.split(/\s+/);
    acc[filterName] = args.length
      ? args.map(arg => isNaN(arg) ? arg : Number(arg))
      : true;
    return acc;
  }, {});

  return { key, filters };
};

const resolveKeyPath = (data, key) => {
  try {
    if (typeof data === 'string') return data;
    return key
      .replace(/\[(\d+)\]/g, '.$1')
      .split('.')
      .reduce((obj, prop) => (obj ? obj[prop] : undefined), data);
  } catch {
    return undefined;
  }
};

const applyFiltersToValue = (value, filters) => {
  if (typeof value !== 'string') return value;

  if (filters.max) {
    value = value.slice(0, filters.max[0]);
  }
  if (filters.date) {
    const date = new Date(value);
    if (!isNaN(date)) {
      value = date.toLocaleDateString();
    }
  }
  return value;
};

const imageKitConvertToPng = (url) => {
  const path = encodeURIComponent(url);
  return `https://ik.imagekit.io/erikdotdesign/another-data-populator/tr:fo-auto,f-png/${path}`;
};

const fetchImageWithFallback = async (primaryUrl, fallbackUrl) => {
  try {
    const res = await fetch(primaryUrl);
    if (!res.ok) throw new Error('Primary image failed');
    return await res.arrayBuffer();
  } catch {
    try {
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) throw new Error('Fallback also failed');
      return await fallbackRes.arrayBuffer();
    } catch {
      return null;
    }
  }
};

const applyImageFill = async (node, buffer) => {
  const imageBytes = new Uint8Array(buffer);
  const image = figma.createImage(imageBytes);
  node.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: image.hash }];
};

// --- Population Functions ---

const populateTextNode = async (node, keyPath, data) => {
  const expr = parseDataExpression(`{{${keyPath}}}`);
  if (!expr) return;

  let value = typeof data === 'string' ? data : resolveKeyPath(data, expr.key);
  if (typeof value === 'string' || typeof value === 'number') {
    value = applyFiltersToValue(String(value), expr.filters);
    try {
      await figma.loadFontAsync(node.fontName);
      node.characters = value;
    } catch (err) {
      console.error('Font load error:', err);
    }
  }
};

const populateImageNode = async (node, key, data) => {
  let url = typeof data === 'string' ? data : resolveKeyPath(data, key);
  if (typeof url !== 'string') return;

  const isImageAsset = url.match(/\.(webp|png|jpe?g|gif|svg)(\?.*)?$/i);
  if (!isImageAsset) return;

  const isWebp = url.endsWith('.webp');
  if (isWebp) {
    url = imageKitConvertToPng(url);
  }

  const fallback = `https://dummyjson.com/image/${node.width.toFixed(0)}x${node.height.toFixed(0)}?type=png&fontFamily=ubuntu`;
  const buffer = await fetchImageWithFallback(url, fallback);
  if (buffer) await applyImageFill(node, buffer);
};

const populateInstanceProperties = (node, data) => {
  if ('componentProperties' in node && node.componentProperties) {
    const props = node.componentProperties;
    const updatedProps = {};
    for (const [propName, propValue] of Object.entries(props)) {
      if (typeof propValue.value === 'string') {
        const placeholders = propValue.value.match(/{{(.*?)}}/g);
        if (placeholders) {
          let newValue = propValue.value;
          for (const tag of placeholders) {
            const expr = parseDataExpression(tag);
            if (!expr) continue;
            let resolved = typeof data === 'string' ? data : resolveKeyPath(data, expr.key);
            if (resolved !== undefined) {
              resolved = applyFiltersToValue(String(resolved), expr.filters);
              newValue = newValue.replace(tag, resolved);
            }
          }
          updatedProps[propName] = newValue;
        }
      }
    }
    node.setProperties(updatedProps);
  }
};

const traverseAndPopulate = async (node, data) => {
  if ('locked' in node && node.locked) return;

  populateInstanceProperties(node, data);

  const match = node.name.match(/{{(.+?)}}/);
  const hasAssetFill = Array.isArray(node.fills) && node.fills.some(f => f.isAsset);

  if (match) {
    if (node.type === 'TEXT') {
      await populateTextNode(node, match[1], data);
    } else if ('fills' in node && node.fills) {
      await populateImageNode(node, match[1], data);
    }
  } else if (hasAssetFill && 'fills' in node) {
    await populateImageNode(node, node.name.replace(/[{}]/g, '').trim(), data);
  }

  if ('children' in node && node.name.match(/{{\w+(\s*\|.*)?}}/)) {
    await cloneAndPopulateGroup(node, data);
  }

  if ('children' in node) {
    for (const child of node.children) {
      await traverseAndPopulate(child, data);
    }
  }
};

const cloneAndPopulateGroup = async (group, parentData) => {
  const expr = parseDataExpression(group.name);
  if (!expr) return;

  let array = resolveKeyPath(parentData, expr.key);
  if (!Array.isArray(array)) return;

  if (expr.filters.skip) {
    array = array.slice(expr.filters.skip[0]);
  }
  if (expr.filters.limit) {
    array = array.slice(0, expr.filters.limit[0]);
  }

  const template = group.findOne(n => n.name === '{{template}}');
  if (!template) return;

  const count = array.length;

  for (let i = 0; i < count; i++) {
    if (i < count - 1) {
      const clone = template.clone();
      clone.name = template.name;
      clone.relativeTransform = template.relativeTransform;
      group.appendChild(clone);
      await traverseAndPopulate(clone, array[i]);
    } else {
      await traverseAndPopulate(template, array[i]);
    }
  }
};

// --- Main Plugin Entry ---

figma.showUI(__html__, { width: 400, height: 500 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'populate' && msg.data) {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.notify('Select at least one frame or group.');
      return;
    }

    const isArray = Array.isArray(msg.data);

    for (const node of selection) {
      if (isArray) {
        const keyMatch = node.name.match(/{{(\w+)\s*(\|.*?)?}}/);
        const key = keyMatch ? keyMatch[1] : 'items';
        const wrapper = {};
        wrapper[key] = msg.data;
        await traverseAndPopulate(node, wrapper);
      } else {
        await traverseAndPopulate(node, msg.data);
      }
    }

    figma.notify('Data populated.');
    figma.closePlugin();
  }
};