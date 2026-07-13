---
layout: default
title: Docs (GitHub Pages)
nav_order: 9
description: How grudgeDot documentation is published with GitHub Pages + Actions.
permalink: /github-pages/
---

# Docs deployment (GitHub Pages)

This documentation site is published the **recommended** way: a **custom GitHub Actions workflow**, not a raw branch dump of Markdown.

Official references:

- [GitHub Pages overview](https://docs.github.com/en/pages)
- [Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Securing with HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
- [Custom 404 pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site)

## Site type

| Kind | URL shape | This repo |
|------|-----------|-----------|
| User/org site | `https://<user>.github.io/` | No |
| **Project site** | `https://<user>.github.io/<repo>/` | **Yes** → `https://molochdagod.github.io/grudgedot-launcher/` |

Project sites require a correct **`baseurl`** (`/grudgedot-launcher`) so CSS, search, and links resolve. That is set in `docs/_config.yml` and reaffirmed at build time via `actions/configure-pages`.

## Publishing source (required setting)

In the GitHub UI:

1. Open the repo → **Settings** → **Pages**
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**
   - Do **not** use “Deploy from a branch” for this site (that is what produced unthemed trash pages)
3. Ensure the `github-pages` environment exists (created automatically on first Actions deploy)

Workflow file: [`.github/workflows/pages.yml`](https://github.com/MolochDaGod/grudgedot-launcher/blob/main/.github/workflows/pages.yml)

```text
push to main (docs/**)  →  checkout
                        →  configure-pages
                        →  ruby + bundle (docs/)
                        →  jekyll build → docs/_site
                        →  upload-pages-artifact
                        →  deploy-pages
```

## Local preview

```bash
cd docs
bundle install
bundle exec jekyll serve --baseurl ""
# open http://127.0.0.1:4000
```

For a project-site simulation:

```bash
bundle exec jekyll serve --baseurl "/grudgedot-launcher"
# open http://127.0.0.1:4000/grudgedot-launcher/
```

## Content layout

| Path | Role |
|------|------|
| `docs/_config.yml` | Jekyll + just-the-docs (title, `url`, `baseurl`, dark theme) |
| `docs/Gemfile` | Jekyll 4, just-the-docs, SEO, sitemap |
| `docs/*.md` | Pages with `layout: default` and `permalink` |
| `docs/assets/` | CSS, favicon, logo |
| `docs/404.html` | Custom not-found page |

## Editing docs

1. Edit Markdown under `docs/`
2. Keep front matter:

```yaml
---
layout: default
title: My page
nav_order: 10
permalink: /my-page/
---
```

3. Link with Jekyll `{% link path.md %}` or site-relative paths under `{{ site.baseurl }}`
4. Push to `main` (or run **Deploy Docs (GitHub Pages)** → **Run workflow**)

{: .warning }
Do not commit raw unbuilt Markdown as the Pages artifact. Always build with Jekyll so **just-the-docs** CSS, search, and nav ship together.

## HTTPS

Enforce HTTPS under Settings → Pages (GitHub enables this by default for `*.github.io`). See [Securing your GitHub Pages site with HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).

## Custom domain (optional)

To serve docs on e.g. `docs.grudge-studio.com`:

1. Configure the custom domain in **Settings → Pages** (not only a `CNAME` file)
2. Point DNS per [Managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
3. Update `url` / `baseurl` in `docs/_config.yml` (`baseurl: ""` for apex/subdomain root)

## Troubleshooting 404s

See [Troubleshooting 404 errors for GitHub Pages sites](https://docs.github.com/en/pages/getting-started-with-github-pages/troubleshooting-404-errors-for-github-pages-sites).

Common fixes for this repo:

| Symptom | Fix |
|---------|-----|
| Unthemed / “raw Markdown” look | Source must be **GitHub Actions**, not branch |
| CSS 404 | Wrong `baseurl` or build without `configure-pages` |
| Link 404 | Use pretty permalinks + no `.md` in public URLs |
| Deploy skipped | Workflow path filters — edit under `docs/` or dispatch manually |
