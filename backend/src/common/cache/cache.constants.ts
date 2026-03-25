/** Cache key prefix for public property listings (hashed query keys). */
export const CACHE_PREFIX_PROPERTIES_LIST = 'properties:list';

/** Search results */
export const CACHE_PREFIX_SEARCH_PROPERTIES = 'search:properties';

/** Autocomplete suggestions */
export const CACHE_PREFIX_SUGGEST = 'suggest';

/** Single property entries (warming / future reads) */
export const CACHE_PREFIX_PROPERTY = 'property';

/** Default TTL for public listings in findAll (5 minutes) */
export const TTL_PUBLIC_PROPERTY_LIST_MS = 300_000;

/** Default TTL for search results (2 minutes) */
export const TTL_SEARCH_RESULTS_MS = 120_000;

/** Default TTL for suggest strings (5 minutes) */
export const TTL_SUGGEST_MS = 300_000;

/** Default TTL for warmed property entries (1 hour) */
export const TTL_PROPERTY_ENTRY_MS = 3_600_000;
