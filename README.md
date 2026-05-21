# <img style="float: left; vertical-align: bottom;" width="35" src="https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg"> [instantgram] v2026.05.22
![GitHub release](https://img.shields.io/badge/release-v2026.05.22-green)

![badge](https://img.shields.io/badge/for-instagram-yellow.svg?style=flat-square)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://standardjs.com/)

[Portuguese version](https://saschaheim.github.io/instantgram/lang/pt-br/?force=true)

[instantgram] is a bookmarklet for downloading Instagram media. It is tiny, simple, and does not require extensions or extra downloads. Open [this link][1], drag the [instantgram] button to your browser's bookmarks bar, navigate to instagram.com, open an Instagram post, and click the bookmarklet. That's it.

### [:arrow_right: Bookmarklet][1]

![gif demo](img/demo.gif)

:bulb: instantgram has been completely rewritten. \
This version supports all modern browsers with ECMAScript 2015 (ES6) support.

## Compatibility

| Browser | Compatible? |
| ------- | ----------- |
| Google Chrome | :white_check_mark: |
| Mozilla Firefox | :white_check_mark: |
| Edge on Chromium >= 80 | :white_check_mark: |
| Edge Legacy* | :warning: |
| Internet Explorer 11 | :x: |

*_ Apparently Edge Legacy does not allow dragging a button to the bookmarks bar.

## Roadmap

- Ongoing maintenance, bug fixes, and Instagram compatibility updates.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) for more information. :heart:

## Changelog

- v2026.05.22 - [instantgram] Maintenance and UX polish release. Added the new auto-expand media option, reduced burst-loading by deferring slide media requests, improved the development workflow so live rebuilds no longer get stuck on stale outputs or rebuild loops, cleaned up the remaining Interconnect barrel indirection, and refined the settings modal with better tab emphasis, integrated notice styling, and smaller visual consistency fixes.
- v2026.05.21 - [instantgram] Follow-up polish release. Reduced the localized bookmarklet output again to stay within Firefox bookmark length limits, shortened internal settings/storage keys, slimmed down the settings modal markup, refined the expand button behavior, paused modal videos while the settings dialog is open, and fixed slideshow handling so disabling slideshow no longer advances slides automatically while videos can still play normally.
- v2026.05.20 - [instantgram] Large refactor and feature update release. Split oversized helper/style modules into focused files, improved modal handling and race-condition safety, added loader feedback, added expand mode for media, improved slider progress/playback behavior, added live settings updates for the open modal, added a separate mute setting for regular videos, improved profile/story/post detection and URL handling, restored browser/debug logging, switched to language-specific bookmarklet builds with multiple drag buttons on the overview page, and cleaned up the build pipeline so each locale now ships its own dedicated bundle.
- v2024.12.18 - Inserted comments across the entire code to clarify the logic, steps, and reasoning behind key parts of the implementation. Focused on areas that were previously unclear or complex to ensure the code is easier to follow for future developers.
- v2024.10.07 - [instantgram] Merged with [instantgram-light] due to the new build system, keeping the bookmarklet under the 65 KB limit.
- v2024.06.11 - [instantgram] Fixed a GitHub Pages bug and improved slider index detection.
- v2024.06.06 - [instantgram] Replaced the old webpack build with Rollup, switched minification from Babel to SWC, removed the Bookmarkletify dependency, updated Metalsmith, reduced overall bundle size, redesigned the UI into tabs, added new settings, fixed videos being treated as images, and shipped multiple cosmetic fixes.
- v2023.06.01 - [instantgram] Complete rewrite of the media detection system. This made post/story selection more robust against Instagram frontend changes, added a media picker modal for posts and stories, and allowed direct downloads instead of always opening a new tab.
- v2023.04.12 - [instantgram] Fixed issue #29 [Sound getting stripped from some videos] and did some general cleanup.
- v2022.12.10 - [instantgram] Fixed issue #27 [Stories completely nonfunctional] and several related bugs.
- v2022.10.28 - [instantgram] Added support for the latest Instagram backend version, introduced new versioning, fixed stories video detection (#23), and fixed incorrect order capturing (#24).

[1]: https://saschaheim.github.io/instantgram
