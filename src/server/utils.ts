import pino, { type Logger } from 'pino';
import cal_zip from '../data/CA_ZIP.json';

// Used for any loggers not passed as arguments
const defaultLogger = pino();

/**
 * Translate subscription terms to membership tier
 * @param payment - Subscription amount in cents
 * @param interval - Length of the recurring subscription term
 * @param logger - Instance used for logging
 * @returns Tier level
 */
function calculateTier(
  data: { amount: number; interval: 'month' | 'year' },
  logger: Logger = defaultLogger,
): number {
  const childLogger = logger.child({ step: 'calculate_tier' });

  const { amount, interval } = data;

  let tier = 0;
  if (interval == 'month') {
    if (amount >= 4800) {
      tier = 3;
    } else if (amount >= 2400) {
      tier = 2;
    } else if (amount >= 1200) {
      tier = 1;
    }
  } else if (interval == 'year') {
    if (amount >= 55000) {
      tier = 3;
    } else if (amount >= 27000) {
      tier = 2;
    } else if (amount >= 14000) {
      tier = 1;
    }
  }

  childLogger.debug(
    { step: 'determine_tier', amount, interval, tier },
    `Determined Tier ${tier} based on amount and term`,
  );

  return tier;
}

const dollar = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/**
 * Looks up the chapter/branch for a given ZIP code
 * @param zipCode - The postal code (can be string or number)
 * @returns The chapter code ("LA", "SF", "CA") or "CA" as default
 */
function getChapterFromZip(
  zipCode: string | number | undefined,
): 'CA' | 'LA' | 'SF' {
  if (!zipCode) return 'CA';

  // Clean up zip code (remove any extra characters, keep only first 5 digits)
  const cleanZip = zipCode.toString().slice(0, 5);

  // Build zip-to-chapter mapping
  const zipToChapterMap: Record<string, string> = {};
  (cal_zip as any).features.forEach((item: any) => {
    if (item.properties && item.properties.ZIP_CODE) {
      zipToChapterMap[item.properties.ZIP_CODE.toString()] =
        item.properties.CHAPTER;
    }
  });

  // Look up chapter for zip code
  const chapter = zipToChapterMap[cleanZip] as 'LA' | 'SF' | undefined | null;

  // Return chapter or default to CA
  return chapter || 'CA';
}

/**
 * Get name corresponding to tier level
 * @param tier - Tier level
 * @returns Tier name
 */
function getTierName(tier: number) {
  if (tier == 1) {
    return 'Pedestrian';
  } else if (tier == 2) {
    return 'Cargo Bike';
  } else {
    return 'Bus';
  }
}

export { calculateTier, dollar, getChapterFromZip, getTierName };
