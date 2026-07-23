# <img style="float: left; vertical-align: bottom;" width="35" src="https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg"> [instantgram] v2026.07.23
![GitHub release](https://img.shields.io/badge/release-v2026.07.23-green)

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

- Full history: [CHANGELOG.md](CHANGELOG.md)

- v2026.07.23 - [instantgram] Fixed issue #45 [Many stories now fail to be captured]: stories rendered as an empty, buttonless slider whenever Instagram's reels_media response came back with zero items instead of showing a clear "not found" message. Root-caused this (with a real, confirmed example) to some accounts currently breaking Instagram's web_profile_info endpoint with a server-side schema error; story and profile-picture lookups now fall back to Instagram's search endpoint to resolve the same account id, so those stories and profile pictures load normally again instead of just failing gracefully. Also fixed a related bug where a failed story-owner lookup was misread as "this is a highlight", triggering a second, malformed request. The "not found" message shown for genuine API failures no longer incorrectly asks "did you open a post?" when a valid story/post/profile *was* found -- it now shows an honest, distinct message instead. Added a Vitest test suite covering posts, reels, stories and profiles, built from realistic and, where captured live, verbatim real Instagram API response fixtures, so future Instagram API shape changes surface as a specific failing test instead of a silent empty modal. Normalized repository line endings to CRLF via .gitattributes.
- v2026.05.22 - [instantgram] Maintenance and UX polish release. Added the new auto-expand media option, reduced burst-loading by deferring slide media requests, improved the development workflow so live rebuilds no longer get stuck on stale outputs or rebuild loops, cleaned up the remaining Interconnect barrel indirection, and refined the settings modal with better tab emphasis, integrated notice styling, and smaller visual consistency fixes.
- v2026.05.21 - [instantgram] Follow-up polish release. Reduced the localized bookmarklet output again to stay within Firefox bookmark length limits, shortened internal settings/storage keys, slimmed down the settings modal markup, refined the expand button behavior, paused modal videos while the settings dialog is open, and fixed slideshow handling so disabling slideshow no longer advances slides automatically while videos can still play normally.

[1]: https://saschaheim.github.io/instantgram
