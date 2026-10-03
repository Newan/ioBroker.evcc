import axios from 'axios';

export const EVCC_CONTROL_MAPPING: Readonly<Record<string, string>> = {
    bufferStartSoc: 'control.bufferStartSoc',
    prioritySoc: 'control.prioritySoc',
    bufferSoc: 'control.bufferSoc',
    smartCostLimit: 'control.smartCostLimit',
    batteryGridChargeLimit: 'control.batteryGridChargeLimit',
};

/** evcc reports "no value" durations as max int64 nanoseconds, converted to seconds */
const EVCC_DURATION_UNSET = 9223372036;

/**
 * Formats an evcc duration (seconds) as [dd:]hh:mm:ss.
 *
 * @param seconds duration in seconds as reported by evcc /api/state
 * @returns formatted duration, empty string for null/invalid/unset values
 */
export function formatDuration(seconds: unknown): string {
    const total = Number(seconds);
    if (seconds === null || seconds === undefined || !Number.isFinite(total) || total < 0 || total >= EVCC_DURATION_UNSET) {
        return '';
    }
    const s = Math.round(total);
    const days = Math.floor(s / 86400);
    const pad = (n: number): string => String(n).padStart(2, '0');
    const hms = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    return days > 0 ? `${pad(days)}:${hms}` : hms;
}

export function isIgnoredEvccEntry(entry: string): boolean {
    return ['result', 'vehicles', 'loadpoints', 'feedin', 'planer', 'planner', 'forecast'].includes(entry);
}

export function isEmptyEvccValue(value: unknown): boolean {
    return value == null || JSON.stringify(value) === '{}' || JSON.stringify(value) === '[]';
}

export function capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatEvccPathEntry(entry: string): string {
    return isNaN(Number(entry)) ? capitalizeFirst(entry) : entry;
}

/**
 * Tests whether the given variable is a real object and not an Array
 *
 * @param it The variable to test
 */
export function isObject(it: unknown): it is Record<string, any> {
    // This is necessary because:
    // typeof null === 'object'
    // typeof [] === 'object'
    // [] instanceof Object === true
    return Object.prototype.toString.call(it) === '[object Object]';
}

/**
 * Tests whether the given variable is really an Array
 *
 * @param it The variable to test
 */
export function isArray(it: unknown): it is any[] {
    if (Array.isArray != null) {
        return Array.isArray(it);
    }
    return Object.prototype.toString.call(it) === '[object Array]';
}

/**
 * Translates text using the Google Translate API
 *
 * @param text The text to translate
 * @param targetLang The target languate
 * @param yandexApiKey The yandex API key. You can create one for free at https://translate.yandex.com/developers
 */
export async function translateText(text: string, targetLang: string, yandexApiKey?: string): Promise<string> {
    if (targetLang === 'en') {
        return text;
    } else if (!text) {
        return '';
    }
    if (yandexApiKey) {
        return translateYandex(text, targetLang, yandexApiKey);
    }
    return translateGoogle(text, targetLang);
}

/**
 * Translates text with Yandex API
 *
 * @param text The text to translate
 * @param targetLang The target languate
 * @param apiKey The yandex API key. You can create one for free at https://translate.yandex.com/developers
 */
async function translateYandex(text: string, targetLang: string, apiKey: string): Promise<string> {
    if (targetLang === 'zh-cn') {
        targetLang = 'zh';
    }
    try {
        const url = `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${apiKey}&text=${encodeURIComponent(text)}&lang=en-${targetLang}`;
        const response = await axios({ url, timeout: 15000 });
        if (isArray(response.data?.text)) {
            return response.data.text[0];
        }
        throw new Error('Invalid response for translate request');
    } catch (e) {
        throw new Error(`Could not translate to "${targetLang}": ${e}`);
    }
}

/**
 * Translates text with Google API
 *
 * @param text The text to translate
 * @param targetLang The target languate
 */
async function translateGoogle(text: string, targetLang: string): Promise<string> {
    try {
        const url = `http://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}&ie=UTF-8&oe=UTF-8`;
        const response = await axios({ url, timeout: 15000 });
        if (isArray(response.data)) {
            // we got a valid response
            return response.data[0][0][0];
        }
        throw new Error('Invalid response for translate request');
    } catch (e: any) {
        if (e.response?.status === 429) {
            throw new Error(`Could not translate to "${targetLang}": Rate-limited by Google Translate`);
        } else {
            throw new Error(`Could not translate to "${targetLang}": ${e}`);
        }
    }
}
