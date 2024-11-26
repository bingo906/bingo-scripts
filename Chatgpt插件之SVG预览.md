## Chatgpt插件之SVG预览

### 背景

 	目前市面上的大模型呈现出百花齐放的态势，各模型在选择和使用上各具特色。

​     近期重点关注了代码预览功能，各模型表现各有千秋。经过对比，原生预览功能 推荐以下两款支持的平台：Claude 和 DeepSeek。

​      在大模型的使用方式上，可以尝试一种新的思路：关注李继刚（Prompt）博主的分享，尤其是其基于 Lisp 语法，在 Claude 平台上创作的 SVG 生成 Prompt。**收益**： 在gpt的使用体验方面，其展示效果与传播能力也有显著提升，进一步增强了用户交互与内容分享的效率。

​       但是,claude目前需要外网号码注册且限额，使用体验一般。考虑通过chatgpt结合拓展脚本实现预览。

prompt参考地址： 

https://waytoagi.feishu.cn/wiki/OWTow2oPViaMZ4ky2CKcRI30nGg

路径及效果：

![image-20241122140026110](/Users/a58/Desktop/设计文档/chatgpt预览/1.png)



### 模型预览功能-使用体验

#### Claude

![image-20241122140151453](/Users/a58/Desktop/设计文档/chatgpt预览/2.png)

对于提示词的理解及生成质量及样式水平最佳 ，但claude目前需要外网号码注册且限额，使用体验一般。考虑通过chatgpt实现。



#### chatgpt：（无原生预览功能）

对提示词及生成质量及样式水平也在线，但缺乏预览能力，手动的复制svg代码在对应svg预览平台查看步骤繁琐。

因此引出想创建一个油猴脚本在实现预览的能力。

插件效果如下： 

![image-20241122140503664](/Users/a58/Desktop/设计文档/chatgpt预览/3.png)



### 脚本安装

1. chrome安装油猴插件  https://www.tampermonkey.net/
2. 引入预览脚本 

```js
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
<div class="svg-preview-header">SVG Preview</div>
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

```

