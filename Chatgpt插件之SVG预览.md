## Chatgpt插件之SVG预览

### 背景

 	目前市面上的大模型呈现出百花齐放的态势，各模型在选择和使用上各具特色。

​     近期重点关注了代码预览功能，各模型表现各有千秋。经过对比，原生预览功能 推荐以下两款支持的平台：Claude 和 DeepSeek。

​      在大模型的使用方式上，可以尝试一种新的思路：关注李继刚（Prompt）博主的分享，尤其是其基于 Lisp 语法，在 Claude 平台上创作的 SVG 生成 Prompt。**收益**： 在gpt的使用体验方面，其展示效果与传播能力也有显著提升，进一步增强了用户交互与内容分享的效率。

​       但是,claude目前需要外网号码注册且限额，使用体验一般。考虑通过chatgpt结合拓展脚本实现预览。

prompt参考地址： 

https://waytoagi.feishu.cn/wiki/OWTow2oPViaMZ4ky2CKcRI30nGg

路径及效果：

![1](https://github.com/user-attachments/assets/d6e135c0-eea3-4386-a045-c68d48592b61)



### 模型预览功能-使用体验

#### Claude


对于提示词的理解及生成质量及样式水平最佳 ，但claude目前需要外网号码注册且限额，使用体验一般。考虑通过chatgpt实现。

![2](https://github.com/user-attachments/assets/a9278226-eea3-447e-b151-6cac55ec91f4)


#### chatgpt：（无原生预览功能）

对提示词及生成质量及样式水平也在线，但缺乏预览能力，手动的复制svg代码在对应svg预览平台查看步骤繁琐。

因此引出想创建一个油猴脚本在实现预览的能力。

插件效果如下： 
<img width="1437" alt="3" src="https://github.com/user-attachments/assets/6b7624b3-62d3-4fcd-a26c-81ec5f539e42">


### 脚本安装

1. chrome安装油猴插件  https://www.tampermonkey.net/
2. 引入预览脚本
https://github.com/bingo906/bingo-scripts/blob/main/ChatGPT%20SVG%20Preview-2.2.user.js


