import { MediaType } from "./MediaType"

export interface MediaScanResult {
    found?: boolean
    foundByModule?: string
    mediaType?: MediaType
    mediaInfo?: object | null | undefined
    modalBody?: string
    selectedSliderIndex?: number
    userName?: string
    userLink?: string
    errorMessage?: string
    error?: object
}