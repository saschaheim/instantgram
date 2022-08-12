export default async function getHighestResImg(el: any) {
    if (el.getAttribute('srcset')) {
        let urlWidthArr = []
        el.getAttribute('srcset').split(',').forEach((item) => {
            urlWidthArr.push(item.trim().split(' '))
        })

        // Add original src element if exists
        if (el.hasAttribute('src') && el.getAttribute('src').length > 0) {
            let obj = {}
            obj[0] = el.getAttribute('src')
            obj[1] = 'undefined'
            urlWidthArr.unshift(obj)
        }

        let maxRes: number = 0
        let imgWidthHeight: number
        let highResImgUrl = ''
        for (let i = 0; i < urlWidthArr.length; i++) {
            let _dimensions = await getImageDimensions(urlWidthArr[i][0]) as any
            let _width = _dimensions.width as number
            let _height = _dimensions.height as number

            imgWidthHeight = (_width * _height)
            if (imgWidthHeight > maxRes) {
                maxRes = imgWidthHeight
                highResImgUrl = urlWidthArr[i][0]
            }
        }

        if (highResImgUrl.length > 0) {
            return highResImgUrl
        } else {
            return false
        }
    } else {
        if (el.hasAttribute('src') && el.getAttribute('src').length > 0) {
            return el.getAttribute('src')
        } else {
            return false
        }
    }
}

const getImageDimensions = (src: any) => new Promise((resolve, reject) => {
    const img = new Image()

    // the following handler will fire after the successful loading of the image
    img.onload = () => {
        const {
            naturalWidth: width,
            naturalHeight: height
        } = img

        resolve({
            width,
            height
        }) as any
    }

    // and this handler will fire if there was an error with the image (like if it's not really an image or a corrupted one)
    img.onerror = () => {
        reject('There was some problem with the image.')
    }

    img.src = src
})