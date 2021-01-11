export default function getHighestResImg(el) {
    if (el.getAttribute('srcset')) {
        var highResImgUrl = ''
        var maxRes = 0
        let imgWidth, urlWidthArr
        el.getAttribute('srcset').split(',').forEach((item) => {
            urlWidthArr = item.trim().split(' ')
            imgWidth = parseInt(urlWidthArr[1])
            if (imgWidth > maxRes) {
                maxRes = imgWidth
                highResImgUrl = urlWidthArr[0]
            }
        })

        return highResImgUrl
    } else {
        return el.getAttribute('src')
    }
}