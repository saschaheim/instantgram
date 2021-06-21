const saveData = (function () {
    let existsElement = document.getElementById('instantgram-bulk-downloader-download');
    if (existsElement) {
        existsElement.remove();
    }

    let a = document.createElement('a');
    a.id = 'instantgram-bulk-downloader-download';
    document.body.appendChild(a);
    a.setAttribute('style', 'display: none');
    return function (data, fileName) {
        const url = window.URL.createObjectURL(data);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    };
}());

export default saveData;