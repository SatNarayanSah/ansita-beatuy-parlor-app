import { useState } from 'react';

import { ConfirmDialog, ListItem } from '@/components/ui';
import { authService } from '@/services';

/** "Sign out" row with confirmation. Clearing the session swaps the navigator back to Login. */
export const SignOutItem = () => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const signOut = async (): Promise<void> => {
    setBusy(true);
    await authService.logout();
    // The screen unmounts once the session clears; no state updates after this.
  };

  return (
    <>
      <ListItem title="Sign out" leftIcon="log-out-outline" destructive onPress={() => setOpen(true)} />
      <ConfirmDialog
        visible={open}
        tone="danger"
        icon="log-out-outline"
        title="Sign out?"
        message="You'll need your email and password to sign back in."
        confirmLabel="Sign out"
        loading={busy}
        onConfirm={() => void signOut()}
        onCancel={() => setOpen(false)}
      />
    </>
  );
};
