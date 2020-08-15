export default function searchImageVideoInStories(program) {
    var found = false;

    if (program.regexStoriesURI.test(program.path)) {

        /* ======================================
         =     Search image/video in stories    =
         ===================================== */
        try {
            const $root = document.getElementById('react-root');

            const $video = $root.querySelectorAll('video > source');
            const $img = $root.querySelectorAll('img[srcset]');

            let story = '';
            if ($video.length > 0) {
                story = $video[0].src;
            } else {
                if ($img.length == 1) {
                    story = $img[0].src;
                }
            }

            if (story) {
                program.setImageLink(story);

                window.open(program.imageLink);
                found = true;
                program.foundImage = true;
                program.foundByModule = 'searchImageVideoInStories';
            }

            if (found === false) {
                if (program.videos.length > 0) {
                    let videoLink = program.videos[0].src;

                    if (!videoLink && program.videos[0].children) {
                        videoLink = program.videos[0].children[0].src;
                    }

                    if (videoLink) {
                        window.open(videoLink);
                        found = true;
                        program.foundVideo = true;
                        program.foundByModule = 'searchImageVideoInStories';
                        program.alertNotInInstagramPost = true; // if don't find nothing, alert to open the post
                    }
                }
            }

        } catch (e) {
            console.error('searchImageVideoInStories()', `[instantgram] ${program.VERSION}`, e);
        }
        /* =====  End of search image/video in stories  ======*/

    }

    return found;
}