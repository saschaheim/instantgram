import localize from './helpers/localize.js';

import searchVideoInFeed from './modules/searchVideoInFeed.js';
import searchImageVideoInStories from './modules/searchImageVideoInStories.js';
import searchVideoInPost from './modules/searchVideoInPost.js';
import searchVideoInModalPost from './modules/searchVideoInModalPost.js';
import searchImageInFeed from './modules/searchImageInFeed.js';
import searchImageInPost from './modules/searchImageInPost.js';
import searchImageInModalPost from './modules/searchImageInModalPost.js';

if (DEV) {
    console.clear();
}

const program = {
    VERSION: VERSION,

    context: {
        hasMsg: false,
        msg: ''
    },

    hostname: window.location.hostname,
    path: window.location.pathname,
    videos: document.querySelectorAll('video'),

    regexHostname: /instagram\.com/,
    regexRootPath: /\//,
    regexPostPath: /^\/p\//,
    regexStoriesURI: /stories\/(.*)+/,

    regexOriginalImage: /\/[a-z]+\d+[a-z]?x\d+[a-z]?/, // ex: url p750x750/
    regexMaxResImage: /\/[a-z]+[1080]+[a-z]?x[1080]+[a-z]?/, // ex: url p1080x1080/

    alertNotInInstagramPost: false,

    foundByModule: null,
    foundVideo: false,
    foundImage: false,
    imageLink: false,
    imageLinkBeforeParse: false,

    setImageLink: function(link) {
        /*this.imageLinkBeforeParse = link;

        if (this.regexMaxResImage.test(link)) {
            this.imageLink = link;
        } else {
            this.imageLink = (this.regexOriginalImage.test(link)) ? link.replace(this.regexOriginalImage, '') : link;
        }*/
		this.imageLink = link;
    }
};

// verify if are running in instagram site
if (!program.regexHostname.test(program.hostname)) {
    window.alert(localize('index@alert_onlyWorks'));
}

/* ===============================
 =            Program            =
 ===============================*/
if (program.regexHostname.test(program.hostname)) {
    if (searchVideoInFeed(program) === false) {
        if (searchImageVideoInStories(program) === false) {
            if (searchVideoInPost(program) === false) {
                if (searchVideoInModalPost(program) === false) {
                    if (searchImageInFeed(program) === false) {
                        if (searchImageInPost(program) === false) {
                            if (searchImageInModalPost(program) === false) {
                                program.context.hasMsg = false;
                            }
                        }
                    }
                }
            }
        }
    }

    if (DEV) {
        console.info('dev mode', program);
    }

    if (program.context.hasMsg) {
        window.alert(localize(program.context.msg));
    }
    if (program.alertNotInInstagramPost && !program.foundVideo && !program.foundImage) {
        window.alert(localize('index#program@alert_dontFound'));
    }
}
/* =====  End of Program  ======*/