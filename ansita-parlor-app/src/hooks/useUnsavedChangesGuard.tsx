import { usePreventRemove, useNavigation, type NavigationAction } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/**
 * Asks before leaving a form with unsaved edits, whether by the header back
 * button, the iOS swipe or the Android hardware back. Render the returned
 * `dialog` once in the screen. Call `allowLeave()` right before navigating
 * away after a successful save.
 */
export const useUnsavedChangesGuard = (dirty: boolean) => {
  const navigation = useNavigation();
  const [pending, setPending] = useState<NavigationAction | null>(null);
  const [allowed, setAllowed] = useState(false);
  const allowedRef = useRef(false);

  usePreventRemove(dirty && !allowed, ({ data }) => {
    if (allowedRef.current) {
      navigation.dispatch(data.action);
      return;
    }
    setPending(data.action);
  });

  const allowLeave = useCallback(() => {
    allowedRef.current = true;
    setAllowed(true);
  }, []);

  const dialog = (
    <ConfirmDialog
      visible={pending !== null}
      tone="danger"
      icon="create-outline"
      title="Discard changes?"
      message="You have unsaved changes. If you leave now they will be lost."
      confirmLabel="Discard"
      cancelLabel="Keep editing"
      onConfirm={() => {
        const action = pending;
        setPending(null);
        allowLeave();
        if (action) navigation.dispatch(action);
      }}
      onCancel={() => setPending(null)}
    />
  );

  return { dialog, allowLeave };
};
