import getUrlParams from "./getUrlParams"

export default async function getDataFromIGUrl(url: string, query: string, neededFilename: string, posts = []): Promise<any> {
  return new Promise((resolve, reject) => fetch(url + query)
    .then(response => {
      if (response.status !== 200) {
        throw `${response.status}: ${response.statusText}`
      }

      response.text().then(data => {
        let jsonData = JSON.parse(data)
        posts = posts.concat(jsonData.data)

        console.log(data.includes(neededFilename))

        if (jsonData.data.user.edge_owner_to_timeline_media.page_info.has_next_page && !data.includes(neededFilename)) {
          //let urlQueryObj = getUrlParams(url)

          let parsedQueryParams = JSON.parse(query)
          console.log(parsedQueryParams)
          parsedQueryParams.after = jsonData.data.user.edge_owner_to_timeline_media.page_info.end_cursor

          getDataFromIGUrl(url, String(`${JSON.stringify(parsedQueryParams)}`), neededFilename, posts).then(resolve).catch(reject)
        } else {
          resolve(posts)
        }
      }).catch(reject)
    }).catch(reject))
}