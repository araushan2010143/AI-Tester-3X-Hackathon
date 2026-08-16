import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True once the client has hydrated — false during SSR and the first client render, then
 *  true forever after. The React 18+ way to gate on "has hydration happened yet" without a
 *  setState-in-effect (which cascading-render lint rules correctly flag as an anti-pattern). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
