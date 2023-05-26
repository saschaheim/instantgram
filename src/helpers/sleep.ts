export default function sleep(ms: number): Promise<void> {
    return new Promise(function (resolve) { setTimeout(resolve, ms) });
}