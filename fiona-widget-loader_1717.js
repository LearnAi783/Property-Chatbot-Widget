/* ============================================================================
   FIONA CHATBOT WIDGET — EN SITE — STANDALONE EXTERNAL LOADER
   ============================================================================
   Packaged from carrd-site-en/chatbot-widget-en.html so the widget can be
   hosted as an external static file (GitHub Pages) instead of pasted inline
   into Carrd's Embed -> Code element.

   WHY THIS FILE EXISTS: Carrd's Embed -> Code element has a hard 16,384
   character limit (per a Carrd community moderator, confirmed by the user).
   This widget's own HTML/CSS/JS content (the <body> inner content of
   chatbot-widget-en.html: style + markup + script, doctype/head/body
   wrapper stripped) measures 56,137 characters raw, and still 45,365
   characters after stripping all comments and collapsing whitespace/blank
   lines — 2.8x-3.4x over Carrd's limit either way. Minification alone
   cannot close that gap.

   THE FIX: host this file's actual content externally (GitHub Pages) and
   paste only a tiny loader `<script src="https://<username>.github.io/
   <repo>/fiona-widget-loader.js"></script>` tag into Carrd's Embed -> Code
   -> Inline element — the same pattern real embeddable chat widgets
   (Intercom, Drift, Crisp) use. See docs/10-carrd-rebuild-guide.md §2.1 for
   the full writeup and manual setup steps.

   PACKAGING CHANGE ONLY — NOT A LOGIC CHANGE. Every function, payload
   shape, and UI flow below is identical to chatbot-widget-en.html's
   <style>/<body markup>/<script> content. The only things that changed to
   make this work as a standalone external file:

     1. The CSS (originally a <style> block) is now injected at runtime via
        a dynamically created <style> element appended to <head>.
     2. The chat bubble/window HTML (originally raw markup in <body>) is
        now injected at runtime via insertAdjacentHTML on <body>.
     3. Everything is wrapped in an IIFE so it doesn't leak variables onto
        the global page (Carrd's own page + other embeds share this same
        global scope; the original file's inline <script> ran directly in
        global scope, so nothing needed this before). Because the markup's
        onclick="openChat()" / onclick="closeChat()" /
        onclick="event.stopPropagation();hideLabel()" / onclick="send()"
        attributes resolve identifiers in *global* scope when they fire,
        this file explicitly re-exposes those same four functions on
        `window` at the end of initFionaWidget() below, so the unchanged
        markup keeps working exactly as it did before. Nothing else is
        exposed globally that wasn't already (window.fionaOpenChat was
        already an explicit global assignment in the original script).
     4. Markup is injected synchronously, before any of the widget's setup
        code runs (avatar config, event listeners, etc.) — see
        injectAndInit()/initFionaWidget() below. This avoids depending on
        'DOMContentLoaded' firing again: this script runs its own injection
        immediately if <body> already exists at execution time (the normal
        case, since Carrd places this loader's <script> tag inline within
        the body flow), and only falls back to waiting for
        'DOMContentLoaded' if <body> genuinely doesn't exist yet at the
        moment this file executes.

   Nothing about the chat flow, booking flow, session handling, webhook
   URLs, or the `fiona:segment` CustomEvent dispatch has been altered.
   ============================================================================ */
(function () {
  "use strict";

  /* ============================================================
     1. CSS — verbatim from chatbot-widget-en.html's <style> block
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
     2. MARKUP — verbatim from chatbot-widget-en.html's <body> content
        (chat-label, chat-toggle, and #chat chat window markup)
     ============================================================ */
  var FIONA_WIDGET_MARKUP = `
<!-- BUBBLE TEXT LABEL -->
<div class="chat-label" id="chatLabel" onclick="openChat()">
  <span id="labelText">Chat with us! 👋</span>
  <span class="label-x" onclick="event.stopPropagation();hideLabel()">✕</span>
</div>

<!-- FLOAT BUTTON -->
<div class="chat-toggle" onclick="openChat()" title="Chat with us">
  <img id="toggleAvatar" src="" alt="Chat">
</div>

<!-- CHAT WINDOW -->
<div id="chat" class="chat-container">

<div class="header">
<div class="avatar-wrap"><img id="avatarImg" src="" alt="Avatar"></div>
<div>
<div class="name" id="botName">Fiona</div>
<div class="status">Online</div>
</div>
<div class="close" onclick="closeChat()" title="Close chat" aria-label="Close chat">✕</div>
</div>

<div id="chatbox" class="chatbox"></div>

<div class="input-bar">
<textarea id="msg" rows="1" placeholder="Type your message..."></textarea>
<button id="sendBtn" onclick="send()">Send</button>
</div>

</div>
`;

  /* ============================================================
     3. WIDGET LOGIC — verbatim from chatbot-widget-en.html's <script>
        block, wrapped in a function so it can be called AFTER the CSS
        and markup above have been injected into the live DOM (see
        injectAndInit() at the bottom of this file). Same functions, same
        payload shapes, same behavior — no functional changes.
     ============================================================ */
  function initFionaWidget() {

/* ============================================================
🎛️ WIDGET CONFIG — unchanged from brand_assets/chatbot_widget.html
============================================================ */
const WIDGET_CONFIG = {
avatarUrl: "data:image/jpeg;base64,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",
botName: "Fiona",
avatarPosition: "50% 20%",
avatarZoom: 100,
bubbleText: "👋Hi, I am Fiona, your Virtual AI Assistant. I am here to help.",
typingEnabled: true,
typingMinDelay: 600,
typingMaxDelay: 3500,
typingCharsPerSecond: 28,
};

/* ============================================================
🔗 N8N WEBHOOK URL — unchanged, single fixed endpoint per docs/06-chatbot-flow.md
============================================================ */
const N8N_WEBHOOK_URL = "https://152.42.168.17.nip.io/webhook/aeaa38d0-75ec-4ab9-aeb3-b327b582e709/chat";

/* ============================================================
🔗 BOOKING & SESSION GATEWAY URL — new, separate n8n workflow per
docs/08-booking-flow.md §3 (ARCHITECTURE NOTE). Distinct endpoint from
N8N_WEBHOOK_URL above, which stays chat-only/untouched. Handles three
actions: logSession / getAvailableSlots / confirmBooking (exact payload
shapes in that document's "Widget integration note").
============================================================ */
const BOOKING_GATEWAY_URL = "https://152.42.168.17.nip.io/webhook/booking-gateway";

/* ============================================================
LANGUAGE / SITE CONSTANT — this is the EN widget copy.
Per docs/07-sheets-schema.md, `language_site` is NOT asked of the user —
it's determined by which site embeds the widget. Hardcoded here.
============================================================ */
const LANGUAGE_SITE = "EN";

/* ============================================================
STATE — field names match docs/07-sheets-schema.md exactly so any future
n8n Sheet-write logic (Phase 3) can read this payload with zero renaming.
============================================================ */
let segment_intent = "unknown";   // buyer | investor | tenant | unknown
let segment_origin = "unknown";   // local | international | unknown
let segment_country = "";         // China | Taiwan | Japan | Europe | Other | ""
let budget_range = "Not stated";  // canonical short tier label, e.g. "RM 1M-3M"
let booking_requested = false;
let budgetFull = "";              // long-form numeric string, sentence-synthesis only (not a schema field)

/* ============================================================
BOOKING SUB-FLOW STATE — added per docs/08-booking-flow.md §1/§3, wired to
BOOKING_GATEWAY_URL. Field names match docs/07-sheets-schema.md exactly.
============================================================ */
let name = "";                        // lead's name, collected during booking sub-flow
let contact_phone = "";
let contact_email = "";
let contact_whatsapp = "";
let contact_preferred_channel = "none"; // 'phone' | 'whatsapp' | 'email' | 'none'
let booking_type = null;              // 'in_person' | 'virtual' | null (not yet chosen)
let booking_slot_datetime = null;     // ISO 8601 string of the chosen slot, or null
let conversation_summary = "";        // pre-commitment free-text answer, reused schema field

// KNOWN GAP (flagged, not invented here): this widget has no client-side
// mechanism yet to capture which specific property a lead is discussing
// (per docs/06-chatbot-flow.md §3, that association currently lives only
// in the server-side AI agent's context). Left as empty strings so the
// confirmBooking/logSession payload builders below can omit them cleanly
// until a future patch wires up client-side property tracking.
let property_interest_name = "";
let property_interest_url = "";

// Booking-flow state machine: null = free text goes to Fiona as normal;
// otherwise the next send() call answers this specific booking question
// instead of being forwarded to the AI agent (see send() below).
let bookingFlowStep = null; // null | 'awaiting_name' | 'awaiting_contact_detail' | 'awaiting_precommitment'

/* Session persistence: the original widget regenerated sessionId on every
   page load (flagged as a bug in docs/06-chatbot-flow.md §5.3 — a
   returning/refreshing visitor would look like a duplicate lead under a
   one-row-per-session_id scheme). Fixed here by persisting in
   localStorage, falling back to a fresh id only if none stored. */
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

/* ── Open / Close (unchanged iOS scroll-lock pattern) ────── */
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
// Exposed globally so the host page's "Find My Path" hero CTA can open the
// chat directly (see carrd-site-en/index.html).
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
   Body shape: `action`/`sessionId`/`chatInput` are UNCHANGED from the
   original widget (per Manager's instruction not to guess at n8n
   internals). The fields below that are appended
   (language_site/segment_intent/segment_origin/segment_country/
   budget_range/booking_requested) are ADDITIVE — using the exact column
   names from docs/07-sheets-schema.md — so that if/when the n8n workflow
   is wired to log to the lead Sheet (Phase 3, not yet built), the field
   names already match with no reconciliation needed. Flagged to Manager:
   please confirm the current n8n webhook node tolerates/ignores extra
   JSON body fields (standard behavior for most webhook triggers, but not
   verified here since n8n internals are out of scope for this build). ── */
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
const reply = data.output || (data[0]?.output) || 'Sorry, I could not get a reply.';

const remaining = getTypingDelay(reply) - (Date.now() - t0);
if (remaining > 0) await wait(remaining);

hideTyping();
addMessage(reply, 'bot');
} catch (e) {
hideTyping();
addMessage('⚠️ Could not reach the server. Please check your n8n workflow is active.', 'bot');
}
}

/* ============================================================
SEGMENT PERSONALIZATION BRIDGE
============================================================
Carrd has no native conditional-display logic, so the chatbot itself is
used as the branching mechanism (per Manager's flagged workaround): once
Q4 resolves, this widget publishes the resolved segment via a CustomEvent
+ localStorage so the rest of the page (carrd-site-en/index.html) can
swap in matched headline/offer/video content. This ONLY works if this
file is embedded as a same-DOM Embed Code block, not a sandboxed iframe —
see the deployment note at the top of chatbot-widget-en.html (and this
loader's header comment).
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
Q1 — INTENT (replaces old 2-button buy/rent step)
Phrasing variant A per docs/06-chatbot-flow.md §1
============================================================ */
function askIntent() {
  addMessage(
    `Hi 👋 I'm ${WIDGET_CONFIG.botName}, your KL property assistant! What brings you here today?`,
    'bot'
  );
  showButtons(null, [
    { label: '🏠 Buy a home to live in', value: 'buyer' },
    { label: '📈 Buy for investment', value: 'investor' },
    { label: '🔑 Rent a property', value: 'tenant' }
  ], handleIntentSelection);
}

function handleIntentSelection(value, label) {
  segment_intent = value;
  addMessage(label, 'user');
  setTimeout(askOrigin, 400);
}

/* ============================================================
Q2 — ORIGIN
============================================================ */
function askOrigin() {
  showButtons("Got it! Are you currently based in Malaysia?", [
    { label: "Yes, I'm in Malaysia", value: 'local' },
    { label: "No, I'm overseas", value: 'international' }
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
Q3 — COUNTRY (only if Q2 = international)
============================================================ */
function askCountry() {
  showButtons(
    "Which country are you based in? This helps me share the right process/legal info for your situation.",
    [
      { label: 'China', value: 'China' },
      { label: 'Taiwan', value: 'Taiwan' },
      { label: 'Japan', value: 'Japan' },
      { label: 'Europe', value: 'Europe' },
      { label: 'Other', value: 'Other' }
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
Q4 — BUDGET
Buyer/Investor share RM1M-8M tiers (Manager decision: dropped the old
RM500K-1M tier since it's below the brief's RM1M-8M range). Tenant keeps
its own RM3K-12K/mo tiers, unchanged.
============================================================ */
function askBudget() {
  const isTenant = segment_intent === 'tenant';
  const budgetOptions = isTenant
    ? [
        { label: 'RM 3K–5K/mo', value: 'RM 3K–5K/mo', full: 'RM 3,000 – RM 5,000 per month' },
        { label: 'RM 5K–8K/mo', value: 'RM 5K–8K/mo', full: 'RM 5,000 – RM 8,000 per month' },
        { label: 'RM 8K–12K/mo', value: 'RM 8K–12K/mo', full: 'RM 8,000 – RM 12,000 per month' }
      ]
    : [
        { label: 'RM 1M–3M', value: 'RM 1M–3M', full: 'RM 1,000,000 – RM 3,000,000' },
        { label: 'RM 3M–5M', value: 'RM 3M–5M', full: 'RM 3,000,000 – RM 5,000,000' },
        { label: 'RM 5M–8M', value: 'RM 5M–8M', full: 'RM 5,000,000 – RM 8,000,000' }
      ];

  const chat = document.getElementById('chatbox');
  addMessage("What's your budget range?", 'bot');
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
    buyer: 'buy a home to live in',
    investor: 'invest for rental income / returns',
    tenant: 'rent a property'
  }[segment_intent];

  if (segment_origin === 'local') {
    return `I am looking to ${intentPhrase} in Kuala Lumpur. I am based in Malaysia. My budget is ${budgetFull}.`;
  }
  return `I am an international ${segment_intent} based in ${segment_country || 'overseas'} looking to ${intentPhrase} in Kuala Lumpur. My budget is ${budgetFull}.`;
}

/* ============================================================
POST-ROUTING BEHAVIOR (docs/06-chatbot-flow.md §2)
Rendered deterministically client-side rather than relying on the n8n
agent's free-text reply to hit this exact structure (the agent's system
prompt/behavior is opaque from the client — see docs/06 §5, open question
1). The synthesized summary above is still sent to n8n so the agent has
full context and can still contribute its own free-text reply (shown
first); this block is additive, guaranteeing the funnel always surfaces
the right offer + next-step buttons regardless of what the AI says.

Offer copy quoted verbatim from docs/03-messaging-en.md §5 — not invented.
============================================================ */
function renderPostRouting() {
  const originLabel = segment_origin === 'local' ? 'Malaysia' : (segment_country || 'overseas');
  const intentAckPhrase = {
    buyer: 'buy a home to live in',
    investor: 'invest for rental returns',
    tenant: 'rent'
  }[segment_intent];

  addMessage(
    `Thanks! I've noted you're looking to ${intentAckPhrase} in Kuala Lumpur, based in ${originLabel}, budget ${budget_range}.`,
    'bot'
  );

  let offerText, ctaLabel;
  if (segment_intent === 'buyer') {
    offerText = "Here's what I'd recommend: a free, no-obligation consultation to walk through your budget, must-haves, and a shortlist of Mont Kiara properties that actually match — before you spend a weekend on viewings that don't fit.";
    ctaLabel = 'Book a Free Consultation';
  } else if (segment_intent === 'investor') {
    offerText = "Here's what I'd recommend: a personalized Rental Yield Analysis — a comparison of current Mont Kiara rental comparables against your target purchase price, so you know the realistic yield range before you buy, not after.";
    ctaLabel = 'Get Your Rental Yield Analysis';
  } else {
    offerText = "Here's what I'd recommend: tell us your must-haves and move-in timeline, and I'll match you to real, currently-available Mont Kiara units with a viewing slot confirmed directly.";
    ctaLabel = 'Book a Viewing';
  }
  addMessage(offerText, 'bot');

  if (segment_origin === 'international') {
    const trustLine = {
      buyer: "Foreign-ownership rules, remote viewings, and paperwork — walked through step by step before you wire a single ringgit.",
      investor: "Yield data, tenant demand, and hands-off management — explained for buyers who can't walk the market in person.",
      tenant: "Video walkthroughs, live video-call viewings, and 20 years of local tenancy know-how — so your lease is signed and your keys are ready before you land."
    }[segment_intent];
    addMessage(trustLine, 'bot');
  }

  window._fionaCtaLabel = ctaLabel;

  showButtons(null, [
    { label: '💬 Ask me about a specific property', value: 'ask_property' },
    { label: '📅 Book a viewing / consultation', value: 'book' }
  ], handlePostRoutingChoice);
}

function handlePostRoutingChoice(value, label) {
  addMessage(label, 'user');
  document.getElementById('msg').focus();
  if (value === 'book') {
    startBookingFlow();
  } else {
    addMessage(
      "Sure — ask away! Name a specific property, price range, or area (e.g. \"Kiaramas Danai\" or \"what rents around RM6,000?\") and I'll pull up what matches.",
      'bot'
    );
  }
}

/* ============================================================
BOOKING SUB-FLOW — Entry Point A (chatbot slot-picker), per
docs/08-booking-flow.md §1 and its "Widget integration note" (§3) for the
exact payload shapes. Two triggers funnel here: the "📅 Book a viewing /
consultation" quick-reply (handlePostRoutingChoice above) and the
free-text booking-intent regex in send() below — per
docs/06-chatbot-flow.md §4, both are the same handoff point.
============================================================ */

/* ── Fire-and-forget logSession call — per docs/08-booking-flow.md §3
   Branch A / widget integration note: never awaited, never blocks the UI,
   any rejection is caught and silently ignored. Sends only whatever subset
   of fields is currently known (omit unset fields, per that note's
   "partial-row upserts" convention). ── */
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
  }).catch(() => { /* fire-and-forget: intentionally swallowed */ });
}

/* ── Step 3: kick off the booking sub-flow ── */
function startBookingFlow() {
  booking_requested = true;
  fireLogSession(); // per docs/08 §3 widget-integration note: "the moment booking_requested flips to TRUE"

  if (segment_origin === 'international') {
    // Per docs/08-booking-flow.md §2 point 4: international leads are
    // virtual-only self-booking; in-person is arranged directly with Dion
    // once travel is confirmed.
    booking_type = 'virtual';
    addMessage(
      "Since you're joining us from abroad, let's set up a virtual consultation first — in-person viewings for international clients are arranged directly with Dion once your travel is confirmed.",
      'bot'
    );
    fetchAndShowSlots();
  } else {
    showButtons(
      "Would you like an in-person viewing or a virtual consultation?",
      [
        { label: '🏠 In-person viewing', value: 'in_person' },
        { label: '💻 Virtual consultation', value: 'virtual' }
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

/* ── Step 4: fetch + render available slots ── */
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

  const whatsappFallback = "https://wa.me/60102287686"; // same number already used in footer's WhatsApp link
  let bodyText;
  if (networkError) {
    bodyText = "⚠️ Could not reach the booking system. Please try again in a moment, or WhatsApp Dion directly: " + whatsappFallback;
  } else if (!slots.length) {
    // Per the task spec: the next-7-days window is a fixed backend
    // limitation (docs/08-booking-flow.md §3 Branch B) — no client-side
    // "widen the range" option exists to offer here, so a direct WhatsApp
    // fallback is the honest answer for now.
    bodyText = "I'm sorry — the next 7 days look fully booked. Easiest fix: reach Dion directly on WhatsApp so he can find you a time: " + whatsappFallback;
  } else {
    bodyText = "Here are the next available times — tap one that works for you:";
  }

  const remaining = getTypingDelay(bodyText) - (Date.now() - t0);
  if (remaining > 0) await wait(remaining);
  hideTyping();

  if (networkError || !slots.length) {
    addMessage(bodyText, 'bot');
    return;
  }

  // KNOWN BACKEND LIMITATION, flagged rather than papered over: the
  // gateway's getAvailableSlots branch always queries a fixed 7-day
  // lookahead with no client-controllable date-range widening — we do NOT
  // fabricate a "show more / wider range" button here.
  window._fionaSlotMap = window._fionaSlotMap || {};
  slots.forEach(s => { window._fionaSlotMap[s.iso] = s.label; });

  showButtons(
    bodyText,
    slots.map(s => ({ label: s.label, value: s.iso })),
    handleSlotSelection
  );
}

/* ── Step 5: slot chosen -> light pre-commitment question ── */
function handleSlotSelection(iso, label) {
  addMessage(label, 'user');
  booking_slot_datetime = iso;
  addMessage(
    "Quick one before I lock this in — what matters most to you in this property (e.g. budget ceiling, must-have facilities, timeline)?",
    'bot'
  );
  bookingFlowStep = 'awaiting_precommitment';
}

/* ── Step 6: ask only for whatever's still missing ── */
function advanceBookingFlow() {
  if (!name) {
    addMessage("What's your name?", 'bot');
    bookingFlowStep = 'awaiting_name';
    return;
  }
  if (!contact_phone && !contact_email && !contact_whatsapp) {
    showButtons(
      "And what's the best way to reach you?",
      [
        { label: '📱 Phone', value: 'phone' },
        { label: '💬 WhatsApp', value: 'whatsapp' },
        { label: '📧 Email', value: 'email' }
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
    phone: "What's the best phone number to reach you on?",
    whatsapp: "What's your WhatsApp number?",
    email: "What's your email address?"
  };
  addMessage(prompts[value], 'bot');
  bookingFlowStep = 'awaiting_contact_detail';
}

/* ── Step 7: confirm the booking ── */
async function doConfirmBooking() {
  bookingFlowStep = null; // flow is done, not waiting on more free text
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
      const typeLabel = booking_type === 'virtual' ? 'virtual consultation' : 'viewing';
      const propLabel = data.property_interest_name || property_interest_name || 'your Mont Kiara property';
      const replyText = `You're all set! Your ${typeLabel} for ${propLabel} is booked for ${slotLabel}. Here's your calendar link: ${data.calendar_event_link || ''}`;

      const remaining = getTypingDelay(replyText) - (Date.now() - t0);
      if (remaining > 0) await wait(remaining);
      hideTyping();
      addMessage(replyText, 'bot');

      fireLogSession(); // per docs/08 §3 widget-integration note: "once more right after confirmBooking succeeds"
    } else if (data.status === 'slot_taken') {
      const replyText = "Ah, sorry — someone just grabbed that slot. Let me pull up fresh times for you.";
      const remaining = getTypingDelay(replyText) - (Date.now() - t0);
      if (remaining > 0) await wait(remaining);
      hideTyping();
      addMessage(replyText, 'bot');
      fetchAndShowSlots(); // re-fetch a fresh slot list rather than restarting the whole flow
    } else {
      hideTyping();
      addMessage("Hmm, something went wrong locking that in. Please try again, or WhatsApp Dion directly: " + whatsappFallback, 'bot');
    }
  } catch (e) {
    hideTyping();
    addMessage("⚠️ Could not reach the booking system to confirm. Please try again, or WhatsApp Dion directly: " + whatsappFallback, 'bot');
  }
}

/* ── Free-text send (always available — per docs/06 §1, free text can
   interrupt the quick-reply flow at any point, for every OTHER quick-reply
   flow on this widget. EXCEPTION: while the booking sub-flow (above) is
   waiting on a specific answer — name / contact detail / pre-commitment —
   free text answers THAT question instead of being forwarded to Fiona's
   AI agent. bookingFlowStep === null is the normal/default state. ── */
async function send() {
const input = document.getElementById('msg');
const text = input.value.trim();
if (!text) return;
addMessage(text, 'user');
input.value = '';
input.style.height = 'auto';

// Booking sub-flow interception — see docs/08-booking-flow.md §1 steps 5-6.
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

// Lightweight client-side booking-intent detection, per
// docs/06-chatbot-flow.md §4 (free-text booking phrases) — funnels into
// the same booking sub-flow as the quick-reply button (startBookingFlow),
// rather than forwarding this turn to Fiona's AI agent.
if (/\b(book|schedule|viewing|appointment|when are you free|available)\b/i.test(text)) {
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
       Expose inline-handler targets on `window` — see header comment
       point 3 at the top of this file. The markup injected above still
       uses onclick="openChat()" / onclick="closeChat()" /
       onclick="event.stopPropagation();hideLabel()" / onclick="send()"
       exactly as authored in chatbot-widget-en.html; inline
       event-handler attributes always resolve identifiers against the
       global object, so these four functions (declared above via
       `function name(){}`, which are local to this IIFE/initFionaWidget
       scope) must be re-attached to `window` for those unchanged
       onclick="" attributes to keep working. window.fionaOpenChat was
       already an explicit global assignment in the original script
       (see above) and needs no change.
       ============================================================ */
    window.openChat = openChat;
    window.closeChat = closeChat;
    window.hideLabel = hideLabel;
    window.send = send;

  } // end initFionaWidget()

  /* ============================================================
     4. INJECT + RUN
     Inject the CSS into <head> and the markup into <body> first, then
     run initFionaWidget() so every document.getElementById(...) call
     inside it finds the elements this same file just created. Does not
     wait on 'DOMContentLoaded' unless <body> genuinely isn't parsed yet
     at the moment this script executes (see header comment point 4).
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
