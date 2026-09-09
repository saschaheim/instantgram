# <img width="280" height="48" src="apps/site/public/img/readme-wordmark-aligned.svg" alt="instantgram">

[![Release](https://img.shields.io/badge/release-v2026.09.09-198754?style=for-the-badge)](CHANGELOG.md)
[![For Instagram](https://img.shields.io/badge/for-Instagram-E4405F?style=for-the-badge)](https://www.instagram.com/)
[![Powered by Preact](https://img.shields.io/badge/UI-Preact-673AB8?style=for-the-badge)](https://preactjs.com/)
[![Firefox Lite](https://img.shields.io/badge/Firefox-Lite-FF7139?style=for-the-badge)](https://saschaheim.github.io/instantgram/#firefox)

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/instantgram)
[![Patreon](https://img.shields.io/badge/Patreon-Support-F96854?style=for-the-badge&logo=patreon&logoColor=white)](https://patreon.com/instantgram)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Support-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/instantgram)
[![PayPal](https://img.shields.io/badge/PayPal-Donate-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/saschaheimdev)

**Download Instagram posts, reels, stories and profile pictures directly from your bookmarks bar.**

No extension. No separate app. No account hand-off. Open Instagram, click instantgram, and the media viewer is ready.

## Get Instantgram

### [Open the install page and drag instantgram to your bookmarks bar][1]

1. Drag the instantgram button into your browser's bookmarks bar.
2. Open a supported post, reel, story or profile on `instagram.com`.
3. Click the bookmark and download the media you want.

## The 2026.09.09 Release

This maintenance release restores Firefox Lite installation and includes two community fixes by [Kaique Gazola (@kaiquegazola)](https://github.com/kaiquegazola).

- **Firefox Lite installs again:** the release build now measures the complete `javascript:` URL, stays below Firefox's 65,536-character limit and fails if a generated Lite bookmarklet is too large.
- **Full-resolution profile pictures:** the full build checks Instagram's original-resolution candidates instead of settling for a thumbnail (#51).
- **Isolated modal styles:** Instantgram now renders inside a shadow root, preventing its CSS from changing Instagram's interface or remaining behind after the modal closes (#52).

## The 2026.08.02 Release

This is the biggest instantgram upgrade in years. The bookmarklet has evolved from a collection of dialogs into a compact, reactive app that still launches from a single bookmark.

The latest follow-up makes that app easier to recover and keeps Firefox support alive at the absolute edge: settings now include a discreet Instantgram reset that removes current and legacy Instantgram data without touching Instagram, while Firefox Lite retains its updater, scanners, settings and diagnostics at exactly the browser's 65,536-character bookmarklet limit.

- **A real reactive interface:** the complete media viewer now runs on Preact, with smooth in-place transitions instead of tearing down and reopening modals.
- **A better media experience:** polished sliders, stable video playback, live slideshow controls, instant settings updates and persistent expand state.
- **Smarter Instagram detection:** stronger handling for posts, reels, stories, profiles and sponsored content, including feed and search fallbacks for Instagram API edge cases.
- **Settings that feel native:** clearer cards, live language switching, persistent preferences and consistent controls throughout the app.
- **Four languages:** English ships in the release bundle; German, Spanish and Portuguese can load directly through Instagram and remain cached locally.
- **Firefox gets its own build:** Firefox Lite keeps every scanner, setting and console diagnostic, trims update-checking to a single alert and drops purely decorative styling (rounded corners, hover transitions, drop shadows) -- the combination that actually fits under Firefox's strict bookmarklet limit, with room to spare.
- **A refreshed install page:** copy across all four languages now matches the real feature set instead of undersold "single image" wording, and the hero preview plays a looping clip at its real length instead of being cut short.
- **A way to say thanks:** Ko-fi, Patreon, Buy Me a Coffee and PayPal links on the install page and right inside the bookmarklet's own settings, in every build including Firefox Lite.
- **A modern foundation:** pnpm workspaces, Turbo, Astro 7, TypeScript, Preact and a deterministic Vitest suite make future fixes dramatically easier to ship.

## Features

| Capability | Included |
| --- | --- |
| Posts and carousels | :white_check_mark: |
| Reels and videos | :white_check_mark: |
| Stories and highlights | :white_check_mark: |
| Profile pictures | :white_check_mark: |
| Direct download or new tab | :white_check_mark: |
| Automatic slideshow | :white_check_mark: |
| Video and story mute controls | :white_check_mark: |
| Custom download filenames | :white_check_mark: |
| Expandable media viewer | :white_check_mark: |
| Monetized posts | Not currently supported |

## Browser Support

| Browser | Support |
| --- | --- |
| Google Chrome | Full |
| Microsoft Edge | Full |
| Mozilla Firefox | Firefox Lite build |
| Safari | Modern versions |
| Internet Explorer 11 | Not supported |

Firefox enforces a much smaller bookmarklet size limit than Chromium browsers. Use the dedicated **Firefox Lite** button on the install page; it trims update-checking to a single alert and drops decorative styling, not media scanners, settings or diagnostics.

## Development

The repository is a pnpm monorepo:

- `packages/bookmarklet` contains the Preact bookmarklet application.
- `apps/site` contains the Astro install site and GitHub Pages output.

```bash
pnpm install
pnpm test
pnpm lint
pnpm build
```

The full build creates localized development bundles, production bookmarklets, the Firefox Lite variant and the static GitHub Pages site.

## Contributing

Bug reports are most useful with browser, console and network details attached. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Changelog

Read the complete release history in [CHANGELOG.md](CHANGELOG.md).

[1]: https://saschaheim.github.io/instantgram
