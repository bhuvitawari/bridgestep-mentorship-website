# BridgeStep Mentorship — Website

A single static page (`index.html`, no build step, no dependencies to install).

## Deploy on GitHub Pages (free hosting)

1. Create a new repository on GitHub (e.g. `bridgestep-website`).
2. Upload `index.html` to the root of the repository (drag-and-drop on the GitHub web UI works fine, or via git):
   ```
   git init
   git add index.html
   git commit -m "Add site"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```
3. In the repository, go to **Settings → Pages**.
4. Under **Source**, choose **Deploy from a branch**, pick branch `main` and folder `/ (root)`, then **Save**.
5. GitHub will give you a live URL within a minute or two, in the form:
   ```
   https://YOUR-USERNAME.github.io/YOUR-REPO/
   ```

## Custom domain (optional)

If you own a domain (e.g. `bridgestepmentorship.org`), add it under **Settings → Pages → Custom domain**, then create a `CNAME` DNS record at your domain registrar pointing to `YOUR-USERNAME.github.io`. GitHub will issue a free HTTPS certificate automatically.

## Editing later

Everything — layout, colors, copy — lives in the single `index.html` file. Open it in any text editor; the `<style>` block at the top controls design tokens (colors, fonts, spacing) under `:root`.
