// content.js
let isSelectionMode = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startSelection") {
    isSelectionMode = true;
    document.body.style.cursor = "pointer";
    addHoverHighlight();
  }
});

function addHoverHighlight() {
  const style = document.createElement('style');
  style.textContent = `
    .content-extractor-hover {
      outline: 2px solid #007bff !important;
      background-color: rgba(0, 123, 255, 0.1) !important;
    }
  `;
  document.head.appendChild(style);
}

document.addEventListener("mouseover", (e) => {
  if (!isSelectionMode) return;
  
  const potentialContent = findContentContainer(e.target);
  removeAllHighlights();
  if (potentialContent) {
    potentialContent.classList.add('content-extractor-hover');
  }
});

document.addEventListener("mouseout", (e) => {
  if (!isSelectionMode) return;
  removeAllHighlights();
});

document.addEventListener("click", (e) => {
  if (!isSelectionMode) return;
  
  e.preventDefault();
  const contentContainer = findContentContainer(e.target);
  
  if (contentContainer) {
    // Extract content with Markdown formatting
    let content = extractContent(contentContainer);
    
    // Copy to clipboard
    navigator.clipboard.writeText(content).then(() => {
      console.log("Content copied to clipboard");
      isSelectionMode = false;
      document.body.style.cursor = "default";
      removeAllHighlights();
    });
  }
});

function removeAllHighlights() {
  document.querySelectorAll('.content-extractor-hover').forEach(el => {
    el.classList.remove('content-extractor-hover');
  });
}

function findContentContainer(element) {
  // 特定のコンテナ要素を示す可能性の高いセレクタ
  const mainContentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '#main-content'
  ];
  
  // メインコンテンツの特徴を示すスコアリング
  function getContentScore(element) {
    let score = 0;
    
    // タグ名によるスコアリング
    const tagScores = {
      ARTICLE: 10,
      MAIN: 10,
      SECTION: 5,
      DIV: 1
    };
    score += tagScores[element.tagName] || 0;
    
    // テキストの量によるスコアリング
    const textLength = element.textContent.trim().length;
    score += Math.min(Math.floor(textLength / 100), 10);
    
    // 見出しの存在によるスコアリング
    const headings = element.querySelectorAll('h1, h2, h3');
    score += headings.length * 2;
    
    // 段落の存在によるスコアリング
    const paragraphs = element.querySelectorAll('p');
    score += paragraphs.length;
    
    return score;
  }
  
  let currentElement = element;
  let bestMatch = null;
  let bestScore = -1;
  
  // 直接のコンテナ要素のチェック
  for (const selector of mainContentSelectors) {
    const container = element.closest(selector);
    if (container) {
      const score = getContentScore(container);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = container;
      }
    }
  }
  
  // 親要素を遡って最適なコンテナを探す
  while (currentElement && currentElement !== document.body) {
    const score = getContentScore(currentElement);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = currentElement;
    }
    currentElement = currentElement.parentElement;
  }
  
  return bestMatch;
}

function extractContent(element) {
  let content = '';
  
  // DOMツリーを再帰的に処理
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        content += text + '\n';
      }
      return;
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      // 見出しの処理
      if (node.tagName.match(/^H[1-6]$/)) {
        const level = node.tagName[1];
        content += '#'.repeat(level) + ' ' + node.textContent.trim() + '\n\n';
        return;
      }
      
      // リストの処理
      if (node.tagName === 'LI') {
        content += '- ' + node.textContent.trim() + '\n';
        return;
      }
      
      // 段落の処理
      if (node.tagName === 'P') {
        content += node.textContent.trim() + '\n\n';
        return;
      }
      
      // その他の要素は子ノードを再帰的に処理
      for (const child of node.childNodes) {
        processNode(child);
      }
      
      // ブロック要素の後に改行を追加
      const style = window.getComputedStyle(node);
      if (style.display === 'block') {
        content += '\n';
      }
    }
  }
  
  processNode(element);
  return content.trim();
}