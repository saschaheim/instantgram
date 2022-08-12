export default function getUrlParams(urlOrQueryString: string): any {
  let i = 0
  if ((i = urlOrQueryString.indexOf('?')) >= 0) {
    const queryString = urlOrQueryString.substring(i + 1)
    
    if (queryString) {
      return queryString
        .split('&')
        .map(function (keyValueString) { return keyValueString.split('=') })
        .reduce(function (urlParams, [key, value]) {
          urlParams[key] = decodeURI(value)
          return urlParams
        }, {})
    }
  }

  return {}
}