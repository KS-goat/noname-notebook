# 谱记 · 五线谱记谱器

简洁的浏览器记谱工具，支持多声部、每小节调号与拍号、歌词、连音、附点、八度线、反复符号和钢琴播放。无需服务器或安装依赖。

## 使用

打开 `index.html` 即可使用。Tab 切换编辑与选择模式；编辑模式点击同一位置依次添加音符、变为休止符、删除。选择模式支持 Ctrl 多选，悬停在已选音符或小节上显示详细选项。移出音符与菜单后收起，输入音符时不会自动弹出。

作品自动保存在当前浏览器，可通过导出／打开 `.score.json` 文件交换作品。不同网址和离线文件的作品不会自动同步。

## 发布到 GitHub Pages

将本目录中的文件上传到仓库根目录，确保 `index.html` 位于根目录。

进入仓库 **Settings → Pages**，将 Source 设置为 **Deploy from a branch**，Branch 设置为 **main**，目录设置为 **/(root)**，点击 **Save**。发布完成后，该页面会提供 **Visit site** 按钮和直接使用的网址。

官方文档：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 代码

- `core.js`：音乐数据、节拍与时长计算、输入验证、播放路线。
- `app.js`：谱面绘制、编辑交互、悬停菜单与钢琴播放。
- `index.html`、`style.css`：页面与样式。
- `samples.js`：嵌入的钢琴采样，无需外部音频服务。
- `test-core.cjs`：使用 Node.js 执行 `node test-core.cjs` 可运行核心测试。

## 素材授权

钢琴采样：Salamander Grand Piano，Alexander Holm，CC BY 3.0。采样源自 Tone.js 分发版本。
原作者：https://rytmenpinne.wordpress.com/sounds-and-such/salamander-grandpiano/
许可：https://creativecommons.org/licenses/by/3.0/

字体：Bravura，Steinberg，SIL OFL 1.1。许可全文见 `Bravura-LICENSE.txt`。
