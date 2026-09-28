# waxum docs

Source for **[waxum.imtaqin.id](https://waxum.imtaqin.id)**, the documentation of
[waxum](https://github.com/imtaqin/waxum). waxum is a multi-session WhatsApp REST
API gateway written in Rust. Each session runs on either the unofficial
multi-device protocol (QR / pair code) or Meta's official WhatsApp Cloud API,
behind the same REST surface.

Built with [Docusaurus](https://docusaurus.io/).

## What's here

| Path | Content |
|---|---|
| `docs/intro.md`, `getting-started.md`, `installation.md`, `authentication.md`, `dashboard.md` | Guides |
| `docs/api/*.md` | API reference, one page per area (sessions, messages, groups, webhooks, Cloud API, ...) |
| `static/llms.txt` | Short index for LLM crawlers and agents (see [llmstxt.org](https://llmstxt.org)) |
| `static/llms-full.txt` | Every docs page concatenated, for agents that read the whole reference in one fetch |
| `static/robots.txt` | Crawl rules and sitemap location |

`llms.txt` and `llms-full.txt` are maintained by hand. When you add or change
a page, update `llms.txt` if the page's scope changed, and regenerate
`llms-full.txt` so it matches the pages again.

Every page carries `description` and `keywords` frontmatter, used for search
engine metadata. Keep those accurate when a page changes.

## Develop

Requires Node 22 and pnpm 10.

```bash
pnpm install
pnpm start        # dev server with live reload at http://localhost:3000
pnpm build        # static site into build/
pnpm serve        # preview the production build
pnpm typecheck
```

## Deploy

Every push to `main` builds the site and deploys it to GitHub Pages
(`.github/workflows/deploy.yml`). There is no manual step.

## Contributing

Docs changes go through a pull request against `main`. When documenting a new
waxum endpoint, match the page's existing structure: route, request body,
response, then edge cases. Say which waxum version introduced the behavior when
it matters to existing integrations.
