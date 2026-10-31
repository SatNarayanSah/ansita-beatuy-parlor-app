import { useState } from 'react';

/**
 * Applies a navigation param to local state whenever the param changes, e.g.
 * a deep link opening "My Appointments" on the Past tab. The user can still
 * change the local state afterwards.
 *
 * Uses React's "adjust state when a prop changes" pattern (state updated
 * during render, before children render) instead of an effect, which would
 * render the stale value first.
 * https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 */
export const useAdoptParam = <T>(param: T | undefined, apply: (value: T) => void): void => {
  const [seen, setSeen] = useState(param);
  if (param !== seen) {
    setSeen(param);
    if (param !== undefined) apply(param);
  }
};
