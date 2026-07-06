/* ProBot widget · MIT · v1 */
"use strict";(()=>{function I(o){var i,s,r,u,l,m,f,h,b,E,$,y;let t=o.replace(/\r\n?/g,`
`).split(`
`),e=[],n=0;for(;n<t.length;){let c=(i=t[n])!=null?i:"";if(/^```/.test(c)){let p=[];for(n++;n<t.length&&!/^```/.test((s=t[n])!=null?s:"");)p.push((r=t[n])!=null?r:""),n++;n++,e.push(`<pre><code>${g(p.join(`
`))}</code></pre>`);continue}let C=c.match(/^(#{1,6})\s+(.+)$/);if(C){let p=C[1].length;e.push(`<h${p}>${H(C[2])}</h${p}>`),n++;continue}if(/^([-*_])\1{2,}\s*$/.test(c)){e.push("<hr>"),n++;continue}if(/^>/.test(c)){let p=[];for(;n<t.length&&/^>/.test((u=t[n])!=null?u:"");)p.push(((l=t[n])!=null?l:"").replace(/^>\s?/,"")),n++;e.push(`<blockquote>${H(p.join("<br>"))}</blockquote>`);continue}if(/^[-*]\s+/.test(c)){let p=[];for(;n<t.length&&/^[-*]\s+/.test((m=t[n])!=null?m:"");){let L=((f=t[n])!=null?f:"").replace(/^[-*]\s+/,"");p.push(`<li>${H(L)}</li>`),n++}e.push(`<ul>${p.join("")}</ul>`);continue}if(/^\d+\.\s+/.test(c)){let p=[];for(;n<t.length&&/^\d+\.\s+/.test((h=t[n])!=null?h:"");){let L=((b=t[n])!=null?b:"").replace(/^\d+\.\s+/,"");p.push(`<li>${H(L)}</li>`),n++}e.push(`<ol>${p.join("")}</ol>`);continue}if(c.trim()===""){n++;continue}let _=[];for(;n<t.length&&((E=t[n])!=null?E:"").trim()!==""&&!/^(#{1,6}\s|>|\`\`\`|[-*]\s|\d+\.\s|([-*_])\2{2,}\s*$)/.test(($=t[n])!=null?$:"");)_.push((y=t[n])!=null?y:""),n++;e.push(`<p>${H(_.join("<br>"))}</p>`)}return e.join("")}function H(o){let t=g(o),e=[];return t=t.replace(/`([^`\n]+)`/g,(n,i)=>`\0C${e.push(`<code>${i}</code>`)-1}\0`),t=t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(n,i,s)=>`<a href="${/^(https?:|mailto:)/i.test(s)?s:"#"}" target="_blank" rel="noopener noreferrer">${i}</a>`),t=t.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"),t=t.replace(/(^|\W)_(.+?)_(\W|$)/g,"$1<em>$2</em>$3"),t=t.replace(/\*(.+?)\*/g,"<em>$1</em>"),t=t.replace(/\x00C(\d+)\x00/g,(n,i)=>{var s;return(s=e[Number(i)])!=null?s:""}),t}function g(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}var B=/^#[0-9a-fA-F]{6}$/,A="#7c5cff";function j(o){return typeof o=="string"&&B.test(o)?o:A}function q(o){if(!o||typeof o!="object")return null;let t=o,e=t.bot,n=t.owner;if(!e||!n)return null;let i=e.id,s=e.name,r=n.username;if(typeof i!="string"||typeof s!="string"||typeof r!="string")return null;let u=Array.isArray(e.suggestedQuestions)?e.suggestedQuestions.filter(l=>typeof l=="string"&&l.length>0):[];return{bot:{id:i,name:s,headline:typeof e.headline=="string"?e.headline:null,themeColor:j(e.themeColor),image:typeof e.image=="string"?e.image:null,suggestedQuestions:u},owner:{username:r,name:typeof n.name=="string"?n.name:null,image:typeof n.image=="string"?n.image:null}}}function P(){return`
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
  `}function M(o,t){let e=t==="header"?"probot-avatar":"probot-avatar-mini";return o?`<img class="${e}" src="${g(o)}" alt="" />`:`<div class="${e} probot-avatar-fallback" aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
        <circle cx="14" cy="20" r="3.4" fill="#fff"/>
        <circle cx="26" cy="20" r="3.4" fill="#fff" opacity="0.65"/>
      </svg>
    </div>`}function D(o,t){var $,y;let{bot:e,owner:n}=o,i=($=n.name)!=null?$:n.username,s=`${t}/u/${encodeURIComponent(n.username)}/chat`,r=(y=e.image)!=null?y:n.image,u=M(r,"header"),l=M(r,"mini"),m=e.suggestedQuestions.length>0,f=m?`<div class="probot-suggested" data-role="suggestions">
         ${e.suggestedQuestions.slice(0,5).map(c=>`<button type="button" class="probot-chip" data-action="ask" data-question="${g(c)}">${g(c)}</button>`).join("")}
       </div>`:"",h=m?`<div class="probot-suggest-list" data-role="suggest-list" hidden>
         <p class="probot-suggest-list-heading">Suggested questions</p>
         <ul class="probot-suggest-list-items">
           ${e.suggestedQuestions.map(c=>`<li><button type="button" class="probot-suggest-list-item" data-action="ask" data-question="${g(c)}">${g(c)}</button></li>`).join("")}
         </ul>
       </div>`:"",b=m?`<button type="button" class="probot-suggest-toggle" data-role="suggest-toggle" aria-label="Suggested questions" aria-expanded="false" hidden>
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M9 18h6"/>
           <path d="M10 22h4"/>
           <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/>
         </svg>
       </button>`:"",E=e.headline?`<div class="probot-subtitle">${g(e.headline)}</div>`:'<div class="probot-subtitle probot-subtitle-online">Online now</div>';return`
    <header class="probot-header">
      <div class="probot-avatar-wrap">
        ${u}
        <span class="probot-online-dot" aria-hidden="true"></span>
      </div>
      <div class="probot-titles">
        <div class="probot-title">
          ${g(i)}
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
          <div class="probot-msg probot-msg-bot">Hi! I'm ${g(e.name)}, ${g(i)}'s AI. Ask me anything.</div>
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
        placeholder="Ask anything about ${g(e.name)}\u2026"
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
      <a href="${g(t)}" target="_blank" rel="noopener noreferrer">
        Powered by ProBot
      </a>
    </footer>
  `}function N(o){if(!o)return null;let t=o.getAttribute("data-bot-id");if(!t)return null;let e=o.getAttribute("data-api-base"),n=typeof e=="string"&&/^https?:\/\//.test(e)?e.replace(/\/$/,""):"https://pro-bot.dev";return{botId:t,apiBase:n}}var R=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;function x(){var n,i;let o=typeof crypto!="undefined"?crypto:void 0;if(o&&typeof o.randomUUID=="function")return o.randomUUID();if(!o||typeof o.getRandomValues!="function")throw new Error("no crypto namespace available");let t=new Uint8Array(16);o.getRandomValues(t),t[6]=((n=t[6])!=null?n:0)&15|64,t[8]=((i=t[8])!=null?i:0)&63|128;let e=Array.from(t,s=>s.toString(16).padStart(2,"0")).join("");return`${e.slice(0,8)}-${e.slice(8,12)}-${e.slice(12,16)}-${e.slice(16,20)}-${e.slice(20)}`}function O(o){let t=`probot.session.${o}`;try{let e=window.localStorage.getItem(t);if(e&&R.test(e))return e;let n=x();return window.localStorage.setItem(t,n),n}catch(e){return x()}}async function W(o,t=document){let e=N(o);if(!e)return;let n=t.createElement("div");n.setAttribute("data-probot-widget",""),t.body.appendChild(n);let i=n.attachShadow({mode:"closed"}),s=t.createElement("style");s.textContent=`/*
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
  /* Black + white spotlight sweep: a mostly-dark ring with a single bright
   * arc that rotates around, mimicking a searchlight beam. Peak brightness
   * at 0deg fades to near-black by 60deg and stays dark for the rest of
   * the circle before wrapping back to bright at 360deg \u2014 combined with
   * \`probot-spin\` it reads as one continuously travelling spot. */
  background: conic-gradient(
    from 0deg,
    #ffffff 0deg,
    #4a4a4a 30deg,
    #0a0a0a 60deg,
    #0a0a0a 300deg,
    #4a4a4a 330deg,
    #ffffff 360deg
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
`,i.appendChild(s),i.addEventListener("error",h=>{let b=h.target;if(!(b instanceof HTMLImageElement))return;let E=b.classList.contains("probot-avatar"),$=b.classList.contains("probot-avatar-mini");if(!E&&!$)return;let y=t.createElement("div");y.innerHTML=M(null,E?"header":"mini");let c=y.firstElementChild;c&&b.replaceWith(c)},!0);let r=t.createElement("div");r.className="probot-root",r.style.setProperty("--probot-theme",A);let u=t.createElement("button");u.type="button",u.className="probot-bubble",u.setAttribute("aria-label","Open chat"),u.innerHTML=P();let l=t.createElement("div");l.className="probot-dialog",l.hidden=!0,l.innerHTML=U(e.apiBase),u.addEventListener("click",()=>{l.hidden=!l.hidden}),l.addEventListener("click",h=>{let b=h.target;(b==null?void 0:b.dataset.action)==="close"&&(l.hidden=!0)}),r.appendChild(u),r.appendChild(l),i.appendChild(r);let m;try{let h=await fetch(`${e.apiBase}/api/bots/${encodeURIComponent(e.botId)}/config`,{headers:{Accept:"application/json"}});if(!h.ok)return;m=await h.json()}catch(h){return}let f=q(m);f&&(r.style.setProperty("--probot-theme",f.bot.themeColor),u.setAttribute("aria-label",`Open chat with ${f.bot.name}`),l.innerHTML=D(f,e.apiBase),F(l,t,e.apiBase,e.botId))}function F(o,t,e,n){let i=o.querySelector('[data-role="form"]'),s=o.querySelector('[data-role="input"]'),r=o.querySelector('[data-role="messages"]'),u=o.querySelector('[data-role="body"]'),l=o.querySelector('[data-role="suggestions"]'),m=o.querySelector('[data-role="suggest-list"]'),f=o.querySelector('[data-role="suggest-toggle"]'),h=o.querySelector('[data-role="send"]');if(!i||!s||!r||!h)return;function b(a){!m||!f||(m.hidden=!a,f.setAttribute("aria-expanded",a?"true":"false"),f.classList.toggle("probot-suggest-toggle-active",a))}let E=O(n),$=(u==null?void 0:u.dataset.avatarSrc)||null,y=!1;function c(){r.scrollTop=r.scrollHeight}function C(a,v){let w=t.createElement("div");if(w.className=`probot-msg-row probot-msg-row-${a}`,a==="bot"){let k=t.createElement("div");k.innerHTML=M($,"mini");let T=k.firstElementChild;T&&w.appendChild(T)}let d=t.createElement("div");return d.className=`probot-msg probot-msg-${a}`,a==="bot"?d.innerHTML=I(v):d.textContent=v,w.appendChild(d),r.appendChild(w),c(),d}function _(){let a=t.createElement("div");a.className="probot-msg-row probot-msg-row-bot probot-typing-row";let v=t.createElement("div");v.innerHTML=M($,"mini");let w=v.firstElementChild;w&&a.appendChild(w);let d=t.createElement("div");return d.className="probot-msg probot-msg-bot probot-typing",d.setAttribute("aria-label","Assistant is typing"),d.innerHTML="<span></span><span></span><span></span>",a.appendChild(d),r.appendChild(a),c(),a}function p(a){y=a,s.disabled=a,h.disabled=a}async function L(a){let v=a.trim();if(!v||y)return;l&&(l.hidden=!0),f&&(f.hidden=!1),b(!1),C("user",v),s.value="",p(!0);let w=_();try{let d=await fetch(`${e}/api/chat/${encodeURIComponent(n)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:v,sessionId:E})});if(w.remove(),d.status===429){C("bot","This bot is getting a lot of questions right now. Please try again in a minute.");return}if(!d.ok){C("bot","I can't answer here right now. Try the full chat linked below.");return}let k=await d.json(),T=typeof k.reply=="string"&&k.reply.length>0?k.reply:"I didn't get a reply. Please try again.";C("bot",T)}catch(d){w.remove(),C("bot","Network hiccup - please check your connection and try again.")}finally{p(!1),s.focus()}}i.addEventListener("submit",a=>{a.preventDefault(),L(s.value)}),o.addEventListener("click",a=>{var k,T;let v=a.target;if(!v)return;if(v.closest('[data-role="suggest-toggle"]')){b((m==null?void 0:m.hidden)!==!1);return}let d=v.closest('[data-action="ask"]');if(d){let S=(T=(k=d.dataset.question)!=null?k:d.textContent)!=null?T:"";L(S)}})}typeof document!="undefined"&&W(document.currentScript);})();
