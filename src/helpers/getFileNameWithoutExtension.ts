export default function getFileNameWithoutExtension(url: string) {
  if (typeof url !== 'string') throw new Error('url must be a string');
  // Remove the QueryString
  return url.replace(/\?.*$/, '')
    // Extract the filename
    .split('/').pop()
    // Remove the extension
    .replace(/\.[^.]+$/, '')
}