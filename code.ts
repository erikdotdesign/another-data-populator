figma.showUI(__html__, { width: 360, height: 300 });

const validURL = (str) => {
  const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  return !!pattern.test(str);
}

const getLeafNodes = (node) => {
  const leafNodes: SceneNode[] = [];

  const cannotHaveChildren = [
    "RECTANGLE",
    "ELLIPSE",
    "POLYGON",
    "STAR",
    "VECTOR",
    "TEXT",
    "LINE",
    "BOOLEAN_OPERATION",
    "SHAPE_WITH_TEXT",
    "STAMP",
    "PLACEHOLDER"
  ];

  const collectLeafNodes = (node: SceneNode) => {
    if (cannotHaveChildren.includes(node.type)) {
      leafNodes.push(node);
    } else if ("children" in node && node.type !== "INSTANCE") {
      for (const child of node.children) {
        collectLeafNodes(child);
      }
    }
  };

  collectLeafNodes(node);

  return leafNodes;
}

const handleTextNode = async (node, entry) => {
  await figma.loadFontAsync(node.fontName);
  const placeholders = node.characters.match(/\{\{(.*?)\}\}/g);
  if (placeholders) {
    let newText = node.characters;
    // for (const tag of placeholders) {
    //   const key = tag.replace(/\{|\}/g, '').trim();
    //   if (entry[key]) {
    //     newText = newText.replace(tag, entry[key]);
    //   }
    // }
    for (const tag of placeholders) {
      const key = tag.replace(/\{|\}/g, '').trim().split('.');
      let value = entry;
      for (const step of key) {
        if (value[step]) {
          value = value[step];
        }
      }
      if (value) {
        newText = newText.replace(tag, value);
      }
    }
    node.characters = newText;
  }
}

const handleImageNode = async (node, entry) => {
  const imageMatch = node.name.match(/^\{\{(.*?)\}\}$/);
  if (imageMatch) {
    const key = imageMatch[1].trim();
    const url = entry[key];
    if (url) {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const image = figma.createImage(new Uint8Array(arrayBuffer));
        const fills = [
          {
            type: 'IMAGE',
            scaleMode: 'FILL',
            imageHash: image.hash
          }
        ];
        node.fills = fills;
      } catch (e) {
        figma.notify(`Failed to load image from ${url}`);
      }
    }
  }
}

async function populateNodesWithData(nodes, data) {
  // let entry = data;
  // if (Array.isArray(data)) {
  //   entry = data[Math.floor(Math.random() * data.length)];
  // }
  let entry = data;

  for (const node of nodes) {
    const leafNodes = getLeafNodes(node);
    for (const leafNode of leafNodes) {
      if (leafNode.type === "TEXT" && leafNode.characters.includes("{{")) {
        await handleTextNode(leafNode, entry);
      } else if ("fills" in leafNode && Array.isArray(leafNode.fills)) {
        await handleImageNode(leafNode, entry);
      }
    }
  }
}

figma.ui.onmessage = async msg => {
  if (msg.type === 'populate') {
    try {
      let data;
      if (validURL(msg.raw)) {
        const response = await fetch(msg.raw);
        data = await response.json();
      } else {
        data = JSON.parse(msg.raw);
      }
      // if (!Array.isArray(data)) throw new Error("Data must be an array");
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.notify("Select at least one text or shape layer.");
        return;
      }
      await populateNodesWithData(selection, data);
      figma.notify("Data populated in selected layers.");
    } catch (e) {
      figma.notify("Invalid JSON: " + e.message);
    }
  }
};