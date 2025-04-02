// ==UserScript==
// @name         SVG Viewer - BINGO906
// @namespace    http://tampermonkey.net/
// @version      2.3.5_CN
// @description  在任何网站上，每次复制 SVG 代码时，自动渲染预览（兼容需要 TrustedHTML 的 DOMParser），并提供另存为 SVG 或 JPG 的选项。
// @author       Bingo (由 AI 增强)
// @match        *://*/*
// @grant        GM_download
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 移除了 lastDisplayedSvg 变量
    let permissionAlertShown = false;
    let svgPolicy = null; // 用于存储 Trusted Type Policy

    // --- 尝试创建 Trusted Types Policy ---
    // 检查 Trusted Types API 是否存在
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        try {
            // 尝试创建一个简单的策略，它仅返回原始输入
            // 注意：这假设我们信任从剪贴板获取的 SVG 代码是安全的，或者说风险可接受
            svgPolicy = window.trustedTypes.createPolicy('svg-preview-script#policy', {
                createHTML: input => input
            });
        } catch (e) {
            // 如果策略已存在（例如脚本被注入多次），创建会失败
            console.warn("SVG Preview: Could not create Trusted Types policy (maybe it already exists?). TrustedHTML might not be available.", e.message);
        }
    }
    // --- Policy 创建结束 ---


    /**
     * 创建并注入 SVG 预览所需的 CSS 样式
     */
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .svg-preview-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 99999;
                width: 40%;
                max-height: 80vh;
                background: #f9f9f9;
                border: 1px solid #ddd;
                border-radius: 12px;
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                font-family: Arial, sans-serif;
                box-sizing: border-box;
            }
            .svg-preview-container * {
                box-sizing: border-box;
            }
            .svg-preview-header {
                background: #007bff;
                color: white;
                padding: 10px;
                font-size: 16px;
                font-weight: bold;
                text-align: center;
                flex-shrink: 0;
            }
            .svg-preview-content {
                flex-grow: 1;
                display: flex;
                justify-content: center;
                align-items: center;
                background: white;
                overflow: auto;
                padding: 20px;
            }
            .svg-preview-content pre {
                white-space: pre-wrap; /* 允许错误文本换行 */
                word-break: break-all; /* 强制长单词断开 */
                font-family: monospace;
                color: red;
                padding: 10px;
                text-align: left;
                max-width: 100%; /* 限制宽度 */
            }
            .svg-preview-content svg {
                max-width: 100%;
                max-height: 100%;
                display: block;
            }
            .svg-preview-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f1f1f1;
                padding: 10px;
                flex-shrink: 0;
            }
            .svg-preview-footer button {
                padding: 8px 12px;
                border: none;
                border-radius: 4px;
                background: #007bff;
                color: white;
                cursor: pointer;
                font-size: 14px;
                margin: 0 5px;
            }
            .svg-preview-footer button:hover {
                background: #0056b3;
            }
            .svg-preview-header .author {
                display: block;
                font-size: 10px;
                font-weight: normal;
                margin-top: 4px;
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 创建 SVG 预览窗口的 DOM 结构并添加到页面
     * @returns {object|null} 包含关键元素引用的对象，如果创建失败则返回 null
     */
    function createPreviewContainer() {
        try {
            const container = document.createElement('div');
            container.classList.add('svg-preview-container');
            container.style.display = 'none';

            const header = document.createElement('div');
            header.className = 'svg-preview-header';
            const titleSpan = document.createElement('span');
            titleSpan.className = 'title';
            titleSpan.textContent = 'SVG 预览';
            const authorSpan = document.createElement('span');
            authorSpan.className = 'author';
            authorSpan.textContent = '开发者: bingo906(微信)';
            header.appendChild(titleSpan);
            header.appendChild(authorSpan);
            container.appendChild(header);

            const content = document.createElement('div');
            content.className = 'svg-preview-content';
            content.id = 'svg-preview';
            container.appendChild(content);

            const footer = document.createElement('div');
            footer.className = 'svg-preview-footer';
            const closeButton = document.createElement('button');
            closeButton.id = 'svg-toggle';
            closeButton.textContent = '关闭';
            footer.appendChild(closeButton);

            const buttonGroup = document.createElement('div');
            const saveSvgBtn = document.createElement('button');
            saveSvgBtn.id = 'svg-save-svg';
            saveSvgBtn.textContent = '另存为 SVG';
            buttonGroup.appendChild(saveSvgBtn);
            const saveJpgBtn = document.createElement('button');
            saveJpgBtn.id = 'svg-save-jpg';
            saveJpgBtn.textContent = '另存为 JPG';
            buttonGroup.appendChild(saveJpgBtn);
            footer.appendChild(buttonGroup);
            container.appendChild(footer);

            if (document.body) {
                document.body.appendChild(container);
            } else {
                document.addEventListener('DOMContentLoaded', () => document.body.appendChild(container));
                console.warn("SVG Preview: document.body not ready immediately, delaying container append.");
            }

            const svgPreviewElement = document.getElementById('svg-preview');
            const toggleButtonElement = document.getElementById('svg-toggle');
            const saveSvgButtonElement = document.getElementById('svg-save-svg');
            const saveJpgButtonElement = document.getElementById('svg-save-jpg');

            if (!svgPreviewElement || !toggleButtonElement || !saveSvgButtonElement || !saveJpgButtonElement) {
                console.error("SVG Preview: Failed to get essential UI elements after creation!");
                if (container.parentNode) {
                    container.parentNode.removeChild(container);
                }
                return null;
            }

            return {
                container,
                svgPreview: svgPreviewElement,
                toggleButton: toggleButtonElement,
                saveSvgButton: saveSvgButtonElement,
                saveJpgButton: saveJpgButtonElement
            };
        } catch (error) {
            console.error("SVG Preview: Error creating the preview container:", error);
            return null;
        }
    }

    // --- 主逻辑开始 ---
    injectStyles();
    const uiElements = createPreviewContainer();

    if (uiElements) {
        // --- 监听全局 'copy' 事件 ---
        document.addEventListener('copy', () => {
            // 使用 setTimeout 等待剪贴板更新
            setTimeout(async () => {
                try {
                    const copiedText = await navigator.clipboard.readText();

                    // 简单检查是否包含 SVG 结构
                    if (copiedText && copiedText.includes('<svg') && copiedText.includes('</svg>')) {
                        // 使用更健壮的正则提取第一个有效的 SVG 代码块 (忽略大小写)
                        const svgMatch = copiedText.match(/<svg[\s\S]*?<\/svg>/i);
                        const svgCode = svgMatch ? svgMatch[0] : null;

                        // --- 修改：移除了与 lastDisplayedSvg 的比较 ---
                        // 只要复制了有效的 SVG 代码就执行
                        if (svgCode) {
                            try {
                                // 1. 清空预览区域 (安全方式)
                                while (uiElements.svgPreview.firstChild) {
                                    uiElements.svgPreview.removeChild(uiElements.svgPreview.firstChild);
                                }

                                // 2. 准备解析
                                const parser = new DOMParser();
                                let svgDoc;

                              // 在调用 parseFromString 之前
                                let cleanedSvgCode = svgCode.replace(/<!--.*?-->/gs, ''); // 尝试移除所有注释
                                // 然后使用 cleanedSvgCode 传递给 Policy 和 parser
                                const stringToParse = svgPolicy ?
                                      svgPolicy.createHTML(cleanedSvgCode) :
                                cleanedSvgCode;

                                // 3. 使用 DOMParser 解析 SVG 字符串 (传入 TrustedHTML 或 string)
                                svgDoc = parser.parseFromString(stringToParse, "image/svg+xml");

                                // 4. 检查解析是否出错
                                const parserError = svgDoc.querySelector("parsererror");
                                if (parserError) {
                                    console.error("SVG Preview: Error parsing SVG string:", parserError.textContent);
                                    // 在预览区显示错误信息（使用 pre 标签保持格式）
                                    const errorPre = document.createElement('pre');
                                    // 使用 textContent 设置错误文本是安全的
                                    errorPre.textContent = `无法解析 SVG 代码:\n${parserError.textContent}`;
                                    uiElements.svgPreview.appendChild(errorPre);
                                } else {
                                    // 5. 获取解析后的根 <svg> 元素
                                    const svgElement = svgDoc.documentElement;

                                    // 6. 验证根元素确实是 SVG
                                    if (svgElement && svgElement.tagName.toLowerCase() === 'svg') {
                                        // 7. 将解析出的 SVG 节点导入到当前文档
                                        const importedNode = document.importNode(svgElement, true);
                                        // 8. 将导入的节点附加到预览容器
                                        uiElements.svgPreview.appendChild(importedNode);
                                    } else {
                                        console.error("SVG Preview: Parsed document does not contain a root SVG element.");
                                        const errorPre = document.createElement('pre');
                                        errorPre.textContent = "解析后的内容不是有效的 SVG。";
                                        uiElements.svgPreview.appendChild(errorPre);
                                    }
                                }

                                // --- 修改：移除了 lastDisplayedSvg 的赋值 ---
                                // 9. 总是显示/刷新容器
                                uiElements.container.style.display = 'flex';

                            } catch (parseError) {
                                console.error("SVG Preview: Exception during SVG parsing or appending:", parseError);
                                // 清空并显示通用错误信息
                                while (uiElements.svgPreview.firstChild) {
                                    uiElements.svgPreview.removeChild(uiElements.svgPreview.firstChild);
                                }
                                const errorPre = document.createElement('pre');
                                errorPre.textContent = "加载预览时发生异常。请检查控制台。";
                                uiElements.svgPreview.appendChild(errorPre);
                                uiElements.container.style.display = 'flex';
                                // --- 修改：移除了 lastDisplayedSvg 的赋值 ---
                            }
                            // --- 修改：移除了 else if 分支 ---
                        }
                    }
                } catch (err) {
                    // 处理潜在错误（如剪贴板权限问题）
                    if (err.name === 'NotAllowedError' || (err.message && err.message.toLowerCase().includes('permission'))) {
                        if (!permissionAlertShown) {
                            alert('【SVG 预览脚本提示】\n\n读取剪贴板权限被拒绝。\n\n为了自动预览复制的 SVG，请允许脚本访问剪贴板。\n\n您可能需要在浏览器地址栏旁边的图标或页面设置中检查并授予权限。\n\n(此提示仅显示一次)');
                            permissionAlertShown = true;
                        }
                    } else if (!err.message || !err.message.includes("clipboard is empty")) { // 忽略剪贴板为空的错误，但报告其他错误
                        console.error('SVG 预览：读取剪贴板内容时发生其他错误:', err);
                    }
                }
            }, 150); // 延迟时间可根据需要调整（150ms 通常足够）
        });

        // --- 添加按钮事件监听器 ---

        // 关闭按钮
        uiElements.toggleButton.addEventListener('click', () => {
            uiElements.container.style.display = 'none';
        });

        // 另存为 SVG
        uiElements.saveSvgButton.addEventListener('click', () => {
            // 保存 SVG 时，从当前预览区的 SVG 元素重新序列化
            const currentSvgElement = uiElements.svgPreview.querySelector('svg'); // 获取当前显示的 SVG 元素
            if (currentSvgElement) {
                const svgContent = new XMLSerializer().serializeToString(currentSvgElement);
                const blob = new Blob([svgContent], {
                    type: 'image/svg+xml;charset=utf-8'
                });
                const url = URL.createObjectURL(blob);
                const filename = generateFilename('svg-image', 'svg');
                GM_download({
                    url: url,
                    name: filename,
                    saveAs: true, // 提示用户选择保存位置和文件名
                    onload: () => URL.revokeObjectURL(url) // 下载完成后释放 Blob URL
                });
            } else if (uiElements.svgPreview.textContent.includes("无法解析") || uiElements.svgPreview.textContent.includes("加载预览时")) {
                alert("当前预览内容包含错误，无法直接保存为 SVG。");
            } else {
                alert("没有有效的 SVG 内容可保存。");
            }
        });

        // 另存为 JPG
        uiElements.saveJpgButton.addEventListener('click', () => {
            // 保存 JPG 时也需要获取当前预览区的 SVG 元素
            const svgElement = uiElements.svgPreview.querySelector('svg');
            if (svgElement) {
                const svgData = new XMLSerializer().serializeToString(svgElement);
                const img = new Image();

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    // 获取 SVG 的自然尺寸或指定尺寸
                    const svgRect = svgElement.getBoundingClientRect();
                    let width = svgRect.width;
                    let height = svgRect.height;

                    // 如果 getBoundingClientRect 拿到的是 0，尝试回退
                    if (!width || !height) {
                        const viewBox = svgElement.viewBox.baseVal;
                        if (viewBox && viewBox.width && viewBox.height) {
                            width = viewBox.width;
                            height = viewBox.height;
                        } else {
                            width = parseFloat(svgElement.getAttribute('width')) || img.naturalWidth || 300; // 默认宽度
                            height = parseFloat(svgElement.getAttribute('height')) || img.naturalHeight || 150; // 默认高度
                        }
                    }

                    // 设置 Canvas 尺寸 (确保是正数)
                    canvas.width = Math.max(1, width);
                    canvas.height = Math.max(1, height);

                    const ctx = canvas.getContext('2d');

                    // 填充白色背景 (JPG 不支持透明)
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // 绘制 SVG 到 Canvas
                    try {
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    } catch (drawError) {
                        console.error("SVG 预览: 绘制 SVG 到 Canvas 时出错。", drawError);
                        alert("渲染 SVG 到 JPG 时出错。SVG 可能格式错误或包含不支持的特性。");
                        img.src = ''; // 清理
                        return; // 停止执行
                    }

                    // 将 Canvas 转换为 JPG Blob
                    canvas.toBlob(blob => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            const filename = generateFilename('svg-image', 'jpg');
                            GM_download({
                                url: url,
                                name: filename,
                                saveAs: true,
                                onload: () => URL.revokeObjectURL(url) // 清理 Blob URL
                            });
                        } else {
                            console.error("SVG 预览: 从 Canvas 创建 JPG Blob 失败。");
                            alert("无法将 SVG 转换为 JPG。");
                        }
                        img.src = ''; // 清理
                    }, 'image/jpeg', 0.9); // 指定 MIME 类型和质量
                };

                img.onerror = (e) => {

                    img.src = ''; // 清理
                };

                // 设置 Image 的源为 Base64 编码的 SVG 数据
                // 警告：这一行仍然可能受 CSP img-src data: 限制
                img.src = 'data:image/svg+xml;base64,' + base64EncodeUnicode(svgData);

            } else if (uiElements.svgPreview.textContent.includes("无法解析") || uiElements.svgPreview.textContent.includes("加载预览时")) {
                alert("当前预览内容包含错误，无法转换为 JPG。");
            } else {
                alert("没有有效的 SVG 内容可转换为 JPG。");
            }
        });

    } else {
        console.error("SVG Preview: Initialization failed because the UI container could not be created.");
    }

    // --- 辅助函数 ---

    /**
     * Base64 编码函数，处理可能存在的 Unicode 字符
     * @param {string} str 输入字符串
     * @returns {string} Base64 编码后的字符串
     */
    function base64EncodeUnicode(str) {
        try {
            // 尝试使用推荐的方法处理 Unicode
            return btoa(unescape(encodeURIComponent(str)));
        } catch (e) {
            // 如果上述方法失败（例如在非常旧的环境或特殊字符），回退到简单 btoa
            console.warn("base64EncodeUnicode 处理失败，回退到简单的 btoa:", e);
            return btoa(str);
        }
    }

    /**
     * 生成带时间戳的文件名
     * @param {string} base 文件名基础部分
     * @param {string} extension 文件扩展名 (不带点)
     * @returns {string} 完整的文件名
     */
    function generateFilename(base, extension) {
        const date = new Date();
        // 格式化时间戳 YYYYMMDD-HHMMSS
        const timestamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
        return `${base}-${timestamp}.${extension}`;
    }

})(); // 脚本立即执行函数结束
