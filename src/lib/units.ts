/**
 * Units and roles for evcc status values.
 *
 * Only fields whose unit was verified against a live evcc 0.316 instance (incl. an active charging session)
 * are listed. Unknown fields keep role "value" without unit.
 * Note: evcc mixes units, e.g. chargeTotalImport/pvEnergy are kWh, chargedEnergy/todayEnergy are Wh.
 */

/** Unit and role of a status field. `{currency}` is replaced by the evcc currency (e.g. €). */
export interface EvccFieldMeta {
    unit?: string;
    role: string;
}

/** Placeholder replaced by the currency configured in evcc. */
export const CURRENCY_PLACEHOLDER = '{currency}';

const power: EvccFieldMeta = { unit: 'W', role: 'value.power' };
const energyWh: EvccFieldMeta = { unit: 'Wh', role: 'value.energy' };
const energyKWh: EvccFieldMeta = { unit: 'kWh', role: 'value.energy' };
const percent: EvccFieldMeta = { unit: '%', role: 'value' };
const current: EvccFieldMeta = { unit: 'A', role: 'value.current' };
const seconds: EvccFieldMeta = { unit: 's', role: 'value.interval' };
const distance: EvccFieldMeta = { unit: 'km', role: 'value.distance' };
const pricePerKWh: EvccFieldMeta = { unit: `${CURRENCY_PLACEHOLDER}/kWh`, role: 'value.price' };
const co2: EvccFieldMeta = { unit: 'g/kWh', role: 'value' };

/** Field name (as in /api/state) -> unit/role. Used for site (status.*) and loadpoint (loadpoint.X.status.*) values. */
export const EVCC_FIELD_META: Readonly<Record<string, EvccFieldMeta>> = {
    // power (W)
    homePower: power,
    pvPower: power,
    chargePower: power,
    residualPower: power,
    enableThreshold: power,
    disableThreshold: power,
    // energy
    chargedEnergy: energyWh,
    sessionEnergy: energyWh,
    chargeRemainingEnergy: energyWh,
    todayEnergy: energyWh,
    last24hEnergy: energyWh,
    last7dEnergy: energyWh,
    chargeTotalImport: energyKWh,
    pvEnergy: energyKWh,
    // state of charge / percent
    vehicleSoc: { unit: '%', role: 'value.battery' },
    limitSoc: percent,
    effectiveLimitSoc: percent,
    minSoc: percent,
    effectiveMinSoc: percent,
    vehicleLimitSoc: percent,
    bufferSoc: percent,
    bufferStartSoc: percent,
    prioritySoc: percent,
    sessionSolarPercentage: percent,
    // current (A)
    minCurrent: current,
    maxCurrent: current,
    effectiveMinCurrent: current,
    effectiveMaxCurrent: current,
    offeredCurrent: current,
    // durations (s)
    enableDelay: seconds,
    disableDelay: seconds,
    chargeRemainingDuration: seconds,
    phaseRemaining: seconds,
    pvRemaining: seconds,
    // distance (km)
    vehicleRange: distance,
    vehicleOdometer: distance,
    // tariffs / prices
    tariffGrid: pricePerKWh,
    tariffFeedIn: pricePerKWh,
    tariffPriceHome: pricePerKWh,
    tariffPriceLoadpoints: pricePerKWh,
    sessionPricePerKWh: pricePerKWh,
    sessionPrice: { unit: CURRENCY_PLACEHOLDER, role: 'value' },
    tariffCo2: co2,
    tariffCo2Home: co2,
    tariffCo2Loadpoints: co2,
    sessionCo2PerKWh: co2,
    tariffTemperature: { unit: '°C', role: 'value.temperature' },
};

/**
 * Maps an ISO currency code to a display symbol.
 *
 * @param currency currency code from evcc (e.g. EUR)
 * @returns symbol (€, CHF …) or the code itself
 */
export function currencySymbol(currency: unknown): string {
    const symbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£' };
    return typeof currency === 'string' && currency !== '' ? (symbols[currency] ?? currency) : '€';
}

/**
 * Returns unit and role for a status field.
 *
 * @param field field name as in /api/state
 * @param valueType typeof the value (unit only for numbers)
 * @param currency currency symbol used for price units
 * @returns unit (optional) and role
 */
export function getFieldMeta(field: string, valueType: string, currency = '€'): EvccFieldMeta {
    if (valueType === 'boolean') {
        return { role: 'indicator' };
    }
    const meta = EVCC_FIELD_META[field];
    if (!meta || valueType !== 'number') {
        return { role: 'value' };
    }
    return meta.unit ? { role: meta.role, unit: meta.unit.replace(CURRENCY_PLACEHOLDER, currency) } : { role: meta.role };
}
