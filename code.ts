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

const applyFiltersToValue = (value, filters, data) => {
  if (typeof value !== 'string') return value;

  if (filters.max) {
    const arg = filters.max[0];
    const limit = typeof arg === 'string' ? resolveKeyPath(data, arg) : arg;
    if (typeof limit === 'number') {
      value = value.slice(0, limit);
    }
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

const populateTextNode = async (node, keyPath, data) => {
  const expr = parseDataExpression(`{{${keyPath}}}`);
  if (!expr) return;

  let value = typeof data === 'string' ? data : resolveKeyPath(data, expr.key);
  if (typeof value === 'string' || typeof value === 'number') {
    value = applyFiltersToValue(String(value), expr.filters, data);
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

const parseVariantDirectives = (name) => {
  const matches = [...name.matchAll(/#variant\[(.+?)\]/g)];
  if (!matches.length) return [];

  const directives = [];

  for (const match of matches) {
    const content = match[1];
    const [rawCondition, rawSetter] = content.split(',').map(s => s.trim());

    const operators = ['==', '!=', '>=', '<=', '>', '<', 'in', 'not in'];
    const operatorMatch = operators.find(op => rawCondition.includes(op));
    if (!operatorMatch) continue;

    const parts = rawCondition.split(operatorMatch).map(p => p.trim());
    const keyPathMatch = parts[0].match(/{{(.+?)}}/);
    if (!keyPathMatch) continue;

    const keyPath = keyPathMatch[1];
    const expectedRaw = parts[1];
    const [propName, propValue] = rawSetter.split('=').map(s => s.trim());

    directives.push({
      keyPath,
      operator: operatorMatch,
      expectedValue: parseJSONValue(expectedRaw),
      propName,
      propValue,
    });
  }

  return directives;
}

const evaluateVariantCondition = (actualValue, expectedValue, operator) => {
  switch (operator) {
    case '==': return actualValue == expectedValue;
    case '!=': return actualValue != expectedValue;
    case '>': return actualValue > expectedValue;
    case '>=': return actualValue >= expectedValue;
    case '<': return actualValue < expectedValue;
    case '<=': return actualValue <= expectedValue;
    case 'in':
      return Array.isArray(expectedValue)
        ? expectedValue.includes(actualValue)
        : typeof expectedValue === 'string' && expectedValue.includes(actualValue);
    case 'not in':
      return Array.isArray(expectedValue)
        ? !expectedValue.includes(actualValue)
        : typeof expectedValue === 'string' && !expectedValue.includes(actualValue);
    default: return false;
  }
}

const parseJSONValue = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return str; // fallback to string if JSON.parse fails
  }
}

const populateInstanceProperties = (node, data) => {
  if ('componentProperties' in node && node.componentProperties) {
    const props = node.componentProperties;
    const updatedProps = {};

    // Handle {{...}} expressions
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
              resolved = applyFiltersToValue(String(resolved), expr.filters, data);
              newValue = newValue.replace(tag, resolved);
            }
          }
          updatedProps[propName] = newValue;
        }
      }
    }

    // Handle #variant[...] expressions
    const variantDirectives = parseVariantDirectives(node.name);
    for (const directive of variantDirectives) {
      const actualValue = resolveKeyPath(data, directive.keyPath);
      if (evaluateVariantCondition(actualValue, directive.expectedValue, directive.operator)) {
        updatedProps[directive.propName] = directive.propValue;
      }
    }

    // Apply all resolved props
    node.setProperties(updatedProps);
  }
};

const traverseAndPopulate = async (node, data, skipDuplicate = false) => {
  if ('locked' in node && node.locked) return;

  const expr = parseDataExpression(node.name);
  const shouldDuplicate = !skipDuplicate && expr && 'duplicate' in expr.filters;

  // --- Handle duplication: insert before node to preserve order ---
  if (shouldDuplicate && 'clone' in node && node.parent) {
    const rawCount = expr.filters.duplicate[0];
    const count = typeof rawCount === 'string' ? resolveKeyPath(data, rawCount) : rawCount;

    if (typeof count === 'number' && count > 1) {
      const cleanName = node.name.replace(/\|\s*duplicate\s+[^\|}]+/, '').trim();
      const parent = node.parent;
      const index = parent.children.indexOf(node);

      // Clone in reverse order so they appear above the original
      for (let i = count - 1; i >= 0; i--) {
        const isOriginal = i === 0;
        const targetNode = isOriginal ? node : node.clone();

        targetNode.name = cleanName;
        targetNode.relativeTransform = node.relativeTransform;

        if (!isOriginal) {
          parent.insertChild(index, targetNode); // Insert before the original
        }

        await traverseAndPopulate(targetNode, data, true); // ✅ skip duplicate logic for clones
      }

      return; // We've handled population, so exit early
    }
  }

  // --- Populate self ---
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

  // --- Handle array groups like {{items}} ---
  if ('children' in node && node.name.match(/{{\w+(\s*\|.*)?}}/)) {
    await cloneAndPopulateGroup(node, data);
  }

  // --- Traverse original children only ---
  if ('children' in node) {
    const childrenToTraverse = [...node.children];
    for (const child of childrenToTraverse) {
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
      
      // Insert the clone BEFORE the template
      const index = group.children.indexOf(template);
      group.insertChild(index, clone);

      await traverseAndPopulate(clone, array[i]);
    } else {
      await traverseAndPopulate(template, array[i]);
    }
  }
};

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