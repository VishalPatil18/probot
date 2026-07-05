/* ProBot widget · MIT · v1 */
"use strict";(()=>{function H(o){var c,i,s,d,l,f,h,m,b,y,w,k;let t=o.replace(/\r\n?/g,`
`).split(`
`),n=[],e=0;for(;e<t.length;){let v=(c=t[e])!=null?c:"";if(/^```/.test(v)){let r=[];for(e++;e<t.length&&!/^```/.test((i=t[e])!=null?i:"");)r.push((s=t[e])!=null?s:""),e++;e++,n.push(`<pre><code>${g(r.join(`
`))}</code></pre>`);continue}let E=v.match(/^(#{1,6})\s+(.+)$/);if(E){let r=E[1].length;n.push(`<h${r}>${C(E[2])}</h${r}>`),e++;continue}if(/^([-*_])\1{2,}\s*$/.test(v)){n.push("<hr>"),e++;continue}if(/^>/.test(v)){let r=[];for(;e<t.length&&/^>/.test((d=t[e])!=null?d:"");)r.push(((l=t[e])!=null?l:"").replace(/^>\s?/,"")),e++;n.push(`<blockquote>${C(r.join("<br>"))}</blockquote>`);continue}if(/^[-*]\s+/.test(v)){let r=[];for(;e<t.length&&/^[-*]\s+/.test((f=t[e])!=null?f:"");){let u=((h=t[e])!=null?h:"").replace(/^[-*]\s+/,"");r.push(`<li>${C(u)}</li>`),e++}n.push(`<ul>${r.join("")}</ul>`);continue}if(/^\d+\.\s+/.test(v)){let r=[];for(;e<t.length&&/^\d+\.\s+/.test((m=t[e])!=null?m:"");){let u=((b=t[e])!=null?b:"").replace(/^\d+\.\s+/,"");r.push(`<li>${C(u)}</li>`),e++}n.push(`<ol>${r.join("")}</ol>`);continue}if(v.trim()===""){e++;continue}let a=[];for(;e<t.length&&((y=t[e])!=null?y:"").trim()!==""&&!/^(#{1,6}\s|>|\`\`\`|[-*]\s|\d+\.\s|([-*_])\2{2,}\s*$)/.test((w=t[e])!=null?w:"");)a.push((k=t[e])!=null?k:""),e++;n.push(`<p>${C(a.join("<br>"))}</p>`)}return n.join("")}function C(o){let t=g(o),n=[];return t=t.replace(/`([^`\n]+)`/g,(e,c)=>`\0C${n.push(`<code>${c}</code>`)-1}\0`),t=t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(e,c,i)=>`<a href="${/^(https?:|mailto:)/i.test(i)?i:"#"}" target="_blank" rel="noopener noreferrer">${c}</a>`),t=t.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"),t=t.replace(/(^|\W)_(.+?)_(\W|$)/g,"$1<em>$2</em>$3"),t=t.replace(/\*(.+?)\*/g,"<em>$1</em>"),t=t.replace(/\x00C(\d+)\x00/g,(e,c)=>{var i;return(i=n[Number(c)])!=null?i:""}),t}function g(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}var L=/^#[0-9a-fA-F]{6}$/,M="#7c5cff";function x(o){return typeof o=="string"&&L.test(o)?o:M}function A(o){if(!o||typeof o!="object")return null;let t=o,n=t.bot,e=t.owner;if(!n||!e)return null;let c=n.id,i=n.name,s=e.username;if(typeof c!="string"||typeof i!="string"||typeof s!="string")return null;let d=Array.isArray(n.suggestedQuestions)?n.suggestedQuestions.filter(l=>typeof l=="string"&&l.length>0):[];return{bot:{id:c,name:i,headline:typeof n.headline=="string"?n.headline:null,themeColor:x(n.themeColor),image:typeof n.image=="string"?n.image:null,suggestedQuestions:d},owner:{username:s,name:typeof e.name=="string"?e.name:null,image:typeof e.image=="string"?e.image:null}}}function I(){return`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>
      <path d="M20 2v4"/>
      <path d="M22 4h-4"/>
      <circle cx="4" cy="20" r="2"/>
    </svg>
  `}function S(o){return`
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
  `}function _(o,t){let n=t==="header"?"probot-avatar":"probot-avatar-mini";return o?`<img class="${n}" src="${g(o)}" alt="" />`:`<div class="${n} probot-avatar-fallback" aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
        <circle cx="14" cy="20" r="3.4" fill="#fff"/>
        <circle cx="26" cy="20" r="3.4" fill="#fff" opacity="0.65"/>
      </svg>
    </div>`}function B(o,t){var m,b;let{bot:n,owner:e}=o,c=(m=e.name)!=null?m:e.username,i=`${t}/u/${encodeURIComponent(e.username)}/chat`,s=(b=n.image)!=null?b:e.image,d=_(s,"header"),l=_(s,"mini"),f=n.suggestedQuestions.length>0?`<div class="probot-suggested" data-role="suggestions">
           ${n.suggestedQuestions.slice(0,5).map(y=>`<button type="button" class="probot-chip" data-action="ask" data-question="${g(y)}">${g(y)}</button>`).join("")}
         </div>`:"",h=n.headline?`<div class="probot-subtitle">${g(n.headline)}</div>`:'<div class="probot-subtitle probot-subtitle-online">Online now</div>';return`
    <header class="probot-header">
      <div class="probot-avatar-wrap">
        ${d}
        <span class="probot-online-dot" aria-hidden="true"></span>
      </div>
      <div class="probot-titles">
        <div class="probot-title">
          ${g(c)}
          <span class="probot-title-suffix">\xB7 AI Assistant</span>
        </div>
        ${h}
      </div>
      <button type="button" class="probot-close" aria-label="Close" data-action="close">\xD7</button>
    </header>
    <div class="probot-body" data-role="body" data-avatar-src="${g(s!=null?s:"")}">
      <div class="probot-messages" data-role="messages">
        <div class="probot-msg-row probot-msg-row-bot">
          ${l}
          <div class="probot-msg probot-msg-bot">Hi! I'm ${g(n.name)}, ${g(c)}'s AI. Ask me anything.</div>
        </div>
      </div>
      ${f}
    </div>
    <form class="probot-inputbar" data-role="form" novalidate>
      <input
        type="text"
        class="probot-input"
        data-role="input"
        placeholder="Ask anything about ${g(n.name)}\u2026"
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
      <a href="${g(i)}" target="_blank" rel="noopener noreferrer">
        Open full chat \u2197
      </a>
      <span class="probot-footer-sep">\xB7</span>
      <a href="${g(t)}" target="_blank" rel="noopener noreferrer">
        Powered by ProBot
      </a>
    </footer>
  `}function P(o){if(!o)return null;let t=o.getAttribute("data-bot-id");if(!t)return null;let n=o.getAttribute("data-api-base"),e=typeof n=="string"&&/^https?:\/\//.test(n)?n.replace(/\/$/,""):"https://pro-bot.dev";return{botId:t,apiBase:e}}function j(o){let t=`probot.session.${o}`;try{let n=window.localStorage.getItem(t);if(n)return n;let e=typeof crypto!="undefined"&&"randomUUID"in crypto?crypto.randomUUID():`sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;return window.localStorage.setItem(t,e),e}catch(n){return`sess-${Date.now()}-${Math.random().toString(36).slice(2)}`}}async function D(o,t=document){let n=P(o);if(!n)return;let e=t.createElement("div");e.setAttribute("data-probot-widget",""),t.body.appendChild(e);let c=e.attachShadow({mode:"closed"}),i=t.createElement("style");i.textContent=`/*
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

.probot-bubble::before {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  padding: 3px;
  background: conic-gradient(
    from 0deg,
    #7c5cff,
    #ff5cae,
    #ffb85c,
    #5cffb8,
    #5caeff,
    #7c5cff
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  animation: probot-spin 3s linear infinite;
  z-index: -1;
  pointer-events: none;
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

@keyframes probot-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes probot-glow {
  0%,
  100% {
    box-shadow:
      0 8px 22px rgba(124, 92, 255, 0.45),
      0 0 0 rgba(255, 92, 174, 0);
  }
  50% {
    box-shadow:
      0 10px 30px rgba(255, 92, 174, 0.55),
      0 0 22px rgba(124, 92, 255, 0.45);
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
  .probot-bubble::before,
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

/* --- input pill --- */

.probot-inputbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 14px 10px;
  padding: 6px 6px 6px 14px;
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
`,c.appendChild(i);let s=t.createElement("div");s.className="probot-root",s.style.setProperty("--probot-theme",M);let d=t.createElement("button");d.type="button",d.className="probot-bubble",d.setAttribute("aria-label","Open chat"),d.innerHTML=I();let l=t.createElement("div");l.className="probot-dialog",l.hidden=!0,l.innerHTML=S(n.apiBase),d.addEventListener("click",()=>{l.hidden=!l.hidden}),l.addEventListener("click",m=>{let b=m.target;(b==null?void 0:b.dataset.action)==="close"&&(l.hidden=!0)}),s.appendChild(d),s.appendChild(l),c.appendChild(s);let f;try{let m=await fetch(`${n.apiBase}/api/bots/${encodeURIComponent(n.botId)}/config`,{headers:{Accept:"application/json"}});if(!m.ok)return;f=await m.json()}catch(m){return}let h=A(f);h&&(s.style.setProperty("--probot-theme",h.bot.themeColor),d.setAttribute("aria-label",`Open chat with ${h.bot.name}`),l.innerHTML=B(h,n.apiBase),q(l,t,n.apiBase,n.botId))}function q(o,t,n,e){let c=o.querySelector('[data-role="form"]'),i=o.querySelector('[data-role="input"]'),s=o.querySelector('[data-role="messages"]'),d=o.querySelector('[data-role="body"]'),l=o.querySelector('[data-role="suggestions"]'),f=o.querySelector('[data-role="send"]');if(!c||!i||!s||!f)return;let h=j(e),m=(d==null?void 0:d.dataset.avatarSrc)||null,b=!1;function y(){s.scrollTop=s.scrollHeight}function w(a,r){let u=t.createElement("div");if(u.className=`probot-msg-row probot-msg-row-${a}`,a==="bot"){let $=t.createElement("div");$.innerHTML=_(m,"mini");let T=$.firstElementChild;T&&u.appendChild(T)}let p=t.createElement("div");return p.className=`probot-msg probot-msg-${a}`,a==="bot"?p.innerHTML=H(r):p.textContent=r,u.appendChild(p),s.appendChild(u),y(),p}function k(){let a=t.createElement("div");a.className="probot-msg-row probot-msg-row-bot probot-typing-row";let r=t.createElement("div");r.innerHTML=_(m,"mini");let u=r.firstElementChild;u&&a.appendChild(u);let p=t.createElement("div");return p.className="probot-msg probot-msg-bot probot-typing",p.setAttribute("aria-label","Assistant is typing"),p.innerHTML="<span></span><span></span><span></span>",a.appendChild(p),s.appendChild(a),y(),a}function v(a){b=a,i.disabled=a,f.disabled=a}async function E(a){let r=a.trim();if(!r||b)return;l&&(l.hidden=!0),w("user",r),i.value="",v(!0);let u=k();try{let p=await fetch(`${n}/api/chat/${encodeURIComponent(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:r,sessionId:h})});if(u.remove(),p.status===429){w("bot","This bot is getting a lot of questions right now. Please try again in a minute.");return}if(!p.ok){w("bot","I can't answer here right now. Try the full chat linked below.");return}let $=await p.json(),T=typeof $.reply=="string"&&$.reply.length>0?$.reply:"I didn't get a reply. Please try again.";w("bot",T)}catch(p){u.remove(),w("bot","Network hiccup - please check your connection and try again.")}finally{v(!1),i.focus()}}c.addEventListener("submit",a=>{a.preventDefault(),E(i.value)}),o.addEventListener("click",a=>{var u,p;let r=a.target;if((r==null?void 0:r.dataset.action)==="ask"){let $=(p=(u=r.dataset.question)!=null?u:r.textContent)!=null?p:"";E($)}})}typeof document!="undefined"&&D(document.currentScript);})();
