export default async function getDataFromUrl(url: string) {
    let response = await fetch(url)
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
}