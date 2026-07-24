/* ProBot widget · MIT · v1 */
"use strict";(()=>{function S(o){var a,s,r,u,l,m,f,h,b,E,$,y;let e=o.replace(/\r\n?/g,`
`).split(`
`),t=[],n=0;for(;n<e.length;){let d=(a=e[n])!=null?a:"";if(/^```/.test(d)){let p=[];for(n++;n<e.length&&!/^```/.test((s=e[n])!=null?s:"");)p.push((r=e[n])!=null?r:""),n++;n++,t.push(`<pre><code>${g(p.join(`
`))}</code></pre>`);continue}let k=d.match(/^(#{1,6})\s+(.+)$/);if(k){let p=k[1].length;t.push(`<h${p}>${L(k[2])}</h${p}>`),n++;continue}if(/^([-*_])\1{2,}\s*$/.test(d)){t.push("<hr>"),n++;continue}if(/^>/.test(d)){let p=[];for(;n<e.length&&/^>/.test((u=e[n])!=null?u:"");)p.push(((l=e[n])!=null?l:"").replace(/^>\s?/,"")),n++;t.push(`<blockquote>${L(p.join("<br>"))}</blockquote>`);continue}if(/^[-*]\s+/.test(d)){let p=[];for(;n<e.length&&/^[-*]\s+/.test((m=e[n])!=null?m:"");){let _=((f=e[n])!=null?f:"").replace(/^[-*]\s+/,"");p.push(`<li>${L(_)}</li>`),n++}t.push(`<ul>${p.join("")}</ul>`);continue}if(/^\d+\.\s+/.test(d)){let p=[];for(;n<e.length&&/^\d+\.\s+/.test((h=e[n])!=null?h:"");){let _=((b=e[n])!=null?b:"").replace(/^\d+\.\s+/,"");p.push(`<li>${L(_)}</li>`),n++}t.push(`<ol>${p.join("")}</ol>`);continue}if(d.trim()===""){n++;continue}let M=[];for(;n<e.length&&((E=e[n])!=null?E:"").trim()!==""&&!/^(#{1,6}\s|>|\`\`\`|[-*]\s|\d+\.\s|([-*_])\2{2,}\s*$)/.test(($=e[n])!=null?$:"");)M.push((y=e[n])!=null?y:""),n++;t.push(`<p>${L(M.join("<br>"))}</p>`)}return t.join("")}function L(o){let e=g(o),t=[];return e=e.replace(/`([^`\n]+)`/g,(n,a)=>`\0C${t.push(`<code>${a}</code>`)-1}\0`),e=e.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(n,a,s)=>`<a href="${/^(https?:|mailto:)/i.test(s)?s:"#"}" target="_blank" rel="noopener noreferrer">${a}</a>`),e=e.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"),e=e.replace(/(^|\W)_(.+?)_(\W|$)/g,"$1<em>$2</em>$3"),e=e.replace(/\*(.+?)\*/g,"<em>$1</em>"),e=e.replace(/\x00C(\d+)\x00/g,(n,a)=>{var s;return(s=t[Number(a)])!=null?s:""}),e}function g(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}var B=/^#[0-9a-fA-F]{6}$/,I="#7c5cff";function j(o){return typeof o=="string"&&B.test(o)?o:I}function P(o){if(!o||typeof o!="object")return null;let e=o,t=e.bot,n=e.owner;if(!t||!n)return null;let a=t.id,s=t.name,r=n.username;if(typeof a!="string"||typeof s!="string"||typeof r!="string")return null;let u=Array.isArray(t.suggestedQuestions)?t.suggestedQuestions.filter(l=>typeof l=="string"&&l.length>0):[];return{bot:{id:a,name:s,headline:typeof t.headline=="string"?t.headline:null,themeColor:j(t.themeColor),image:typeof t.image=="string"?t.image:null,suggestedQuestions:u},owner:{username:r,name:typeof n.name=="string"?n.name:null,image:typeof n.image=="string"?n.image:null}}}function q(){return`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>
      <path d="M20 2v4"/>
      <path d="M22 4h-4"/>
      <circle cx="4" cy="20" r="2"/>
    </svg>
  `}function U(o){return`
    <header class="probot-header">
      <div class="probot-avatar" aria-hidden="true"></div>
      <div class="probot-titles">
        <div class="probot-title">ProBot</div>
      </div>
      <button type="button" class="probot-close" aria-label="Close" data-action="close">\xD7</button>
    </header>
    <div class="probot-body">
      <p class="probot-greeting">Hi! Say hello to your AI assistant.</p>
      <div class="probot-notice">
        The chatbot is warming up. Try again in a moment or open ProBot directly.
      </div>
      <a class="probot-cta" href="${g(o)}" target="_blank" rel="noopener noreferrer">
        Visit ProBot \u2197
      </a>
    </div>
    <footer class="probot-footer">
      <a href="${g(o)}" target="_blank" rel="noopener noreferrer">
        Powered by ProBot
      </a>
    </footer>
  `}function H(o,e){let t=e==="header"?"probot-avatar":"probot-avatar-mini";return o?`<img class="${t}" src="${g(o)}" alt="" />`:`<div class="${t} probot-avatar-fallback" aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
        <circle cx="14" cy="20" r="3.4" fill="#fff"/>
        <circle cx="26" cy="20" r="3.4" fill="#fff" opacity="0.65"/>
      </svg>
    </div>`}function D(o,e){var $,y;let{bot:t,owner:n}=o,a=($=n.name)!=null?$:n.username,s=`${e}/u/${encodeURIComponent(n.username)}/chat`,r=(y=t.image)!=null?y:n.image,u=H(r,"header"),l=H(r,"mini"),m=t.suggestedQuestions.length>0,f=m?`<div class="probot-suggested" data-role="suggestions">
         ${t.suggestedQuestions.slice(0,5).map(d=>`<button type="button" class="probot-chip" data-action="ask" data-question="${g(d)}">${g(d)}</button>`).join("")}
       </div>`:"",h=m?`<div class="probot-suggest-list" data-role="suggest-list" hidden>
         <p class="probot-suggest-list-heading">Suggested questions</p>
         <ul class="probot-suggest-list-items">
           ${t.suggestedQuestions.map(d=>`<li><button type="button" class="probot-suggest-list-item" data-action="ask" data-question="${g(d)}">${g(d)}</button></li>`).join("")}
         </ul>
       </div>`:"",b=m?`<button type="button" class="probot-suggest-toggle" data-role="suggest-toggle" aria-label="Suggested questions" aria-expanded="false" hidden>
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M9 18h6"/>
           <path d="M10 22h4"/>
           <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/>
         </svg>
       </button>`:"",E=t.headline?`<div class="probot-subtitle">${g(t.headline)}</div>`:'<div class="probot-subtitle probot-subtitle-online">Online now</div>';return`
    <header class="probot-header">
      <div class="probot-avatar-wrap">
        ${u}
        <span class="probot-online-dot" aria-hidden="true"></span>
      </div>
      <div class="probot-titles">
        <div class="probot-title">
          ${g(a)}
          <span class="probot-title-suffix">\xB7 AI Assistant</span>
        </div>
        ${E}
      </div>
      <button type="button" class="probot-close" aria-label="Close" data-action="close">\xD7</button>
    </header>
    <div class="probot-body" data-role="body" data-avatar-src="${g(r!=null?r:"")}">
      <div class="probot-messages" data-role="messages">
        <div class="probot-msg-row probot-msg-row-bot">
          ${l}
          <div class="probot-msg probot-msg-bot">Hi! I'm ${g(t.name)}, ${g(a)}'s AI. Ask me anything.</div>
        </div>
      </div>
      ${f}
    </div>
    ${h}
    <form class="probot-inputbar" data-role="form" novalidate>
      ${b}
      <input
        type="text"
        class="probot-input"
        data-role="input"
        placeholder="Ask anything about ${g(t.name)}\u2026"
        autocomplete="off"
        maxlength="1000"
      />
      <button type="submit" class="probot-send" data-role="send" aria-label="Send">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 19V5"/>
          <path d="M5 12l7-7 7 7"/>
        </svg>
      </button>
    </form>
    <footer class="probot-footer">
      <a href="${g(s)}" target="_blank" rel="noopener noreferrer">
        Open full chat \u2197
      </a>
      <span class="probot-footer-sep">\xB7</span>
      <a href="${g(e)}" target="_blank" rel="noopener noreferrer">
        Powered by ProBot
      </a>
    </footer>
  `}function N(o){if(!o)return null;let e=o.getAttribute("data-bot-id");if(!e)return null;let t=o.getAttribute("data-api-base"),n=typeof t=="string"&&/^https?:\/\//.test(t)?t.replace(/\/$/,""):"https://pro-bot.dev";return{botId:e,apiBase:n}}var R=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;function A(){var n,a;let o=typeof crypto!="undefined"?crypto:void 0;if(o&&typeof o.randomUUID=="function")return o.randomUUID();if(!o||typeof o.getRandomValues!="function")throw new Error("no crypto namespace available");let e=new Uint8Array(16);o.getRandomValues(e),e[6]=((n=e[6])!=null?n:0)&15|64,e[8]=((a=e[8])!=null?a:0)&63|128;let t=Array.from(e,s=>s.toString(16).padStart(2,"0")).join("");return`${t.slice(0,8)}-${t.slice(8,12)}-${t.slice(12,16)}-${t.slice(16,20)}-${t.slice(20)}`}function O(o){let e=`probot.session.${o}`;try{let t=window.localStorage.getItem(e);if(t&&R.test(t))return t;let n=A();return window.localStorage.setItem(e,n),n}catch(t){return A()}}async function F(o,e=document){let t=N(o);if(!t)return;let n=e.createElement("div");n.setAttribute("data-probot-widget",""),e.body.appendChild(n);let a=n.attachShadow({mode:"closed"}),s=e.createElement("style");s.textContent=`/*
 * ProBot widget styles. All selectors are scoped to the Shadow DOM root the
 * widget creates - there is no \`:host { all: initial }\` reset because
 * \`mode: "closed"\` already isolates from host-page styles.
 *
 * Theme color is applied per-instance via the \`--probot-theme\` CSS custom
 * property (set inline on the shadow root). The overall visual language
 * mirrors \`src/components/chat/*\` on the deployed /u/[username]/chat page:
 * ringed avatar with online dot, asymmetric-corner bubbles with a mini
 * bot avatar on assistant replies, pill chips, and a rounded pill input
 * that highlights the theme colour on focus.
 */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.probot-root {
  --probot-theme: #7c5cff;
  --probot-text: #18181b;
  --probot-muted: #71717a;
  --probot-surface: #ffffff;
  --probot-border: #e4e4e7;
  --probot-bg-bot: #ffffff;
  --probot-bg-page: #fafafa;
  --probot-online: #10b981;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
    "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--probot-text);
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2147483647;
}

/* --- floating bubble (unchanged) --- */

.probot-bubble {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--probot-theme);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  padding: 0;
  isolation: isolate;
  transition: transform 0.15s ease-out;
  animation: probot-glow 3.2s ease-in-out infinite;
}

.probot-bubble:hover {
  transform: scale(1.08) rotate(12deg);
}

.probot-bubble:active {
  transform: scale(0.97);
}

.probot-bubble svg {
  width: 26px;
  height: 26px;
  animation: probot-pulse 2.4s ease-in-out infinite;
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.55));
  transition: transform 0.3s ease-out;
}

@keyframes probot-glow {
  0%,
  100% {
    box-shadow:
      0 8px 22px rgba(0, 0, 0, 0.32),
      0 0 0 rgba(255, 255, 255, 0);
  }
  50% {
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.4),
      0 0 22px rgba(255, 255, 255, 0.35);
  }
}

@keyframes probot-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .probot-bubble,
  .probot-bubble svg {
    animation: none;
  }
}

/* --- dialog shell --- */

.probot-dialog {
  position: absolute;
  bottom: 76px;
  right: 0;
  width: 380px;
  height: 580px;
  max-height: calc(100vh - 120px);
  background: var(--probot-bg-page);
  border-radius: 18px;
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.18),
    0 6px 16px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.probot-dialog[hidden] {
  display: none;
}

/* --- header: ringed avatar + online dot + name + AI Assistant suffix --- */

.probot-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid var(--probot-border);
  flex-shrink: 0;
}

.probot-avatar-wrap {
  position: relative;
  flex-shrink: 0;
  padding: 2px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px var(--probot-theme);
  background: var(--probot-surface);
}

.probot-avatar {
  display: block;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: #f4f4f5;
}

.probot-avatar-fallback {
  display: grid;
  place-items: center;
  background: var(--probot-theme);
}

.probot-avatar-fallback svg {
  width: 60%;
  height: 60%;
}

.probot-online-dot {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--probot-online);
  border: 2px solid #fff;
}

.probot-titles {
  flex: 1;
  min-width: 0;
}

.probot-title {
  font-weight: 700;
  font-size: 15px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.probot-title-suffix {
  font-weight: 400;
  color: var(--probot-muted);
  font-size: 12.5px;
  margin-left: 2px;
}

.probot-subtitle {
  color: var(--probot-muted);
  font-size: 11.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.probot-subtitle-online {
  color: var(--probot-online);
  font-weight: 600;
}

.probot-close {
  background: transparent;
  border: none;
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--probot-muted);
  font-size: 20px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
}

.probot-close:hover {
  background: #f4f4f5;
  color: var(--probot-text);
}

/* --- body: messages + chips --- */

.probot-body {
  padding: 14px 14px 4px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.probot-messages {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.probot-msg-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.probot-msg-row-bot {
  justify-content: flex-start;
}

.probot-msg-row-user {
  justify-content: flex-end;
}

.probot-avatar-mini {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
  background: var(--probot-theme);
  display: block;
}

.probot-avatar-mini.probot-avatar-fallback {
  display: grid;
  place-items: center;
}

.probot-msg {
  max-width: 82%;
  padding: 10px 13px;
  border-radius: 16px;
  font-size: 13.5px;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-wrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.probot-msg-bot {
  background: var(--probot-bg-bot);
  color: var(--probot-text);
  border: 1px solid var(--probot-border);
  border-top-left-radius: 6px;
}

/* --- markdown-rendered content inside .probot-msg-bot --- */

.probot-msg-bot p {
  margin: 0;
}

.probot-msg-bot p + p,
.probot-msg-bot p + ul,
.probot-msg-bot p + ol,
.probot-msg-bot p + pre,
.probot-msg-bot p + blockquote,
.probot-msg-bot ul + p,
.probot-msg-bot ol + p {
  margin-top: 8px;
}

.probot-msg-bot a {
  color: var(--probot-theme);
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-word;
}

.probot-msg-bot a:hover {
  filter: brightness(0.9);
}

.probot-msg-bot strong {
  font-weight: 600;
}

.probot-msg-bot em {
  font-style: italic;
}

.probot-msg-bot code {
  font-family:
    ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 12.5px;
  background: #f4f4f5;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid var(--probot-border);
}

.probot-msg-bot pre {
  margin: 8px 0 0;
  padding: 10px 12px;
  background: #18181b;
  color: #f4f4f5;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.45;
}

.probot-msg-bot pre code {
  background: transparent;
  border: 0;
  padding: 0;
  color: inherit;
  font-size: inherit;
}

.probot-msg-bot ul,
.probot-msg-bot ol {
  margin: 0;
  padding-left: 20px;
}

.probot-msg-bot li + li {
  margin-top: 2px;
}

.probot-msg-bot blockquote {
  margin: 8px 0 0;
  padding: 2px 10px;
  border-left: 3px solid var(--probot-border);
  color: var(--probot-muted);
}

.probot-msg-bot h1,
.probot-msg-bot h2,
.probot-msg-bot h3,
.probot-msg-bot h4,
.probot-msg-bot h5,
.probot-msg-bot h6 {
  margin: 6px 0 4px;
  font-weight: 700;
  line-height: 1.25;
}

.probot-msg-bot h1 {
  font-size: 16px;
}
.probot-msg-bot h2 {
  font-size: 15px;
}
.probot-msg-bot h3,
.probot-msg-bot h4,
.probot-msg-bot h5,
.probot-msg-bot h6 {
  font-size: 14px;
}

.probot-msg-bot hr {
  border: 0;
  border-top: 1px solid var(--probot-border);
  margin: 10px 0;
}

.probot-msg-bot table {
  border-collapse: collapse;
  margin-top: 8px;
  font-size: 12.5px;
}

.probot-msg-bot th,
.probot-msg-bot td {
  border: 1px solid var(--probot-border);
  padding: 4px 8px;
  text-align: left;
}

.probot-msg-bot th {
  background: #f4f4f5;
  font-weight: 600;
}

.probot-msg-user {
  background: var(--probot-theme);
  color: white;
  border-top-right-radius: 6px;
}

/* --- typing indicator (bot-style bubble with 3 bouncing dots) --- */

.probot-typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 12px 14px;
}

.probot-typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--probot-muted);
  animation: probot-typing 1.2s ease-in-out infinite;
}

.probot-typing span:nth-child(2) {
  animation-delay: 0.15s;
}

.probot-typing span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes probot-typing {
  0%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

/* --- suggested-question pill chips --- */

.probot-suggested {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 4px;
  padding-bottom: 6px;
}

.probot-suggested[hidden] {
  display: none;
}

.probot-chip {
  background: var(--probot-surface);
  color: var(--probot-text);
  border: 1px solid var(--probot-border);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition:
    border-color 0.15s ease-out,
    color 0.15s ease-out;
}

.probot-chip:hover {
  border-color: var(--probot-theme);
  color: var(--probot-theme);
}

.probot-chip:active {
  transform: scale(0.98);
}

/* --- suggested-questions dropdown (input-bar toggle) --- */

.probot-suggest-list {
  margin: 0 14px 8px;
  background: var(--probot-surface);
  border: 1px solid var(--probot-border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.probot-suggest-list[hidden] {
  display: none;
}

.probot-suggest-list-heading {
  padding: 8px 14px;
  border-bottom: 1px solid var(--probot-border);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--probot-muted);
}

.probot-suggest-list-items {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 180px;
  overflow-y: auto;
}

.probot-suggest-list-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 14px;
  font: inherit;
  font-size: 13px;
  color: var(--probot-text);
  background: transparent;
  border: none;
  cursor: pointer;
  transition:
    background-color 0.12s ease-out,
    color 0.12s ease-out;
}

.probot-suggest-list-item:hover {
  background: #fafafa;
  color: var(--probot-theme);
}

.probot-suggest-toggle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--probot-border);
  background: transparent;
  color: var(--probot-muted);
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
  flex-shrink: 0;
  transition:
    color 0.15s ease-out,
    border-color 0.15s ease-out;
}

.probot-suggest-toggle[hidden] {
  display: none;
}

.probot-suggest-toggle svg {
  width: 18px;
  height: 18px;
}

.probot-suggest-toggle:hover {
  color: var(--probot-theme);
  border-color: var(--probot-theme);
}

.probot-suggest-toggle-active {
  color: var(--probot-theme);
  border-color: var(--probot-theme);
}

/* --- input pill --- */

.probot-inputbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 14px 10px;
  padding: 6px 6px 6px 10px;
  border: 1px solid var(--probot-border);
  background: var(--probot-surface);
  border-radius: 20px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition:
    border-color 0.15s ease-out,
    box-shadow 0.15s ease-out;
  flex-shrink: 0;
}

.probot-inputbar:focus-within {
  border-color: var(--probot-theme);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
}

.probot-input {
  flex: 1;
  min-width: 0;
  border: none;
  padding: 8px 0;
  font-size: 13.5px;
  font-family: inherit;
  color: var(--probot-text);
  background: transparent;
  outline: none;
}

.probot-input::placeholder {
  color: var(--probot-muted);
}

.probot-input:disabled {
  opacity: 0.6;
}

.probot-send {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  border: none;
  background: var(--probot-theme);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition:
    transform 0.15s ease-out,
    filter 0.15s ease-out,
    opacity 0.15s ease-out;
  flex-shrink: 0;
}

.probot-send:hover:not(:disabled) {
  filter: brightness(1.05);
}

.probot-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.probot-send svg {
  width: 15px;
  height: 15px;
}

/* --- fallback dialog (renderFallbackDialogInner) --- */

.probot-notice {
  background: #f4f4f5;
  color: var(--probot-muted);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12.5px;
  border: 1px solid var(--probot-border);
}

.probot-greeting {
  font-size: 14px;
}

.probot-cta {
  display: block;
  background: var(--probot-theme);
  color: white;
  text-decoration: none;
  text-align: center;
  font-weight: 600;
  padding: 11px 14px;
  border-radius: 10px;
  transition: filter 0.15s ease-out;
}

.probot-cta:hover {
  filter: brightness(0.95);
}

/* --- footer --- */

.probot-footer {
  padding: 9px 16px;
  border-top: 1px solid var(--probot-border);
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
}

.probot-footer a {
  color: var(--probot-muted);
  font-size: 11px;
  text-decoration: none;
}

.probot-footer a:hover {
  color: var(--probot-text);
}

.probot-footer-sep {
  color: var(--probot-muted);
  font-size: 11px;
}

@media (max-width: 480px) {
  .probot-root {
    bottom: 16px;
    right: 16px;
    left: 16px;
  }
  .probot-dialog {
    width: auto;
    left: 0;
    right: 0;
    height: auto;
    max-height: calc(100vh - 110px);
  }
}
`,a.appendChild(s),a.addEventListener("error",h=>{let b=h.target;if(!(b instanceof HTMLImageElement))return;let E=b.classList.contains("probot-avatar"),$=b.classList.contains("probot-avatar-mini");if(!E&&!$)return;let y=e.createElement("div");y.innerHTML=H(null,E?"header":"mini");let d=y.firstElementChild;d&&b.replaceWith(d)},!0);let r=e.createElement("div");r.className="probot-root",r.style.setProperty("--probot-theme",I);let u=e.createElement("button");u.type="button",u.className="probot-bubble",u.setAttribute("aria-label","Open chat"),u.innerHTML=q();let l=e.createElement("div");l.className="probot-dialog",l.hidden=!0,l.innerHTML=U(t.apiBase),u.addEventListener("click",()=>{l.hidden=!l.hidden}),l.addEventListener("click",h=>{let b=h.target;(b==null?void 0:b.dataset.action)==="close"&&(l.hidden=!0)}),r.appendChild(u),r.appendChild(l),a.appendChild(r);let m;try{let h=await fetch(`${t.apiBase}/api/bots/${encodeURIComponent(t.botId)}/config`,{headers:{Accept:"application/json"}});if(!h.ok)return;m=await h.json()}catch(h){return}let f=P(m);f&&(r.style.setProperty("--probot-theme",f.bot.themeColor),u.setAttribute("aria-label",`Open chat with ${f.bot.name}`),l.innerHTML=D(f,t.apiBase),V(l,e,t.apiBase,t.botId))}async function W(o){try{let e=await o.json();return typeof e.error=="string"?e.error:null}catch(e){return null}}function Q(o){switch(o){case"missing_llm_key":return"This bot isn't set up yet \u2014 its owner needs to save an AI key before it can answer.";case"managed_key_provider_mismatch":return"This bot's saved key doesn't match its selected AI provider. The owner needs to re-save it.";case"managed_storage_unavailable":return"The AI key service is temporarily unavailable. Please try again shortly.";case"provider_unavailable":return"This bot's AI provider isn't available right now. Try the full chat linked below.";default:return"I can't answer here right now. Try the full chat linked below."}}function V(o,e,t,n){let a=o.querySelector('[data-role="form"]'),s=o.querySelector('[data-role="input"]'),r=o.querySelector('[data-role="messages"]'),u=o.querySelector('[data-role="body"]'),l=o.querySelector('[data-role="suggestions"]'),m=o.querySelector('[data-role="suggest-list"]'),f=o.querySelector('[data-role="suggest-toggle"]'),h=o.querySelector('[data-role="send"]');if(!a||!s||!r||!h)return;function b(i){!m||!f||(m.hidden=!i,f.setAttribute("aria-expanded",i?"true":"false"),f.classList.toggle("probot-suggest-toggle-active",i))}let E=O(n),$=(u==null?void 0:u.dataset.avatarSrc)||null,y=!1;function d(){r.scrollTop=r.scrollHeight}function k(i,v){let w=e.createElement("div");if(w.className=`probot-msg-row probot-msg-row-${i}`,i==="bot"){let T=e.createElement("div");T.innerHTML=H($,"mini");let C=T.firstElementChild;C&&w.appendChild(C)}let c=e.createElement("div");return c.className=`probot-msg probot-msg-${i}`,i==="bot"?c.innerHTML=S(v):c.textContent=v,w.appendChild(c),r.appendChild(w),d(),c}function M(){let i=e.createElement("div");i.className="probot-msg-row probot-msg-row-bot probot-typing-row";let v=e.createElement("div");v.innerHTML=H($,"mini");let w=v.firstElementChild;w&&i.appendChild(w);let c=e.createElement("div");return c.className="probot-msg probot-msg-bot probot-typing",c.setAttribute("aria-label","Assistant is typing"),c.innerHTML="<span></span><span></span><span></span>",i.appendChild(c),r.appendChild(i),d(),i}function p(i){y=i,s.disabled=i,h.disabled=i}async function _(i){let v=i.trim();if(!v||y)return;l&&(l.hidden=!0),f&&(f.hidden=!1),b(!1),k("user",v),s.value="",p(!0);let w=M();try{let c=await fetch(`${t}/api/chat/${encodeURIComponent(n)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:v,sessionId:E})});if(w.remove(),c.status===429){k("bot","This bot is getting a lot of questions right now. Please try again in a minute.");return}if(!c.ok){let x=await W(c);k("bot",Q(x));return}let T=await c.json(),C=typeof T.reply=="string"&&T.reply.length>0?T.reply:"I didn't get a reply. Please try again.";k("bot",C)}catch(c){w.remove(),k("bot","Network hiccup - please check your connection and try again.")}finally{p(!1),s.focus()}}a.addEventListener("submit",i=>{i.preventDefault(),_(s.value)}),o.addEventListener("click",i=>{var T,C;let v=i.target;if(!v)return;if(v.closest('[data-role="suggest-toggle"]')){b((m==null?void 0:m.hidden)!==!1);return}let c=v.closest('[data-action="ask"]');if(c){let x=(C=(T=c.dataset.question)!=null?T:c.textContent)!=null?C:"";_(x)}})}typeof document!="undefined"&&F(document.currentScript);})();
