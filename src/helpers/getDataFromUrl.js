export default function getDataFromUrl(url, callback) {
    var request = new XMLHttpRequest()
    request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200) {
            callback(request.responseText)
        }
    };
    request.open('GET', url, false)
    request.send()
}