// --- Expressions ---

const parseDataExpression = (name) => {
  const match = name.match(/{{\s*([^{}]+?)\s*}}/);
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

// --- Filters ---

const filtersMap = {
  max: (val, args, data) => val.slice(0, resolveKeyPath(data, args[0]) ?? args[0]),
  date: (val) => {
    const d = new Date(val);
    return isNaN(d) ? val : d.toLocaleDateString();
  },
};

const applyFiltersToValue = (value, filters, data) => {
  for (const [filter, args] of Object.entries(filters)) {
    if (filtersMap[filter]) {
      value = filtersMap[filter](value, args, data);
    }
  }
  return value;
};

// --- Images ---

const imageKitConvertToPng = (url) => {
  const path = encodeURIComponent(url);
  return `https://ik.imagekit.io/erikdotdesign/another-data-populator/tr:fo-auto,f-png/${path}`;
};

const tryFetchImage = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Image failed to load');
    return await res.arrayBuffer();
  } catch (err) {
    console.warn(`Failed to fetch image: ${url}`, err);
    return null;
  }
};

const fetchImageWithFallbacks = async (urls: string[]) => {
  for (const url of urls) {
    const buffer = await tryFetchImage(url);
    if (buffer) return buffer;
  }
  return null;
};

const applyImageFill = async (node, buffer) => {
  const imageBytes = new Uint8Array(buffer);
  const image = figma.createImage(imageBytes);
  node.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: image.hash }];
};


// --- Visibility ---

const evaluateLogicalExpression = (expression, data) => {
  const replaced = expression.replace(/{{(.*?)}}/g, (_, keyPath) => {
    const value = resolveKeyPath(data, keyPath.trim());
    return typeof value === 'string' ? `"${value}"` : String(value);
  });

  try {
    // Safe eval pattern: no access to scope, only evaluated values
    return Function(`"use strict"; return (${replaced});`)();
  } catch (e) {
    console.warn('Failed to evaluate variant expression:', expression, e);
    return false;
  }
};

const handleVisibilityDirectives = (node, data) => {
  const showMatch = node.name.match(/#show\[(.+?)\]/);
  const hideMatch = node.name.match(/#hide\[(.+?)\]/);

  if (showMatch) {
    const condition = showMatch[1];
    const result = evaluateLogicalExpression(condition, data);
    node.visible = !!result;
  }

  if (hideMatch) {
    const condition = hideMatch[1];
    const result = evaluateLogicalExpression(condition, data);
    node.visible = !result;
  }
};

// --- Variants ---

const parseVariantDirectives = (name) => {
  const matches = [...name.matchAll(/#variant\[(.+?)\]/g)];
  if (!matches.length) return [];

  return matches.map(match => {
    const content = match[1];
    const [conditionStr, setterStr] = content.split(',').map(s => s.trim());

    if (!conditionStr || !setterStr) return null;
    const [propName, propValue] = setterStr.split('=').map(s => s.trim());
    if (!propName || !propValue) return null;

    return {
      conditionStr,
      propName,
      propValue,
    };
  }).filter(Boolean);
};

const findActualPropKey = (name, props) => {
  return Object.keys(props).find(key => key.split('#')[0] === name);
};

// --- Duplicates ---

const handleDuplicateDirective = async (node, data) => {
  const match = node.name.match(/#duplicate\[\s*({{.+?}}|[^\]]+)\s*\]/);
  if (!match || !('clone' in node) || !node.parent) return false;

  let count = 1;
  const rawExpr = match[1];

  if (rawExpr.startsWith('{{')) {
    const expr = parseDataExpression(rawExpr);
    if (expr) {
      let val = resolveKeyPath(data, expr.key);
      if (val !== undefined) {
        val = applyFiltersToValue(val, expr.filters, data);
        count = Math.round(Number(val));
      }
    }
  } else {
    count = Math.round(Number(rawExpr));
  }

  if (typeof count === 'number' && count > 1) {
    const parent = node.parent;
    const index = parent.children.indexOf(node);

    for (let i = count - 1; i >= 0; i--) {
      const isOriginal = i === 0;
      const targetNode = isOriginal ? node : node.clone();

      targetNode.relativeTransform = node.relativeTransform;

      if (!isOriginal) {
        parent.insertChild(index, targetNode);
      }

      await traverseAndPopulate(targetNode, data, true);
    }

    return true; // Duplication handled, skip further processing
  }

  return false;
};

// --- Directives ---

const stripNameDirectives = (node) => {
  node.name = node.name
    .replace(/#show\[[^\]]*\]/g, '')
    .replace(/#hide\[[^\]]*\]/g, '')
    .replace(/#duplicate\[[^\]]*\]/g, '')
    .replace(/#variant\[[^\]]*\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

// --- Populate ---

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
      figma.notify(`Missing font: ${node.fontName.family}`);
      console.error('Font error:', err);
    }
  }
};

const populateImageNode = async (node, key, data) => {
  let url = typeof data === 'string' ? data : resolveKeyPath(data, key);
  if (typeof url !== 'string') return;

  const isImageAsset = url.match(/\.(webp|png|jpe?g|gif|svg)(\?.*)?$/i);
  if (!isImageAsset) return;

  const urls = [];

  // 1. Convert webp to PNG if needed
  if (url.endsWith('.webp')) {
    urls.push(imageKitConvertToPng(url));
  } else {
    urls.push(url);
  }

  // 2. Dynamic fallback from DummyJSON
  const dummyFallback = `https://dummyjson.com/image/${node.width.toFixed(0)}x${node.height.toFixed(0)}?type=png&fontFamily=ubuntu`;
  urls.push(dummyFallback);

  const buffer = await fetchImageWithFallbacks(urls);
  if (buffer) {
    await applyImageFill(node, buffer);
  } else {
    console.warn('All image fallbacks failed for node:', node.name);
  }
};

const populateInstanceProperties = (node, data) => {
  if ('componentProperties' in node && node.componentProperties) {
    const props = node.componentProperties;
    const updatedProps = {};

    // --- Handle {{...}} expressions ---
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

          const actualPropKey = findActualPropKey(propName.split('#')[0], props);
          if (actualPropKey) {
            updatedProps[actualPropKey] = newValue;
          }
        }
      }
    }

    // --- Handle #variant[...] expressions ---
    const variantDirectives = parseVariantDirectives(node.name);
    for (const directive of variantDirectives) {
      if (evaluateLogicalExpression(directive.conditionStr, data)) {
        let value = directive.propValue;

        if (value === 'true') value = true;
        else if (value === 'false') value = false;

        const actualPropKey = findActualPropKey(directive.propName, props);
        if (actualPropKey) {
          updatedProps[actualPropKey] = value;
        }
      }
    }

    node.setProperties(updatedProps);
  }
};

const traverseAndPopulate = async (node, data, skipDuplicate = false) => {

  // --- Handle duplication ---
  if (!skipDuplicate && await handleDuplicateDirective(node, data)) {
    return; // Duplication handled, no need to recurse further
  }

  // --- Handle visibility directives  ---
  handleVisibilityDirectives(node, data);

  // --- Populate self ---
  populateInstanceProperties(node, data);

  // --- Clean up any other directives ---
  stripNameDirectives(node);

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

// --- Main ----

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