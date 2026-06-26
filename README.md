<p align="center">
  <img src="./src/app/icon.svg" alt="ProBot logo" width="80" height="80">
</p>

<h1 align="center">ProBot</h1>

<p align="center">
  <strong>Don't just send a resume. Send a representative.</strong><br>
  Turn your resume into an AI chatbot that answers recruiters' questions in your voice, 24/7.
</p>

<p align="center">
  <a href="https://pro-bot.dev"><strong>Website</strong></a> ·
  <a href="https://pro-bot.dev/docs"><strong>Docs</strong></a> ·
  <a href="https://www.npmjs.com/package/probot-chatbot"><strong>Package</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License">
  <img src="https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white" alt="Next.js 14">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.6">
  <img src="https://img.shields.io/badge/LLM-BYO%20Key-2563eb" alt="BYO LLM Key">
  <img src="https://img.shields.io/npm/v/probot-chatbot.svg" alt="pro-bot npm package">
</p>

---

ProBot is a **free, open-source, BYO-key** chatbot platform for job seekers. Paste your resume and bio, pick an LLM provider (Anthropic, OpenAI, Azure OpenAI, Google Gemini), and bring **your own** API key. Recruiters chat with your bot at a public URL or via a one-line embeddable widget. Use the hosted app at [pro-bot.dev](https://pro-bot.dev), or self-host it - your data, your keys, always.

## Built with Spec-Driven Development

ProBot is built spec-first: write the spec, derive the plan, then ship in small, verifiable slices with a documented build log behind every change. That discipline is why the codebase stays consistent and the security guarantees (BYO-key, no key logging, envelope encryption) hold end to end.

## Get started

<p align="center">
  <video src="https://res.cloudinary.com/dbjdu0hvl/video/upload/v1782434715/probot/demo_mn8yv1.mp4" controls width="720">
    Demo - your viewer doesn't support inline playback. <a src="https://res.cloudinary.com/dbjdu0hvl/video/upload/v1782434715/probot/demo_mn8yv1.mp4">Watch it directly.</a>
  </video>
</p>

- **Watch the demo:** a one-minute walkthrough of building a bot.
- **Use it:** [pro-bot.dev](https://pro-bot.dev) - sign up and build a bot in minutes.
- **Run it locally:** [QUICKSTART.md](QUICKSTART.md)
- **Read the docs:** [pro-bot.dev/docs](https://pro-bot.dev/docs)

## Embed it anywhere

Add a ProBot to any site with one script tag, or install the [`probot-chatbot`](https://www.npmjs.com/package/probot-chatbot) npm package:

```html
<script
  src="https://unpkg.com/probot-chatbot@latest/dist/probot-chatbot.js"
  data-bot-id="YOUR_BOT_ID"
  async
></script>
```

```bash
npm i probot-chatbot
```

npm: [npmjs.com/package/probot-chatbot](https://www.npmjs.com/package/probot-chatbot) · See [packages/probot-chatbot](packages/probot-chatbot).

## How it works

- [ARCHITECTURE.md](ARCHITECTURE.md) - the stack and how a chat request flows.
- [BYO-KEY.md](BYO-KEY.md) - where your LLM key goes (and doesn't).
- [KEY-STORAGE.md](KEY-STORAGE.md) - managed key storage and KEK rotation.

## Contributing

PRs welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md) and look for [`good first issue`](https://github.com/vishalpatil18/probot/labels/good%20first%20issue). By contributing you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

Please don't open public issues for vulnerabilities - see [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
