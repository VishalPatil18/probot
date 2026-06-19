/* ProBot widget · MIT · v1 */
"use strict";(()=>{function i(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}var b=/^#[0-9a-fA-F]{6}$/,m="#7c5cff";function f(t){return typeof t=="string"&&b.test(t)?t:m}function h(t){if(!t||typeof t!="object")return null;let o=t,e=o.bot,n=o.owner;if(!e||!n)return null;let r=e.id,a=e.name,d=n.username;if(typeof r!="string"||typeof a!="string"||typeof d!="string")return null;let u=Array.isArray(e.suggestedQuestions)?e.suggestedQuestions.filter(s=>typeof s=="string"&&s.length>0):[];return{bot:{id:r,name:a,headline:typeof e.headline=="string"?e.headline:null,themeColor:f(e.themeColor),suggestedQuestions:u},owner:{username:d,name:typeof n.name=="string"?n.name:null,image:typeof n.image=="string"?n.image:null}}}function _(){return`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7
               8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8
               8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1
               8 8v.5z" />
    </svg>
  `}function v(t,o){var s;let{bot:e,owner:n}=t,r=(s=n.name)!=null?s:n.username,a=`${o}/u/${encodeURIComponent(n.username)}/chat`,d=n.image?`<img class="probot-avatar" src="${i(n.image)}" alt="${i(r)}" />`:'<div class="probot-avatar" aria-hidden="true"></div>',u=e.suggestedQuestions.length>0?`<p class="probot-suggested-label">Suggested questions</p>
         <ul class="probot-suggested">
           ${e.suggestedQuestions.slice(0,4).map(l=>`<li>${i(l)}</li>`).join("")}
         </ul>`:"";return`
    <header class="probot-header">
      ${d}
      <div class="probot-titles">
        <div class="probot-title">${i(r)}</div>
        ${e.headline?`<div class="probot-subtitle">${i(e.headline)}</div>`:""}
      </div>
      <button type="button" class="probot-close" aria-label="Close" data-action="close">\xD7</button>
    </header>
    <div class="probot-body">
      <p class="probot-greeting">Hi! I'm ${i(e.name)}, ${i(r)}'s AI.</p>
      <div class="probot-notice">
        Widget chat is in preview. Open the full conversation to talk to me.
      </div>
      <a class="probot-cta" href="${i(a)}" target="_blank" rel="noopener noreferrer">
        Open full chat \u2197
      </a>
      ${u}
    </div>
    <footer class="probot-footer">
      <a href="${i(o)}" target="_blank" rel="noopener noreferrer">
        Powered by ProBot
      </a>
    </footer>
  `}function y(t){if(!t)return null;let o=t.getAttribute("data-bot-id");if(!o)return null;let e=t.getAttribute("data-api-base"),n=typeof e=="string"&&/^https?:\/\//.test(e)?e.replace(/\/$/,""):"https://probot.dev";return{botId:o,apiBase:n}}async function C(t,o=document){let e=y(t);if(!e)return;let n;try{let g=await fetch(`${e.apiBase}/api/bots/${encodeURIComponent(e.botId)}/config`,{headers:{Accept:"application/json"}});if(!g.ok)return;n=await g.json()}catch(g){return}let r=h(n);if(!r)return;let a=o.createElement("div");a.setAttribute("data-probot-widget",""),o.body.appendChild(a);let d=a.attachShadow({mode:"closed"}),u=o.createElement("style");u.textContent=`/*
 * ProBot widget styles. All selectors are scoped to the Shadow DOM root the
 * widget creates \u2014 there is no \`:host { all: initial }\` reset because
 * \`mode: "closed"\` already isolates from host-page styles.
 *
 * Theme color is applied per-instance via the \`--probot-theme\` CSS custom
 * property (set inline on the shadow root).
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
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
    "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.4;
  color: var(--probot-text);
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2147483647;
}

.probot-bubble {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--probot-theme);
  border: none;
  cursor: pointer;
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.15),
    0 4px 10px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: transform 0.15s ease-out;
  padding: 0;
}

.probot-bubble:hover {
  transform: scale(1.05);
}

.probot-bubble:active {
  transform: scale(0.97);
}

.probot-bubble svg {
  width: 28px;
  height: 28px;
}

.probot-dialog {
  position: absolute;
  bottom: 76px;
  right: 0;
  width: 360px;
  max-height: 540px;
  background: var(--probot-surface);
  border-radius: 16px;
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

.probot-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--probot-border);
}

.probot-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
  background: #f4f4f5;
}

.probot-titles {
  flex: 1;
  min-width: 0;
}

.probot-title {
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.probot-subtitle {
  color: var(--probot-muted);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
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
}

.probot-close:hover {
  background: #f4f4f5;
  color: var(--probot-text);
}

.probot-body {
  padding: 18px 16px 12px;
  overflow-y: auto;
  flex: 1;
}

.probot-greeting {
  font-size: 14px;
  margin-bottom: 6px;
}

.probot-notice {
  background: #f4f4f5;
  color: var(--probot-muted);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12.5px;
  margin-bottom: 14px;
  border: 1px solid var(--probot-border);
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
  margin-bottom: 16px;
  transition: filter 0.15s ease-out;
}

.probot-cta:hover {
  filter: brightness(0.95);
}

.probot-suggested-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--probot-muted);
  margin-bottom: 8px;
}

.probot-suggested {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.probot-suggested li {
  padding: 8px 12px;
  border: 1px solid var(--probot-border);
  border-radius: 10px;
  color: var(--probot-text);
  font-size: 13px;
  background: var(--probot-surface);
}

.probot-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--probot-border);
  text-align: center;
}

.probot-footer a {
  color: var(--probot-muted);
  font-size: 11px;
  text-decoration: none;
}

.probot-footer a:hover {
  color: var(--probot-text);
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
    max-height: calc(100vh - 110px);
  }
}
`,d.appendChild(u);let s=o.createElement("div");s.className="probot-root",s.style.setProperty("--probot-theme",r.bot.themeColor);let l=o.createElement("button");l.type="button",l.className="probot-bubble",l.setAttribute("aria-label",`Open chat with ${r.bot.name}`),l.innerHTML=_();let c=o.createElement("div");c.className="probot-dialog",c.hidden=!0,c.innerHTML=v(r,e.apiBase),l.addEventListener("click",()=>{c.hidden=!c.hidden}),c.addEventListener("click",g=>{let p=g.target;(p==null?void 0:p.dataset.action)==="close"&&(c.hidden=!0)}),s.appendChild(l),s.appendChild(c),d.appendChild(s)}typeof document!="undefined"&&C(document.currentScript);})();
