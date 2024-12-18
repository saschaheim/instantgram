# <img style="float: left; vertical-align: bottom; " width="35" src="https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg"> [instantgram] v2024.12.18 Merry Christmas! 🎄🎉
![GitHub release](https://img.shields.io/badge/release-v2024.12.18-green)

![badge](https://img.shields.io/badge/for-instagram-yellow.svg?style=flat-square)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)

[Versão em Português =)](http://saschaheim.github.io/instantgram/lang/pt-br)

[instantgram] is a bookmarklet with the purpose of downloading Instagram images. It is tiny, simple, and doesn't require extensions or downloads. Just access [this link][1] and drag the [instantgram] button to the bookmark bar of your browser, navigate to instagram.com (web), open an Instagram post (photo) and click on the bookmarklet. That's all it takes!

### [:arrow_right: Bookmarklet][1]

![gif demo](img/demo.gif)

:bulb: We have completely rewritten instantgram. \
With this version we support all modern browsers that have ECMAScript 2015 (es6) support.

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
- v2024.12.18 - Inserted comments across the entire code to clarify the logic, steps, and reasoning behind key parts of the implementation. Focused on areas that were previously unclear or complex to ensure the code is easier to follow for future developers.
- v2024.10.07 - [instangram] merged with [instantgram-light] due to the new build system, as we are now under the 65KB limit.
- v2024.06.11 - [instangram] Fixed github pages bug, fixed current slider number often not correct detected...
- v2024.06.06 - [instangram] Replaced the old, inefficient webpack build system with Rollup. Also, switched from the Babel minimizer to SWC. Removed the Bookmarkletify dependency and updated Metalsmith to the latest version. Completed an efficient rewrite of all modules to reduce the overall size. Redesigned the UI into tabs to clarify some settings and added some new settings. Fixed some videos are treated as images. And many more cosmetic fixes...
- v2023.06.01 - [instangram] Complete rewrite of instantgram changed the way this software detects images/videos.\
No more problems if Instagram changes their frontend!\
Added for every post/story a modal to easier select the needed image/video.\
Also it is now possible to click on download and it will starts donwloading instead of open a new tab.\
In the future, options will be introduced with which one can make personal settings that will be taken into account at the next call.
- v2023.04.12 - [instangram] Fixed issue #29 [Sound getting stripped from some videos]. \
Have done some spring cleaning.
- v2022.12.10 - [instangram] Fixed issue #27 [Stories completely nonfunctional]. \
Fixed some other bugs.
- v2022.10.28 - [instangram] Support for the latest backend version of instagram. \
New versioning.
Fixed stories video detection. #23
Fixed wrong order capturing. #24


[1]:http://saschaheim.github.io/instantgram
