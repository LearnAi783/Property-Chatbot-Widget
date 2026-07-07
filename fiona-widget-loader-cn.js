/* ============================================================================
   FIONA 聊天机器人组件 — CN 站 — 独立外部加载器 (STANDALONE EXTERNAL LOADER)
   ============================================================================
   由 carrd-site-cn/chatbot-widget-cn.html 打包而成，使该组件可作为外部静态
   文件（GitHub Pages）托管，而不是直接粘贴进 Carrd 的 Embed -> Code 元素。

   为什么需要这个文件 (WHY THIS FILE EXISTS): Carrd 的 Embed -> Code 元素有
   硬性的 16,384 字符上限（经 Carrd 社区版主确认，用户已验证）。本组件自身
   的 HTML/CSS/JS 内容（chatbot-widget-cn.html 的 <body> 内部内容：style +
   markup + script，已去除 doctype/head/body 外壳）与 EN 版本 (56,137 字符
   原始 / 45,365 字符压缩后) 结构近乎一致 —— 同一段头像 base64、同一套 CSS、
   同一套 JS 结构，仅界面文案与预算档位显示为中文，1,112 行 vs EN 版
   1,123 行 —— 因此几乎可以肯定同样远超 16,384 字符限制。这与 EN 站遇到
   的问题完全一致，需要相同的架构修复，而不是简单压缩。

   解决方案 (THE FIX): 将本文件的实际内容托管在外部静态站点（GitHub
   Pages），只在 Carrd 的 Embed -> Code -> Inline 元素中粘贴一个极小小的
   loader `<script src="https://<username>.github.io/<repo>/
   fiona-widget-loader-cn.js"></script>` 标签 —— 与真实可嵌入聊天组件
   （Intercom、Drift、Crisp）采用的模式相同。完整写法与手动部署步骤见
   docs/10-carrd-rebuild-guide.md §2.1 及其 CN 跟进小节。

   仅为打包方式变更，逻辑完全不变 (PACKAGING CHANGE ONLY — NOT A LOGIC
   CHANGE)。下方每一个函数、payload 结构、UI 流程都与
   chatbot-widget-cn.html 的 <style>/<body markup>/<script> 内容完全相同。
   为使其可作为独立外部文件运行，唯一改动的是：

     1. CSS（原本是一个 <style> 块）现在在运行时通过动态创建的 <style>
        元素注入到 <head> 中。
     2. 聊天气泡/聊天窗口的 HTML（原本是 <body> 中的原始 markup）现在在
        运行时通过 insertAdjacentHTML 注入到 <body> 中。
     3. 整体被包裹在一个 IIFE 中，避免向页面全局作用域泄漏变量（Carrd
        页面本身及其他 embed 共享同一个全局作用域；原文件的内联
        <script> 直接运行在全局作用域，因此之前不需要这一步）。由于
        markup 中的 onclick="openChat()" / onclick="closeChat()" /
        onclick="event.stopPropagation();hideLabel()" / onclick="send()"
        属性触发时会在*全局*作用域中解析标识符，本文件在下方
        initFionaWidget() 末尾显式地将这四个同名函数重新暴露到
        `window` 上，让未改动的 markup 继续正常工作。除此之外没有暴露
        任何原本不是全局的内容（window.fionaOpenChat 在原脚本中本来就是
        显式的全局赋值，无需改动）。
     4. Markup 会在头像配置、事件监听器等任何初始化代码运行*之前*同步
        注入完成——见下方 injectAndInit()/initFionaWidget()。这样就不用
        依赖再次触发 'DOMContentLoaded'：本文件在执行时如果 <body> 已经
        存在（正常情况，因为 Carrd 会把这个 loader 的 <script> 标签内联
        放在 body 的文档流中），会立即执行注入；只有在 <body> 确实还不
        存在时，才回退为等待 'DOMContentLoaded'。

   聊天流程、预约流程、会话处理、webhook 地址、`fiona:segment`
   CustomEvent 派发逻辑均未作任何改动。

   ── 头像 base64 完整性说明 (AVATAR INTEGRITY NOTE) ──────────────────────
   EN 版加载器打包时曾发生过一次真实的 bug：avatarUrl 的 base64 payload
   在"HTML → loader脚本"转换过程中被静默丢失了 2 个字符，导致 base64
   长度不再是 4 的倍数、无法正确解码为图片——问题只在页面上表现为头像图
   加载失败（不是脚本报错），直到用户从视觉上发现头像损坏才被察觉。为
   避免本文件重蹈覆辙，下方 WIDGET_CONFIG.avatarUrl 中的 base64 payload
   是从 carrd-site-cn/chatbot-widget-cn.html 源文件逐字符复制而来，未经
   任何手工重新输入或压缩处理；随后使用 Edit 工具的"精确字符串匹配"
   机制作为验证手段（该工具只有在字符串完全一致时才会成功匹配/替换），
   确认本文件中的完整 base64 字符串与源文件中的字符串——以及与
   carrd-site-en/fiona-widget-loader.js 中已确认修复有效的 avatarUrl
   字符串——三者逐字符完全一致（本会话没有可用的 Bash/代码执行工具来
   运行独立的解码脚本，因此采用了这一基于工具本身精确匹配保证的验证
   方式，而不是凭肉眼比对——具体验证记录见
   docs/10-carrd-rebuild-guide.md §2.1 CN 跟进小节）。
   ============================================================================ */
(function () {
  "use strict";

  /* ============================================================
     1. CSS — 与 chatbot-widget-cn.html 的 <style> 块逐字一致
     ============================================================ */
  var FIONA_WIDGET_CSS = `
/* ============================================================
🎛️ AVATAR CONFIG
============================================================ */
:root {
--avatar-size: 55px;
--avatar-shape: 50%;
--avatar-position: center top;
--avatar-zoom: 100%;
--avatar-border: 2px solid #ffffff;
--avatar-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

/* body styles removed for embed compatibility */

/* ── FLOAT BUTTON ─────────────────────────────────────────── */
.chat-toggle {
position: fixed; bottom: 30px; right: 30px;
width: 60px; height: 60px;
background: #ffffff !important; border-radius: 50%;
color: #16213e !important; display: flex; align-items: center;
justify-content: center; cursor: pointer;
text-decoration: none !important;
font-size: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
overflow: hidden;
animation: bubbleAttention 3s ease-in-out 1.5s infinite;
z-index: 9998;
}
.chat-toggle:hover {
transform: scale(1.1);
animation: none;
}
.chat-toggle img {
position: absolute;
top: 0; left: 0;
width: 100%; height: 100%;
object-fit: cover;
object-position: center 20%;
display: block;
}

@keyframes bubbleAttention {
0%   { transform: scale(1);    box-shadow: 0 4px 15px rgba(0,0,0,0.25); }
10%  { transform: scale(1.12); box-shadow: 0 6px 20px rgba(0,0,0,0.35); }
20%  { transform: scale(1);    box-shadow: 0 4px 15px rgba(0,0,0,0.25); }
30%  { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,0.35); }
40%  { transform: scale(1);    box-shadow: 0 4px 15px rgba(0,0,0,0.25); }
100% { transform: scale(1);    box-shadow: 0 4px 15px rgba(0,0,0,0.25); }
}

.chat-toggle::after {
content: '';
position: absolute;
width: 100%; height: 100%;
border-radius: 50%;
border: 3px solid rgba(0,0,0,0.2);
animation: ripple 3s ease-out 1.5s infinite;
pointer-events: none;
}
@keyframes ripple {
0%   { transform: scale(1);   opacity: 0.8; }
40%  { transform: scale(1.6); opacity: 0; }
100% { transform: scale(1.6); opacity: 0; }
}

/* ── CHAT BOX ─────────────────────────────────────────────── */
.chat-container {
position: fixed; bottom: 100px; right: 30px;
width: 360px; height: 620px;
background: #fff; border-radius: 20px;
display: none; flex-direction: column;
overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.2);
z-index: 9999;
}
@media (max-width: 600px) {
.chat-container {
  width: 100%; height: 100%;
  bottom: 0; right: 0;
  border-radius: 0;
  position: fixed;
  top: 0; left: 0;
  background: #fff !important;
}
.header {
  background: #fff !important;
}
.chatbox {
  background: #fafafa !important;
}
.input-bar {
  background: #fff !important;
}
}

/* ── HEADER ───────────────────────────────────────────────── */
.header {
display: flex; align-items: center;
padding: 14px; border-bottom: 1px solid #eee;
gap: 12px; position: relative;
background: #fff;
flex-shrink: 0;
}
.avatar-wrap {
width: var(--avatar-size); height: var(--avatar-size);
border-radius: var(--avatar-shape);
border: var(--avatar-border); box-shadow: var(--avatar-shadow);
flex-shrink: 0; overflow: hidden; position: relative;
}
.avatar-wrap img {
position: absolute; top: 0; left: 0;
width: 100%; height: 100%;
object-fit: cover;
object-position: center 20%;
display: block;
transform: scale(1);
transform-origin: center 20%;
}
.name { font-size: 16px; font-weight: bold; color: #111 !important; }
.status { font-size: 13px; color: #444 !important; display: flex; align-items: center; }
.status::before {
content: ''; width: 8px; height: 8px;
background: #00c853; border-radius: 50%;
margin-right: 5px; animation: pulse 1.5s infinite;
}
@keyframes pulse {
0% { transform: scale(1); opacity: 1; }
70% { transform: scale(1.6); opacity: 0.3; }
100% { transform: scale(1); opacity: 1; }
}

/* ── CLOSE BUTTON ─────────────────────────────────────────── */
.close {
position: absolute;
right: 12px; top: 50%; transform: translateY(-50%);
cursor: pointer;
width: 36px; height: 36px;
display: flex; align-items: center; justify-content: center;
background: #f0f0f0;
border-radius: 50%;
font-size: 18px;
color: #555;
transition: background 0.15s, color 0.15s;
flex-shrink: 0;
z-index: 10;
-webkit-tap-highlight-color: transparent;
}
.close:hover, .close:active { background: #e0e0e0; color: #111; }

/* ── CHATBOX ──────────────────────────────────────────────── */
.chatbox {
flex: 1; padding: 15px;
overflow-y: auto; background: #fafafa;
-webkit-overflow-scrolling: touch;
overscroll-behavior: contain;
}

/* ── MESSAGES ─────────────────────────────────────────────── */
.msg {
max-width: 78%; padding: 10px 14px;
border-radius: 16px; margin: 6px 0;
word-wrap: break-word; line-height: 1.45;
text-align: left !important;
}
.user { background: #0A84FF !important; color: #ffffff !important; margin-left: auto; }
.bot { background: #e5e5ea !important; color: #222 !important; }

/* ── QUICK REPLY BUTTONS ──────────────────────────────────── */
.button-row {
display: flex; flex-wrap: wrap; gap: 8px;
margin: 6px 0 10px 0;
}
.quick-reply {
padding: 8px 16px;
border: 2px solid #0A84FF !important;
border-radius: 20px;
background: white !important;
color: #0A84FF !important;
font-size: 14px;
font-weight: 600;
cursor: pointer;
transition: 0.15s;
text-decoration: none !important;
}
.quick-reply:hover {
background: #0A84FF !important;
color: #ffffff !important;
}

/* ── TYPING INDICATOR ─────────────────────────────────────── */
.typing-indicator {
display: inline-flex; align-items: center; gap: 4px;
background: #e5e5ea; padding: 12px 16px;
border-radius: 16px; margin: 6px 0; width: fit-content;
}
.typing-indicator span {
width: 7px; height: 7px; background: #8e8e93;
border-radius: 50%; animation: typingBounce 1.2s infinite ease-in-out;
}
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typingBounce {
0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
30% { transform: translateY(-5px); opacity: 1; }
}

/* ── INPUT AREA ───────────────────────────────────────────── */
.input-bar {
display: flex; padding: 10px;
border-top: 1px solid #eee; background: #fff;
flex-shrink: 0;
}
textarea {
flex: 1; padding: 10px; border-radius: 20px;
border: 1px solid #ccc; resize: none;
outline: none; font-family: Arial; font-size: 14px;
font-size: max(16px, 14px);
}
textarea:disabled { background: #f5f5f5; cursor: not-allowed; }
.input-bar button {
margin-left: 8px; border-radius: 20px; border: none;
padding: 10px 14px; background: #0A84FF !important; color: #ffffff !important; cursor: pointer;
text-decoration: none !important;
}
.input-bar button:disabled { background: #ccc !important; cursor: not-allowed; }

/* ── BUBBLE TEXT LABEL ────────────────────────────────────── */
.chat-label {
position: fixed; bottom: 102px; right: 20px;
background: #fff !important; color: #222 !important;
padding: 9px 14px 9px 14px;
border-radius: 20px 20px 4px 20px;
font-size: 13px; font-weight: 600;
box-shadow: 0 4px 20px rgba(0,0,0,0.15);
cursor: pointer; display: flex; align-items: center; gap: 8px;
animation: labelIn 0.4s ease-out;
z-index: 9999; white-space: nowrap;
transition: opacity 0.25s;
}
.chat-label:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.2); }
.label-x {
width: 18px; height: 18px; border-radius: 50%;
background: #eee; color: #888; font-size: 10px;
display: flex; align-items: center; justify-content: center;
flex-shrink: 0; transition: 0.15s;
}
.label-x:hover { background: #ddd; color: #333; }
@keyframes labelIn {
from { opacity: 0; transform: translateY(8px); }
to   { opacity: 1; transform: translateY(0); }
}
`;

  /* ============================================================
     2. MARKUP — 与 chatbot-widget-cn.html 的 <body> 内容逐字一致
        (chat-label, chat-toggle, 以及 #chat 聊天窗口 markup)
     ============================================================ */
  var FIONA_WIDGET_MARKUP = `
<!-- BUBBLE TEXT LABEL -->
<div class="chat-label" id="chatLabel" onclick="openChat()">
  <span id="labelText">在线咨询 👋</span>
  <span class="label-x" onclick="event.stopPropagation();hideLabel()">✕</span>
</div>

<!-- FLOAT BUTTON -->
<div class="chat-toggle" onclick="openChat()" title="在线咨询">
  <img id="toggleAvatar" src="" alt="Chat">
</div>

<!-- CHAT WINDOW -->
<div id="chat" class="chat-container">

<div class="header">
<div class="avatar-wrap"><img id="avatarImg" src="" alt="Avatar"></div>
<div>
<div class="name" id="botName">Fiona</div>
<div class="status">在线</div>
</div>
<div class="close" onclick="closeChat()" title="关闭" aria-label="关闭聊天窗口">✕</div>
</div>

<div id="chatbox" class="chatbox"></div>

<div class="input-bar">
<textarea id="msg" rows="1" placeholder="输入您的消息..."></textarea>
<button id="sendBtn" onclick="send()">发送</button>
</div>

</div>
`;

  /* ============================================================
     3. WIDGET LOGIC — 与 chatbot-widget-cn.html 的 <script> 块逐字一致，
        包裹在一个函数中，以便在上方 CSS 和 markup 被注入到实际 DOM 之后
        再调用（见本文件底部的 injectAndInit()）。函数、payload 结构、
        行为均未作任何功能性改动。
     ============================================================ */
  function initFionaWidget() {

/* ============================================================
🎛️ WIDGET CONFIG — 与 brand_assets/chatbot_widget.html 保持一致
============================================================ */
const WIDGET_CONFIG = {
avatarUrl: "data:image/jpeg;base64,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",
botName: "Fiona",
avatarPosition: "50% 20%",
avatarZoom: 100,
bubbleText: "👋您好,我是 Fiona,您的专属AI助手,很高兴为您服务。",
typingEnabled: true,
typingMinDelay: 600,
typingMaxDelay: 3500,
typingCharsPerSecond: 28,
};

/* ============================================================
🔗 N8N WEBHOOK URL — 与EN站相同的固定端点(docs/06-chatbot-flow.md)
============================================================ */
const N8N_WEBHOOK_URL = "https://152.42.168.17.nip.io/webhook/aeaa38d0-75ec-4ab9-aeb3-b327b582e709/chat";

/* ============================================================
🔗 预约与会话网关 URL（BOOKING & SESSION GATEWAY）—— 新的独立 n8n 工作流，
按 docs/08-booking-flow.md §3（ARCHITECTURE NOTE）。与上方 N8N_WEBHOOK_URL
是不同的端点，后者保持仅聊天用途、不做改动。此网关处理三种 action：
logSession / getAvailableSlots / confirmBooking（具体payload格式见该文档
"Widget integration note" 一节）。
============================================================ */
const BOOKING_GATEWAY_URL = "https://152.42.168.17.nip.io/webhook/booking-gateway";

/* ============================================================
LANGUAGE / SITE CONSTANT — 这是中文站组件。
按 docs/07-sheets-schema.md,`language_site` 不询问用户 —— 由所嵌入的站点
决定,此处硬编码。
============================================================ */
const LANGUAGE_SITE = "CN";

/* ============================================================
STATE — 字段名与 docs/07-sheets-schema.md 完全一致,
以便未来 n8n 写入表格逻辑（Phase 3）无需重新映射字段名。
============================================================ */
let segment_intent = "unknown";   // buyer | investor | tenant | unknown
let segment_origin = "unknown";   // local | international | unknown
let segment_country = "";         // China | Taiwan | Japan | Europe | Other | ""
let budget_range = "Not stated";  // 规范简写档位标签,如 "RM 1M-3M"（与EN站
                                   // 保持同一套英文简写值,便于跨站统计口径
                                   // 一致；按钮显示文案使用中文，见下方）
let booking_requested = false;
let budgetFull = "";              // 完整数字区间字符串，仅用于生成汇总句子

/* ============================================================
预约子流程状态（BOOKING SUB-FLOW STATE）—— 按 docs/08-booking-flow.md §1/§3
新增，接入 BOOKING_GATEWAY_URL。字段名与 docs/07-sheets-schema.md 完全一致。
============================================================ */
let name = "";                        // 客户姓名，预约子流程中采集
let contact_phone = "";
let contact_email = "";
let contact_whatsapp = "";
let contact_preferred_channel = "none"; // 'phone' | 'whatsapp' | 'email' | 'none'
let booking_type = null;              // 'in_person' | 'virtual' | null（尚未选择）
let booking_slot_datetime = null;     // 所选时段的 ISO 8601 字符串，或 null
let conversation_summary = "";        // 预约前的自由文本回答，复用既有schema字段

// 已知缺口（按要求标记，非编造）：本组件目前没有客户端机制来记录客户
// 具体在讨论哪一套房源（按 docs/06-chatbot-flow.md §3，这一关联目前仅存在
// 于服务端AI智能体的上下文中）。此处留空字符串，方便下方confirmBooking/
// logSession的payload构建逻辑在字段未知时直接省略，待未来补丁接入
// 客户端房源追踪后再填充。
let property_interest_name = "";
let property_interest_url = "";

// 预约流程状态机：null = 自由文本照常发给Fiona；否则下一次send()调用会
// 回答这个具体的预约问题，而不会转发给AI智能体（见下方send()）。
let bookingFlowStep = null; // null | 'awaiting_name' | 'awaiting_contact_detail' | 'awaiting_precommitment'

/* Session 持久化：原始组件在每次页面加载时都会重新生成 sessionId
   (docs/06-chatbot-flow.md §5.3 已标记为缺陷 —— 访客刷新或返回会话时，
   在"每session一行"的记录方式下会被误判为第二条/重复线索)。这里改为
   写入 localStorage 持久化，只有在没有已存储值时才生成新ID。 */
let sessionId;
try {
  sessionId = localStorage.getItem('fiona_session_id');
  if (!sessionId) {
    sessionId = 'fiona-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('fiona_session_id', sessionId);
  }
} catch (e) {
  sessionId = 'fiona-' + Math.random().toString(36).substr(2, 9);
}

/* ── Apply config ─────────────────────────────────────────── */
document.documentElement.style.setProperty('--avatar-position', WIDGET_CONFIG.avatarPosition);
document.documentElement.style.setProperty('--avatar-zoom', WIDGET_CONFIG.avatarZoom + '%');
document.getElementById('avatarImg').src = WIDGET_CONFIG.avatarUrl;
document.getElementById('toggleAvatar').src = WIDGET_CONFIG.avatarUrl;
document.getElementById('botName').innerText = WIDGET_CONFIG.botName;

var _pos  = WIDGET_CONFIG.avatarPosition || 'center 20%';
var _zoom = (WIDGET_CONFIG.avatarZoom || 100) / 100;
var _tImg = document.getElementById('toggleAvatar');
_tImg.style.objectPosition  = _pos;
_tImg.style.transform       = 'scale(' + _zoom + ')';
_tImg.style.transformOrigin = _pos;
var _hImg = document.getElementById('avatarImg');
_hImg.style.objectPosition  = _pos;
_hImg.style.transform       = 'scale(' + _zoom + ')';
_hImg.style.transformOrigin = _pos;

if (WIDGET_CONFIG.bubbleText) {
  var lt = document.getElementById('labelText');
  if (lt) lt.textContent = WIDGET_CONFIG.bubbleText;
} else {
  hideLabel();
}

/* ── Open / Close (iOS 滚动锁定逻辑，与原组件一致) ─────────── */
var _scrollLockY = 0;
function isMobileWidth() { return window.matchMedia('(max-width: 600px)').matches; }
function lockBodyScroll() {
  _scrollLockY = window.scrollY || window.pageYOffset || 0;
  document.body.style.position = 'fixed';
  document.body.style.top = '-' + _scrollLockY + 'px';
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
}
function unlockBodyScroll() {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  window.scrollTo(0, _scrollLockY);
}
function openChat() {
  document.getElementById('chat').style.display = 'flex';
  document.querySelector('.chat-toggle').style.animation = 'none';
  hideLabel();
  if (isMobileWidth()) lockBodyScroll();
}
function hideLabel() {
  const el = document.getElementById('chatLabel');
  if (el) { el.style.opacity = '0'; setTimeout(() => el && el.remove(), 260); }
}
function closeChat() {
  document.getElementById('chat').style.display = 'none';
  if (isMobileWidth()) unlockBodyScroll();
}
// 暴露到全局，供主页面的"开始了解"按钮直接调用打开聊天窗口
window.fionaOpenChat = openChat;

/* ── Make URLs in bot messages clickable ─────────────────── */
function linkify(text) {
const safe = text
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/\n/g, '<br>');
return safe.replace(
/(https?:\/\/[^\s<]+)/g,
'<a href="$1" target="_blank" rel="noopener" style="color:#0055cc;word-break:break-all;">$1</a>'
);
}

function addMessage(text, type) {
const chat = document.getElementById('chatbox');
const msg = document.createElement('div');
msg.classList.add('msg', type);
if (type === 'bot') {
msg.innerHTML = linkify(text);
} else {
msg.innerText = text;
}
chat.appendChild(msg);
chat.scrollTop = chat.scrollHeight;
}

function showButtons(promptText, buttons, callback) {
if (promptText) addMessage(promptText, 'bot');

const chat = document.getElementById('chatbox');
const row = document.createElement('div');
row.className = 'button-row';

buttons.forEach(btn => {
const b = document.createElement('button');
b.className = 'quick-reply';
b.textContent = btn.label;
b.onclick = () => {
row.remove();
callback(btn.value, btn.label);
};
row.appendChild(b);
});

chat.appendChild(row);
chat.scrollTop = chat.scrollHeight;
}

function showTyping() {
const chat = document.getElementById('chatbox');
const el = document.createElement('div');
el.id = 'typingIndicator';
el.className = 'typing-indicator';
el.innerHTML = '<span></span><span></span><span></span>';
chat.appendChild(el);
chat.scrollTop = chat.scrollHeight;
}
function hideTyping() {
const el = document.getElementById('typingIndicator');
if (el) el.remove();
}
function getTypingDelay(text) {
if (!WIDGET_CONFIG.typingEnabled) return 0;
const est = (text.length / WIDGET_CONFIG.typingCharsPerSecond) * 1000;
return Math.min(WIDGET_CONFIG.typingMaxDelay, Math.max(WIDGET_CONFIG.typingMinDelay, est));
}
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── Core fetch to n8n ───────────────────────────────────────
   body 结构中 `action`/`sessionId`/`chatInput` 与原组件保持不变
   （按 Manager 指示，不猜测/修改 n8n 内部逻辑）。追加的字段
   （language_site/segment_intent/segment_origin/segment_country/
   budget_range/booking_requested）为新增字段，字段名完全采用
   docs/07-sheets-schema.md 的规范命名 —— 以便未来n8n工作流接入
   表格写入逻辑（Phase 3，尚未构建）时无需重新对齐字段名。已标记
   给 Manager：请确认现有 n8n webhook 节点能容忍/忽略多余的JSON
   字段（大多数webhook触发器的标准行为，但此处未经过n8n内部验证）。 ── */
async function sendToBot(text) {
showTyping();
const t0 = Date.now();

try {
const res = await fetch(N8N_WEBHOOK_URL, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
  action: 'sendMessage',
  sessionId,
  chatInput: text,
  language_site: LANGUAGE_SITE,
  segment_intent,
  segment_origin,
  segment_country,
  budget_range,
  booking_requested
})
});

const data = await res.json();
const reply = data.output || (data[0]?.output) || '抱歉，暂时无法获取回复。';

const remaining = getTypingDelay(reply) - (Date.now() - t0);
if (remaining > 0) await wait(remaining);

hideTyping();
addMessage(reply, 'bot');
} catch (e) {
hideTyping();
addMessage('⚠️ 暂时无法连接服务器，请确认 n8n 工作流是否正常运行。', 'bot');
}
}

/* ============================================================
分流个性化桥接（SEGMENT PERSONALIZATION BRIDGE）
============================================================
Carrd 本身不支持原生条件显示逻辑，因此按 Manager 建议的变通方案，使用
聊天机器人本身作为分流引擎：Q4完成后，本组件通过 CustomEvent +
localStorage 发布分流结果，页面其余部分（carrd-site-cn/index.html）据此
切换匹配的标题/服务重点/视频内容。此机制仅在本文件以"同DOM的Embed
Code"方式嵌入时有效，若被包裹进沙盒iframe则会失效 —— 见文件顶部部署
说明。
============================================================ */
function publishSegment() {
  const detail = {
    intent: segment_intent,
    origin: segment_origin,
    country: segment_country,
    budget: budget_range
  };
  try { localStorage.setItem('fiona_segment', JSON.stringify(detail)); } catch (e) {}
  window.fionaSegment = detail;
  window.dispatchEvent(new CustomEvent('fiona:segment', { detail }));
}

/* ============================================================
Q1 — 意图（替代原有的买/租两按钮步骤）
============================================================ */
function askIntent() {
  addMessage(
    `您好 👋 我是${WIDGET_CONFIG.botName}，您的吉隆坡房产助手！请问您现在是...`,
    'bot'
  );
  showButtons(null, [
    { label: '🏠 自住买房', value: 'buyer' },
    { label: '📈 投资买房', value: 'investor' },
    { label: '🔑 租房', value: 'tenant' }
  ], handleIntentSelection);
}

function handleIntentSelection(value, label) {
  segment_intent = value;
  addMessage(label, 'user');
  setTimeout(askOrigin, 400);
}

/* ============================================================
Q2 — 所在地
============================================================ */
function askOrigin() {
  showButtons("好的！请问您目前人在马来西亚吗？", [
    { label: '是，我在马来西亚', value: 'local' },
    { label: '不是，我在海外', value: 'international' }
  ], handleOriginSelection);
}

function handleOriginSelection(value, label) {
  segment_origin = value;
  addMessage(label, 'user');
  if (value === 'international') {
    setTimeout(askCountry, 400);
  } else {
    segment_country = '';
    setTimeout(askBudget, 400);
  }
}

/* ============================================================
Q3 — 国家/地区（仅当 Q2 = 海外时询问）
============================================================ */
function askCountry() {
  showButtons(
    "请问您目前所在的国家/地区是？这样我可以为您提供更贴合当地情况的流程与法律资讯。",
    [
      { label: '中国', value: 'China' },
      { label: '中国台湾', value: 'Taiwan' },
      { label: '日本', value: 'Japan' },
      { label: '欧洲', value: 'Europe' },
      { label: '其他', value: 'Other' }
    ],
    handleCountrySelection
  );
}

function handleCountrySelection(value, label) {
  segment_country = value;
  addMessage(label, 'user');
  setTimeout(askBudget, 400);
}

/* ============================================================
Q4 — 预算
自住买家/投资客共用 RM100万–800万 档位（Manager决定：取消原有的
RM50万–100万档位，因低于简报设定的RM100万–800万区间）。租客维持原有
RM3千–1.2万/月档位不变。

按钮显示文案使用中文数字格式，便于阅读；但存入 budget_range 的规范值
（value）与EN站使用同一套英文简写（如 "RM 1M–3M"），确保两站统计口径
一致，符合 docs/07-sheets-schema.md 对该字段的定义。
============================================================ */
function askBudget() {
  const isTenant = segment_intent === 'tenant';
  const budgetOptions = isTenant
    ? [
        { label: 'RM 3千–5千/月', value: 'RM 3K–5K/mo', full: 'RM 3,000 – RM 5,000 /月' },
        { label: 'RM 5千–8千/月', value: 'RM 5K–8K/mo', full: 'RM 5,000 – RM 8,000 /月' },
        { label: 'RM 8千–1.2万/月', value: 'RM 8K–12K/mo', full: 'RM 8,000 – RM 12,000 /月' }
      ]
    : [
        { label: 'RM 100万–300万', value: 'RM 1M–3M', full: 'RM 1,000,000 – RM 3,000,000' },
        { label: 'RM 300万–500万', value: 'RM 3M–5M', full: 'RM 3,000,000 – RM 5,000,000' },
        { label: 'RM 500万–800万', value: 'RM 5M–8M', full: 'RM 5,000,000 – RM 8,000,000' }
      ];

  const chat = document.getElementById('chatbox');
  addMessage("请问您的预算范围大概是？", 'bot');
  const row = document.createElement('div');
  row.className = 'button-row';
  budgetOptions.forEach(opt => {
    const b = document.createElement('button');
    b.className = 'quick-reply';
    b.textContent = opt.label;
    b.onclick = () => {
      row.remove();
      handleBudgetSelection(opt);
    };
    row.appendChild(b);
  });
  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
}

function handleBudgetSelection(opt) {
  budget_range = opt.value;
  budgetFull = opt.full;
  addMessage(opt.label, 'user');
  document.getElementById('msg').focus();

  publishSegment();

  const summary = buildSummarySentence();
  setTimeout(() => {
    sendToBot(summary).then(() => {
      setTimeout(renderPostRouting, 300);
    });
  }, 300);
}

function buildSummarySentence() {
  const intentPhrase = {
    buyer: '自住买房',
    investor: '投资出租',
    tenant: '租房'
  }[segment_intent];

  if (segment_origin === 'local') {
    return `我目前人在马来西亚，想在吉隆坡${intentPhrase}，预算是 ${budgetFull}。`;
  }
  const countryLabelMap = { China:'中国', Taiwan:'中国台湾', Japan:'日本', Europe:'欧洲', Other:'海外' };
  const countryLabel = countryLabelMap[segment_country] || '海外';
  return `我目前在${countryLabel}，想在吉隆坡${intentPhrase}，预算是 ${budgetFull}。`;
}

/* ============================================================
分流后行为（POST-ROUTING BEHAVIOR，docs/06-chatbot-flow.md §2）
以客户端确定性方式渲染，而非依赖n8n智能体的自由文本回复恰好命中这个结构
（该智能体的系统提示词/行为对前端不透明 —— 见docs/06 §5 未决问题1）。
上方合成的汇总句子仍会照常发送给n8n，让智能体获得完整上下文并可补充
自己的自由文本回复（会先展示）；本模块是叠加显示，不是替代 —— 确保无论
AI实际回复是否精准，转化漏斗都能稳定展示正确的服务重点与下一步按钮。

服务文案逐字引用自 docs/03-messaging-cn.md §5 —— 未做任何编造。
============================================================ */
function renderPostRouting() {
  const originLabelMap = { China:'中国', Taiwan:'中国台湾', Japan:'日本', Europe:'欧洲', Other:'海外' };
  const originLabel = segment_origin === 'local' ? '马来西亚' : (originLabelMap[segment_country] || '海外');
  const intentAckPhrase = {
    buyer: '自住买房',
    investor: '投资出租',
    tenant: '租房'
  }[segment_intent];

  addMessage(
    `明白了！您想在吉隆坡${intentAckPhrase}，目前在${originLabel}，预算 ${budget_range}。`,
    'bot'
  );

  let offerText, ctaLabel;
  if (segment_intent === 'buyer') {
    offerText = "为您推荐：免费、无义务的一对一咨询，梳理您的预算、必要条件，并给出满家乐房源清单——省去花一整个周末看不合适房子的时间。";
    ctaLabel = '预约免费咨询';
  } else if (segment_intent === 'investor') {
    offerText = "为您推荐：专属租金回报分析——针对您目标购房价位，提供满家乐当前真实可比租赁房源的对比分析，让您在出手前就了解真实的回报率区间。";
    ctaLabel = '获取租金回报分析';
  } else {
    offerText = "为您推荐：告诉我您的必要条件与入住时间，我可以为您匹配真实、当前在租的满家乐单位，并直接确认看房时间。";
    ctaLabel = '预约看房';
  }
  addMessage(offerText, 'bot');

  if (segment_origin === 'international') {
    const trustLine = {
      buyer: "外国人购房门槛、远程看房、签约流程——每一步都讲清楚，再决定是否汇款。",
      investor: "租金回报、租客需求、无需亲自打理的托管服务——为无法亲身实地考察的买家讲清楚每一步。",
      tenant: "视频实地看房、实时视频通话看房，加上20年本地租赁经验——确保您落地前，租约已签好，钥匙已备妥。"
    }[segment_intent];
    addMessage(trustLine, 'bot');
  }

  window._fionaCtaLabel = ctaLabel;

  showButtons(null, [
    { label: '💬 咨询具体房源', value: 'ask_property' },
    { label: '📅 预约看房/咨询', value: 'book' }
  ], handlePostRoutingChoice);
}

function handlePostRoutingChoice(value, label) {
  addMessage(label, 'user');
  document.getElementById('msg').focus();
  if (value === 'book') {
    startBookingFlow();
  } else {
    addMessage(
      "当然可以——请直接告诉我房源名称、价格区间或地区（例如 Kiaramas Danai，或月租RM6,000左右的单位），我来为您匹配。",
      'bot'
    );
  }
}

/* ============================================================
预约子流程（BOOKING SUB-FLOW）—— 入口A（聊天机器人时段选择器），按
docs/08-booking-flow.md §1 及其 §3 "Widget integration note" 的确切payload
格式。两个触发点都汇入此处："📅 预约看房/咨询" 快速回复按钮（见上方
handlePostRoutingChoice）与下方send()中的自由文本预约意图识别——按
docs/06-chatbot-flow.md §4，二者是同一个交接点。
============================================================ */

/* ── Fire-and-forget的logSession调用——按docs/08-booking-flow.md §3
   Branch A / widget integration note：不等待、不阻塞界面，任何失败都会被
   捕获并静默忽略。仅发送目前已知的字段子集（未知字段直接省略，遵循该
   说明中"partial-row upserts"的约定）。 ── */
function fireLogSession() {
  const payload = {
    action: 'logSession',
    session_id: sessionId,
    language_site: LANGUAGE_SITE,
    booking_requested
  };
  if (segment_intent && segment_intent !== 'unknown') payload.segment_intent = segment_intent;
  if (segment_origin && segment_origin !== 'unknown') payload.segment_origin = segment_origin;
  if (segment_country) payload.segment_country = segment_country;
  if (budget_range && budget_range !== 'Not stated') payload.budget_range = budget_range;
  if (name) payload.name = name;
  if (contact_phone) payload.contact_phone = contact_phone;
  if (contact_email) payload.contact_email = contact_email;
  if (contact_whatsapp) payload.contact_whatsapp = contact_whatsapp;
  if (contact_preferred_channel && contact_preferred_channel !== 'none') payload.contact_preferred_channel = contact_preferred_channel;
  if (booking_type) payload.booking_type = booking_type;
  if (booking_slot_datetime) payload.booking_slot_datetime = booking_slot_datetime;
  if (conversation_summary) payload.conversation_summary = conversation_summary;

  fetch(BOOKING_GATEWAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => { /* fire-and-forget：故意忽略失败 */ });
}

/* ── 步骤3：启动预约子流程 ── */
function startBookingFlow() {
  booking_requested = true;
  fireLogSession(); // 按docs/08 §3 widget-integration note："booking_requested 变为TRUE的那一刻"

  if (segment_origin === 'international') {
    // 按docs/08-booking-flow.md §2 point 4：海外客户仅可自助预约视频咨询；
    // 实地看房需在确认行程后由董春琳(Dion)直接安排。
    booking_type = 'virtual';
    addMessage(
      "由于您在海外，我们先为您安排视频咨询——实地看房会在您确认行程后由董春琳(Dion)直接为您安排。",
      'bot'
    );
    fetchAndShowSlots();
  } else {
    showButtons(
      "您希望安排实地看房，还是视频咨询？",
      [
        { label: '🏠 实地看房', value: 'in_person' },
        { label: '💻 视频咨询', value: 'virtual' }
      ],
      handleBookingTypeChoice
    );
  }
}

function handleBookingTypeChoice(value, label) {
  addMessage(label, 'user');
  booking_type = value;
  fetchAndShowSlots();
}

/* ── 步骤4：获取并展示可预约时段 ── */
async function fetchAndShowSlots() {
  showTyping();
  const t0 = Date.now();
  let slots = [];
  let networkError = false;

  try {
    const res = await fetch(BOOKING_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getAvailableSlots',
        session_id: sessionId,
        booking_type,
        property_interest_url: property_interest_url || ''
      })
    });
    const data = await res.json();
    slots = data.slots || [];
  } catch (e) {
    networkError = true;
  }

  const whatsappFallback = "https://wa.me/60102287686"; // 与页脚已使用的WhatsApp号码一致
  let bodyText;
  if (networkError) {
    bodyText = "⚠️ 暂时无法连接预约系统，请稍后再试，或直接WhatsApp联系董春琳：" + whatsappFallback;
  } else if (!slots.length) {
    // 按任务规格：未来7天窗口是固定的后端限制（docs/08-booking-flow.md §3
    // Branch B），前端没有"扩大查询范围"的机制可提供——这里如实告知，
    // 并引导至WhatsApp。
    bodyText = "很抱歉，未来7天的时段都已约满。最简单的办法是直接WhatsApp联系董春琳，他会为您另找时间：" + whatsappFallback;
  } else {
    bodyText = "以下是最近可预约的时段——点选一个合适的时间：";
  }

  const remaining = getTypingDelay(bodyText) - (Date.now() - t0);
  if (remaining > 0) await wait(remaining);
  hideTyping();

  if (networkError || !slots.length) {
    addMessage(bodyText, 'bot');
    return;
  }

  // 已知后端限制，按要求标记而非用前端逻辑掩盖：网关的getAvailableSlots
  // 分支固定查询未来7天，没有前端可控的日期范围扩展机制——这里不会
  // 伪造一个"查看更多/扩大范围"的按钮。
  window._fionaSlotMap = window._fionaSlotMap || {};
  slots.forEach(s => { window._fionaSlotMap[s.iso] = s.label; });

  showButtons(
    bodyText,
    slots.map(s => ({ label: s.label, value: s.iso })),
    handleSlotSelection
  );
}

/* ── 步骤5：选定时段后 -> 轻量级预先确认问题 ── */
function handleSlotSelection(iso, label) {
  addMessage(label, 'user');
  booking_slot_datetime = iso;
  addMessage(
    "在锁定这个时段前，想再确认一下——您最看重这套房源的哪些方面（例如预算上限、必备设施、入住时间）？",
    'bot'
  );
  bookingFlowStep = 'awaiting_precommitment';
}

/* ── 步骤6：只询问尚未掌握的信息 ── */
function advanceBookingFlow() {
  if (!name) {
    addMessage("请问怎么称呼您？", 'bot');
    bookingFlowStep = 'awaiting_name';
    return;
  }
  if (!contact_phone && !contact_email && !contact_whatsapp) {
    showButtons(
      "最方便联系您的方式是？",
      [
        { label: '📱 电话', value: 'phone' },
        { label: '💬 WhatsApp', value: 'whatsapp' },
        { label: '📧 邮箱', value: 'email' }
      ],
      handleContactChannelChoice
    );
    return;
  }
  doConfirmBooking();
}

function handleContactChannelChoice(value, label) {
  addMessage(label, 'user');
  contact_preferred_channel = value;
  const prompts = {
    phone: "方便留一个可以联系到您的电话号码吗？",
    whatsapp: "方便留一个您的WhatsApp号码吗？",
    email: "方便留一个您的邮箱地址吗？"
  };
  addMessage(prompts[value], 'bot');
  bookingFlowStep = 'awaiting_contact_detail';
}

/* ── 步骤7：确认预约 ── */
async function doConfirmBooking() {
  bookingFlowStep = null; // 流程已完成，不再等待自由文本
  showTyping();
  const t0 = Date.now();

  const payload = {
    action: 'confirmBooking',
    session_id: sessionId,
    segment_intent,
    segment_origin,
    segment_country,
    budget_range,
    booking_slot_datetime,
    booking_type
  };
  if (name) payload.name = name;
  if (contact_phone) payload.contact_phone = contact_phone;
  if (contact_email) payload.contact_email = contact_email;
  if (contact_whatsapp) payload.contact_whatsapp = contact_whatsapp;
  if (contact_preferred_channel && contact_preferred_channel !== 'none') payload.contact_preferred_channel = contact_preferred_channel;
  if (property_interest_name) payload.property_interest_name = property_interest_name;
  if (property_interest_url) payload.property_interest_url = property_interest_url;
  if (conversation_summary) payload.conversation_summary = conversation_summary;

  const whatsappFallback = "https://wa.me/60102287686";

  try {
    const res = await fetch(BOOKING_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.status === 'confirmed') {
      const slotLabel = (window._fionaSlotMap && window._fionaSlotMap[data.booking_slot_datetime])
        || data.booking_slot_datetime || booking_slot_datetime;
      const typeLabel = booking_type === 'virtual' ? '视频咨询' : '看房';
      const propLabel = data.property_interest_name || property_interest_name || '您的满家乐房源';
      const replyText = `太好了，您的${typeLabel}预约——${propLabel}——已确认在${slotLabel}。这是您的日历链接：${data.calendar_event_link || ''}`;

      const remaining = getTypingDelay(replyText) - (Date.now() - t0);
      if (remaining > 0) await wait(remaining);
      hideTyping();
      addMessage(replyText, 'bot');

      fireLogSession(); // 按docs/08 §3 widget-integration note："confirmBooking成功后再发一次"
    } else if (data.status === 'slot_taken') {
      const replyText = "不好意思，这个时段刚被别人订走了，我马上为您重新查询可用时间。";
      const remaining = getTypingDelay(replyText) - (Date.now() - t0);
      if (remaining > 0) await wait(remaining);
      hideTyping();
      addMessage(replyText, 'bot');
      fetchAndShowSlots(); // 重新获取最新时段，而不是让用户从头开始整个流程
    } else {
      hideTyping();
      addMessage("抱歉，锁定预约时出现问题。请重试，或直接WhatsApp联系董春琳：" + whatsappFallback, 'bot');
    }
  } catch (e) {
    hideTyping();
    addMessage("⚠️ 暂时无法连接预约系统完成确认。请重试，或直接WhatsApp联系董春琳：" + whatsappFallback, 'bot');
  }
}

/* ── Free-text send（始终可用——按 docs/06 §1，自由文本可随时打断
   快速回复流程——针对本组件其他所有快速回复流程都适用。例外：当预约
   子流程（上方）正在等待某个具体回答时——姓名/联系方式/预先确认问题——
   自由文本会回答那个具体问题，而不会转发给Fiona的AI智能体。
   bookingFlowStep === null 是正常/默认状态。） ─────────────────────── */
async function send() {
const input = document.getElementById('msg');
const text = input.value.trim();
if (!text) return;
addMessage(text, 'user');
input.value = '';
input.style.height = 'auto';

// 预约子流程拦截——见 docs/08-booking-flow.md §1 步骤5-6。
if (bookingFlowStep === 'awaiting_precommitment') {
  conversation_summary = text;
  bookingFlowStep = null;
  advanceBookingFlow();
  return;
}
if (bookingFlowStep === 'awaiting_name') {
  name = text;
  bookingFlowStep = null;
  advanceBookingFlow();
  return;
}
if (bookingFlowStep === 'awaiting_contact_detail') {
  if (contact_preferred_channel === 'phone') contact_phone = text;
  else if (contact_preferred_channel === 'whatsapp') contact_whatsapp = text;
  else if (contact_preferred_channel === 'email') contact_email = text;
  bookingFlowStep = null;
  advanceBookingFlow();
  return;
}

// 轻量级客户端预约意图检测（docs/06-chatbot-flow.md §4 提到的自由文本
// 预约短语）——汇入与快速回复按钮相同的预约子流程（startBookingFlow），
// 而不是把这一轮转发给Fiona的AI智能体。
if (/(预约|看房|咨询时间|什么时候有空|可以约)/.test(text)) {
  startBookingFlow();
  return;
}

await sendToBot(text);
}

document.getElementById('msg').addEventListener('keydown', e => {
if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});

document.getElementById('msg').addEventListener('input', function () {
this.style.height = 'auto';
this.style.height = this.scrollHeight + 'px';
});

/* ── WELCOME on open ─────────────────────────────────────── */
window.onload = () => {
  askIntent();
};

    /* ============================================================
       Expose inline-handler targets on `window` — 见本文件顶部说明第3点。
       上方注入的 markup 仍然使用 onclick="openChat()" / onclick="closeChat()" /
       onclick="event.stopPropagation();hideLabel()" / onclick="send()"，
       与 chatbot-widget-cn.html 中的写法完全一致；内联事件处理属性触发时
       总是在全局对象上解析标识符，因此这四个函数（上面通过
       `function name(){}` 声明，作用域仅限于本 IIFE/initFionaWidget）必须
       重新绑定到 `window` 上，这些未改动的 onclick="" 属性才能继续正常
       工作。window.fionaOpenChat 在原脚本中本来就是显式的全局赋值（见
       上方），无需改动。
       ============================================================ */
    window.openChat = openChat;
    window.closeChat = closeChat;
    window.hideLabel = hideLabel;
    window.send = send;

  } // end initFionaWidget()

  /* ============================================================
     4. INJECT + RUN
     先把 CSS 注入 <head>、markup 注入 <body>，再运行 initFionaWidget()，
     这样其内部每一处 document.getElementById(...) 调用都能找到本文件
     刚刚创建的元素。不依赖等待 'DOMContentLoaded'，除非本脚本执行时
     <body> 确实还没有被解析出来（见文件顶部说明第4点）。
     ============================================================ */
  function injectAndInit() {
    var styleEl = document.createElement('style');
    styleEl.setAttribute('data-fiona-widget', 'css');
    styleEl.appendChild(document.createTextNode(FIONA_WIDGET_CSS));
    document.head.appendChild(styleEl);

    document.body.insertAdjacentHTML('beforeend', FIONA_WIDGET_MARKUP);

    initFionaWidget();
  }

  if (document.body) {
    injectAndInit();
  } else {
    document.addEventListener('DOMContentLoaded', injectAndInit);
  }

})();
