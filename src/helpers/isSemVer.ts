const isSemVer = (function () {
    const re = /^(<|>|[=!<>]=)?\s*(\d+(?:\.\d+){0,2})([a-z][a-z0-9\-]*)?$/i

    function get_val(str, include_cmp) {
        let matches = (str + '').match(re)

        return matches ?
            (include_cmp ? (matches[1] || '==') : '') +
            '"' +
            (matches[2] + '.0.0')
                .match(/\d+(?:\.\d+){0,2}/)[0]
                .replace(/(?:^|\.)(\d+)/g, function (_a, b) {
                    return Array(9 - b.length).join('0') + b
                }) +
            (matches[3] || '~') +
            '"'
            :
            (include_cmp ? '==0' : 1)
    }

    return function (base_ver, ..._args: any[]) {
        base_ver = get_val(base_ver, null)

        for (var arg, i = 1; arg = arguments[i++];) {
            if (!(new Function('return ' + base_ver + get_val(arg, 1)))()) {
                return false
            }
        }

        return true
    }
})()

export default isSemVer