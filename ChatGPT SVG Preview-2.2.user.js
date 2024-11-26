// ==UserScript==
// @name         ChatGPT SVG Preview
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Render and save SVG content on ChatGPT's website when copying SVG code, and provide options to save as SVG or JPG
// @author       Bingo
// @match        https://chatgpt.com/*
// @grant        GM_download
// @license      MIT
// ==/UserScript==
(function() {
'use strict';

// Attach styles
const style = document.createElement('style');
style.textContent = `
.svg-preview-container {
position: fixed;
top: 50%;
left: 20%;
transform: translate(-50%, -50%);
z-index: 9999;
width: 40%;
height: 100%;
background: #f9f9f9;
border: 1px solid #ddd;
border-radius: 12px;
box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
display: flex;
flex-direction: column;
justify-content: space-between;
overflow: hidden;
font-family: Arial, sans-serif;
}
.svg-preview-header {
background: #007bff;
color: white;
padding: 10px;
font-size: 16px;
font-weight: bold;
text-align: center;
}
.svg-preview-content {
flex-grow: 1;
display: flex;
justify-content: center;
align-items: center;
background: white;
overflow: auto;
}

.svg-preview-content svg {
max-width: 100%;
max-height: 100%;
}
.svg-preview-footer {
display: flex;
justify-content: space-between;
background: #f1f1f1;
padding: 10px;
}
.svg-preview-footer button {
padding: 8px 12px;
border: none;
border-radius: 4px;
background: #007bff;
color: white;
cursor: pointer;
font-size: 14px;
}
.svg-preview-footer button:hover {
background: #0056b3;
}
`;
document.head.appendChild(style);

// Handle click event
document.body.addEventListener('click', function(event) {
    const target = event.target.closest('button.flex.gap-1.items-center.select-none.py-1');
    if (target) {
        setTimeout(async () => {
            try {
                const copiedText = await navigator.clipboard.readText();
                if (copiedText.includes('<svg') && copiedText.includes('</svg>')) {
                    const svgCode = copiedText.match(/<svg[^>]*>[\s\S]*<\/svg>/)[0];
                    if (svgCode) {
                        svgPreview.innerHTML = svgCode;
                        container.style.display = 'flex';
                    }
                }
            } catch (err) {
                console.error('获取剪贴板内容失败:', err);
                alert('无法获取剪贴板内容，请检查权限设置或浏览器限制。');
            }
        }, 300);
    }
});

// Create SVG preview container
const container = document.createElement('div');
container.classList.add('svg-preview-container');
container.style.display = 'none';
container.innerHTML = `
<div class="svg-preview-header">
     <span class="title">SVG Preview</span>
    <span class="author">Dev. by: bingo906(wechat)</span>
</div>
<div class="svg-preview-content" id="svg-preview"></div>
<div class="svg-preview-footer">
    <button id="svg-toggle">Close</button>
    <button id="svg-save-svg" style="display:none">Save as SVG</button>
    <button id="svg-save-jpg"  >Save as JPG</button>
</div>
`;
document.body.appendChild(container);

const svgPreview = container.querySelector('#svg-preview');
const toggleButton = container.querySelector('#svg-toggle');
const saveSvgButton = container.querySelector('#svg-save-svg');
const saveJpgButton = container.querySelector('#svg-save-jpg');

// Toggle visibility
toggleButton.addEventListener('click', () => {
    container.style.display = 'none';
});

// Save as SVG
saveSvgButton.addEventListener('click', () => {
    const svgContent = svgPreview.innerHTML;
    if (svgContent) {
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        GM_download({
            url,
            name: 'svg-image.svg',
            saveAs: true,
        });
    }
});

// 转换 SVG 为 JPG 并下载
saveJpgButton.addEventListener('click', () => {
    const svgContent = svgPreview.getElementsByTagName('svg')[0];
    if (svgContent) {
        const svgData = new XMLSerializer().serializeToString(svgContent);

        // 使用新的编码函数进行编码
        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + base64EncodeUnicode(svgData);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                GM_download({
                    url,
                    name: 'svg-image.jpg',
                    saveAs: true,
                });
            }, 'image/jpeg');
        };
    }
});

// 编码处理函数，处理可能包含 Unicode 字符的 SVG 字符串
function base64EncodeUnicode(str) {
    return btoa(unescape(encodeURIComponent(str)));
}


})();
