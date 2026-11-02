import { useEffect } from 'react';

import { authService, isLocalImageUri } from '@/services';
import type { User } from '@/types';

/**
 * Older app versions saved the profile photo as a path on the phone, which the website and
 * other phones can't open. If that file is still on this phone, upload it once and save the link.
 */
export const useUploadLocalAvatar = (user: User | null): void => {
  const avatar = user?.avatar;
  useEffect(() => {
    if (isLocalImageUri(avatar)) authService.updateProfile({ avatar }).catch(() => undefined);
  }, [avatar]);
};
