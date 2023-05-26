export default function stringToByteArray(str: string): Uint8Array {
    const array = new Uint8Array(str.length)

    for (let i = 0; i < str.length; ++i) {
        array[i] = str.charCodeAt(i) & 0xff
    }

    return array
}