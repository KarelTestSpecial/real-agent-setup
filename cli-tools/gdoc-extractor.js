/**
 * Google Docs & General Web Text Extractor
 * 
 * Injected by MACCHA (AI personal assistant) - June 2026
 * 
 * This script runs in the browser console or as a Bookmarklet. It bypasses Google Docs' 
 * canvas rendering to extract the plain text for copy-pasting or offline saving, 
 * presenting it in a clean, overlay card.
 */
(function() {
  let text = "";
  const isGoogleDoc = window.location.hostname === 'docs.google.com' && window.location.pathname.startsWith('/document/');
  
  if (isGoogleDoc) {
    // 1. Target typical classnames in Google Docs document structure (SVG/DOM overlays)
    const elements = document.querySelectorAll('.kix-paragraphrenderer, .kix-line, .kix-line-view, .docs-text-ui, [class*="kix-line"]');
    if (elements.length > 0) {
      let lines = [];
      elements.forEach(el => {
        const t = el.innerText || el.textContent;
        if (t && t.trim().length > 0) {
          lines.push(t);
        }
      });
      text = lines.join('\n');
    }
    
    // 2. Fallback to main editor container innerText if standard selector fails
    if (!text || text.trim().length === 0) {
      const editor = document.querySelector('.docs-editor-container') || document.querySelector('#docs-editor');
      if (editor) {
        text = editor.innerText;
      }
    }
  } else {
    // 3. Fallback for normal webpages: extract highlighted text or body text
    text = window.getSelection().toString() || document.body.innerText;
  }
  
  if (!text || text.trim().length === 0) {
    alert("No tekst found om te extraheren!");
    return;
  }
  
  // Create / Recreate UI Overlay
  const overlayId = 'gdoc-extractor-overlay';
  let existing = document.getElementById(overlayId);
  if (existing) {
    existing.remove();
  }
  
  const container = document.createElement('div');
  container.id = overlayId;
  container.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    width: 460px;
    height: 620px;
    background: #1e1e1e;
    color: #f5f5f5;
    border: 2px solid #3c3c3c;
    border-radius: 10px;
    box-shadow: 0 12px 30px rgba(0,0,0,0.6);
    z-index: 999999;
    display: flex;
    flex-direction: column;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  
  // Overlay Header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 12px 16px;
    background: #2d2d2d;
    border-bottom: 1px solid #3c3c3c;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: bold;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
  `;
  header.innerHTML = '<span style="display:flex; align-items:center; gap:8px;">📄 Google Docs Text Extractor</span>';
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    color: #aaa;
    font-size: 18px;
    cursor: pointer;
    padding: 0 4px;
  `;
  closeBtn.onclick = () => container.remove();
  header.appendChild(closeBtn);
  
  // Text Area
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = `
    flex: 1;
    padding: 16px;
    background: #121212;
    color: #e0e0e0;
    border: none;
    resize: none;
    font-family: monospace;
    font-size: 13px;
    line-height: 1.5;
    outline: none;
  `;
  
  // Footer / Buttons
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 12px 16px;
    background: #2d2d2d;
    border-top: 1px solid #3c3c3c;
    display: flex;
    gap: 12px;
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
  `;
  
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy to clipboard';
  copyBtn.style.cssText = `
    padding: 8px 16px;
    background: #007acc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    font-size: 13px;
    transition: background 0.2s;
  `;
  copyBtn.onclick = () => {
    textarea.select();
    document.execCommand('copy');
    copyBtn.textContent = '✓ Copied!';
    copyBtn.style.background = '#28a745';
    setTimeout(() => {
      copyBtn.textContent = 'Copy to clipboard';
      copyBtn.style.background = '#007acc';
    }, 2000);
  };
  
  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download .txt';
  downloadBtn.style.cssText = `
    padding: 8px 16px;
    background: #3c3c3c;
    color: #f5f5f5;
    border: 1px solid #555;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  `;
  downloadBtn.onclick = () => {
    const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'google_doc_extracted_text.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  footer.appendChild(copyBtn);
  footer.appendChild(downloadBtn);
  
  container.appendChild(header);
  container.appendChild(textarea);
  container.appendChild(footer);
  document.body.appendChild(container);
})();
