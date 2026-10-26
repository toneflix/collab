/**
 * Fallbacks for page preFetch requests, so a missing record renders the
 * page's "not found" state instead of failing the whole server render.
 */
export const missing = () => undefined;

export const emptyPage = () => ({ data: [], meta: {} });
