# <img style="float: left; vertical-align: bottom; " width="35" src="https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg"> [instantgram] v2024.06.04 Summer Feeling :sunglasses:
![GitHub release](https://img.shields.io/badge/release-v2024.06.04-green)

![badge](https://img.shields.io/badge/for-instagram-yellow.svg?style=flat-square)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)

[Versão em Português =)](http://thinkbig-company.github.io/instantgram/lang/pt-br)

[instantgram] is a bookmarklet with the purpose of downloading Instagram images. It is tiny, simple, and doesn't require extensions or downloads. Just access [this link][1] and drag the [instantgram] button to the bookmark bar of your browser, navigate to instagram.com (web), open an Instagram post (photo) and click on the bookmarklet. That's all it takes!

### [:arrow_right: Bookmarklet][1]

![gif demo](img/demo.gif)

:bulb: We have completely rewritten instantgram. \
This is a lite version which supports browsers like firefox with 65kb bookmarklet limit.

## Compatibility

|       Browser        |     Compatible?    |
| -------------------- | -------------------|
| Google Chrome        | :white_check_mark: |
| Mozilla Firefox     | :white_check_mark: |
| Edge on chromium >=80 | :white_check_mark: |
| Edge Legacy*                | :warning:          |
| Internet Explorer 11 | :x: |
*_ apparently Edge Legacy doesn't allow you to drag a button to the bookmark bar


## Roadmap

- ?

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) for more information. :heart:

## Changelog
- v2024.06.04 - [instangram-light] Replaced the old, inefficient webpack build system with Rollup. Also, switched from the Babel minimizer to SWC. Removed the Bookmarkletify dependency and updated Metalsmith to the latest version. Completed an efficient rewrite of all modules to reduce the overall size. Redesigned the UI into tabs to clarify some settings and added some new settings.
- v2024.04.24 - [instangram-light] Fixed, ads not recognized correctly. Shows "Did you open any Instagram post?"
- v2024.04.09 - [instangram-light] Part 2: More fixing CSP errors and fixing wrong update url on new update dialog; Addressed various issues: first, fixed the stories feature that was not working again; second, removed CSP warnings in the developer console; third, ensured proper cleanup after using instantgram.
- v2024.04.08 - [instangram-light] Addressed various issues: first, fixed the stories feature that was not working again; second, removed CSP warnings in the developer console; third, ensured proper cleanup after using instantgram.
- v2024.03.28 - [instangram-light] Fixed issue #10 [Stories no longer working], fixes the error that the text of the modalbox is sometimes white instead of black.
- v2023.10.28 - [instangram-light] Large parts were rewritten. Added profile page avatar download, open any profile url and execute instantgram. FIXED Carousels not working.
- v2023.10.27 - [instangram-light] Large parts were rewritten. Added profile page avatar download, open any profile url and execute instantgram.
- v2023.07.12 - [instangram-light] Fixed storys if [instantgram] was triggered the currently displayed story stopps playback and continues after the modal was closed.
- v2023.07.07 - [instangram-light] Fixed instantgram doesnt do anything.
- v2023.07.06 - [instangram-light] Fixed instantgram doesnt do anything.
- v2023.07.04 - [instangram-light] Fixes a problem where the updater had deleted all settings and therefore instantgram did not work properly. The wishes of Orudeon were implemented. Thus it is now possible to customize the file names as one would like. Last but not least, inline buttons for next image and previous image have been implemented. Small fixes.
- v2023.06.23 - [instangram-light] Used more the styling from big brother [instantgram], fixes issue #1 "Ad images sometimes grabbed".
- v2023.06.01 - [instangram-light] Fix the problem that videos sometimes do not load.\
Fix single story are not covered for media downloading.\
Add support for reels feed.
- v2023.05.13 - [instangram-light] Light edition without modal etc. to keep the 65kb bookmarklet size limit.


[1]:http://thinkbig-company.github.io/instantgram/
