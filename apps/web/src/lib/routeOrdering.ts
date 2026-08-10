/**
 * AC 1.1.4 — order route alternatives by sensory indicator
 * (lowest / calmest first).
 */

export type WithSensoryIndicator = {
  sensoryIndicator: number;
};

/**
 * Stable ascending sort by sensoryIndicator so the calmest option is first.
 * Ties keep original relative order.
 */
export function orderRoutesBySensoryIndicator<T extends WithSensoryIndicator>(
  routes: T[]
): T[] {
  return routes
    .map((route, index) => ({ route, index }))
    .sort((a, b) => {
      const d = a.route.sensoryIndicator - b.route.sensoryIndicator;
      return d !== 0 ? d : a.index - b.index;
    })
    .map(({ route }) => route);
}

/** True when the list is non-decreasing by sensoryIndicator. */
export function isOrderedCalmestFirst<T extends WithSensoryIndicator>(
  routes: T[]
): boolean {
  for (let i = 1; i < routes.length; i++) {
    if (routes[i].sensoryIndicator < routes[i - 1].sensoryIndicator) {
      return false;
    }
  }
  return true;
}
