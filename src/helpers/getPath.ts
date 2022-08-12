export default function getPath(url, defaults) {
	var reUrlPath = /(?:\w+:)?\/\/[^\/]+([^?#]+)/
	var query = /(?:\w+:)?\/\/[^\/]+([^?#]+)([^\?]+)(\?.*)?/
	var urlParts = url.match(reUrlPath) || [url, defaults]
	
	return urlParts.pop() + url.match(query).pop()
}