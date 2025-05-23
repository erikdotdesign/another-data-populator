figma.showUI(__html__, { width: 360, height: 420 });

const IMAGEKIT_BASE = "https://ik.imagekit.io/erikdotdesign/another-data-populator/tr:f-png/";

const getConvertedImageUrl = (webpUrl) => {
  return IMAGEKIT_BASE + encodeURIComponent(webpUrl);
};

const getValueByPath = (obj, path) => {
  try {
    return path.replace(/\[(\w+)\]/g, '.$1').split('.').reduce((o, p) => o?.[p], obj);
  } catch {
    return undefined;
  }
};

const populateTextNode = async (node, entry) => {
  await figma.loadFontAsync(node.fontName);
  const placeholders = node.characters.match(/\{\{(.*?)\}\}/g);
  if (placeholders) {
    let newText = node.characters;
    for (const tag of placeholders) {
      const key = tag.replace(/\{|\}/g, '').trim();
      const value = typeof entry === 'string' ? entry : getValueByPath(entry, key);
      if (value !== undefined) {
        newText = newText.replace(tag, value);
      }
    }
    node.characters = newText;
  }
};

const populateImageNode = async (node, entry) => {
  const imageMatch = node.name.match(/^\{\{(.*?)\}\}$/);
  if (!imageMatch) return;

  const key = imageMatch[1].trim();
  const url = typeof entry === 'string' ? entry : getValueByPath(entry, key);
  let imageData = null;

  let finalUrl = url;

  if (url?.endsWith(".webp")) {
    finalUrl = getConvertedImageUrl(url);
  }

  try {
    const response = await fetch(finalUrl);
    const buffer = await response.arrayBuffer();
    imageData = new Uint8Array(buffer);
  } catch (err) {
    const w = Math.round(node.width);
    const h = Math.round(node.height);
    const fallback = `https://dummyjson.com/image/${w}x${h}?type=png&fontFamily=ubuntu`;
    const response = await fetch(fallback);
    const buffer = await response.arrayBuffer();
    imageData = new Uint8Array(buffer);
  }

  if (imageData) {
    const image = figma.createImage(imageData);
    node.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: image.hash }];
  }
};

const populateTemplateGroup = async (group, entries) => {
  const match = group.name.match(/^\{\{(.*?)\s*\|\s*(\d+)\}\}$/);
  if (!match || !Array.isArray(entries)) return;

  const [, key, countStr] = match;
  const count = parseInt(countStr);
  let list = getValueByPath(entries[0], key);

  if (!Array.isArray(list)) return;

  const template = group.findChild(n => n.name === "{{template}}");
  if (!template || !("clone" in template)) return;

  const clones = [];
  for (let i = 0; i < count && i < list.length; i++) {
    const clone = template.clone();
    clone.name = template.name;
    clone.relativeTransform = template.relativeTransform;
    group.appendChild(clone);
    await recursivelyPopulate(clone, [list[i]]);
    clones.push(clone);
  }

  template.remove();
};

const recursivelyPopulate = async (node, data) => {
  if (node.type === 'TEXT') {
    await populateTextNode(node, data[0]);
  } else if ("fills" in node && Array.isArray(node.fills)) {
    await populateImageNode(node, data[0]);
  } else if ("children" in node) {
    const templateGroupMatch = node.name.match(/^\{\{(.*?)\s*\|\s*(\d+)\}\}$/);
    if (templateGroupMatch) {
      await populateTemplateGroup(node, data);
    } else {
      for (const child of node.children) {
        await recursivelyPopulate(child, data);
      }
    }
  }
};

figma.ui.onmessage = async msg => {
  if (msg.type === 'populate') {
    try {
      let data = JSON.parse(msg.raw);
      if (!Array.isArray(data)) data = [data];
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.notify("Select at least one frame or group.");
        return;
      }
      for (const node of selection) {
        await recursivelyPopulate(node, data);
      }
      figma.notify("Data populated successfully.");
    } catch (e) {
      figma.notify("Invalid JSON: " + e.message);
    }
  }
};