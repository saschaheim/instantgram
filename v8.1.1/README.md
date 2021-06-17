# <img style="float: left; vertical-align: bottom; " width="35" src="https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg"> [instantgram] v8.1.1
![GitHub release](https://img.shields.io/badge/release-v8.1.1-blue)

![badge](https://img.shields.io/badge/for-instagram-yellow.svg?style=flat-square)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)

[Versão em Português =)](http://thinkbig-company.github.io/instantgram/lang/pt-br)

[instantgram] is a bookmarklet with the purpose of downloading Instagram images. It is tiny, simple, and doesn't require extensions or downloads. Just access [this link][1] and drag the [instantgram] button to the bookmark bar of your browser, navigate to instagram.com (web), open an Instagram post (photo) and click on the bookmarklet. That's all it takes!

### [:arrow_right: Bookmarklet][1]

![gif demo](img/demo.gif)

:bulb: We have completely rewritten instantgram. \
With this version we support all modern browsers that have ECMAScript 2015 (es6) support.

## Compatibility

|       Browser        |     Compatible?    |
| -------------------- | -------------------|
| Google Chrome        | :white_check_mark: |
| Mozilla Firefox >=38 | :white_check_mark: |
| Edge on chromium >=80 | :white_check_mark: |
| Edge*                | :warning:          |
| Internet Explorer 11 | :x: |
*_apparently Edge doesn't allow you to drag a button to the bookmark bar_

## Roadmap

- ~~a way of notify updates in [instantgram]~~ :heavy_check_mark: in v2.0.0
- ~~make a gif explaining the [instantgram]~~ :heavy_check_mark:
- ~~video :smirk_cat:~~ :heavy_check_mark: in v2.2.0

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) for more information. :heart:

## Changelog
- v8.1.1 - [instangram] Fix video are not downloadable in feed in due of commented out variable.
- v8.1.0 - [instangram] Re-designed video downloader to handle encrypted videos.
- v8.0.2 - [instangram] Fixed updater that had displayed an old version.
- v8.0.1 - [instangram] Added spanish language.
- v8.0.0 - [instangram] Migrate to typescript which has fixed many bugs.
- v7.1.2 - [instangram] Fix update dialog styling.
- v7.1.1 - [instangram] Fix video download on some situations.
- v7.1.0 - [instangram] Re-design update dialog.
- v7.0.1 - [instangram] Fix update handler.
- v7.0.0 - [instangram] Fix get highest image on every post or story.
- v6.0.0 - [instangram] Biggest Update ever! \
Added support for blob videos, means all videos can be downloaded again. \
Supports the new and old story layout. \
Replaced native browser dialog with own for nicer display. \
The removed update checker in version 4.0 is available again. \
This version should now work properly and display all errors in the console correctly.
- v5.2.0 - [instangram] Refactor Languages.
- v5.1.1 - [instangram] Fix set language: undefined in dev console.
- v5.1.0 - [instangram] Instagram changed their stories design to a new one. And this update adress this new design and make it compatible again.
- v5.0.0 - [instangram] We have completely rewritten instantgram. \
With this version we support all modern browsers that have ECMAScript 2015 (es6) support. 
- v4.0.0 - [instangram] now working again with full support of all media types also recognizes canvas images.\
Also it has now support for multiple images videos in any site feed or post with modal. 
- v2.4.0 - [instangram] now supports Stories.
- v2.3.0 - [instangram] now supports localization, both app and website. Initially it has en-US and pt-BR. You can help us translate [instantgram] for your language! Cool? Read [contributing](CONTRIBUTING.md) for more information.
- v2.2.0 - [instantgram] now supports video too! :movie_camera:
- After v2.0.0, [instantgram] has your data saved in `localStorage` and can be accessed entering `localStorage.getItem('instantgram')` in console inside instagram.com. If you can't access this item, you may be using a version before v2.0.0.


[1]:http://thinkbig-company.github.io/instantgram