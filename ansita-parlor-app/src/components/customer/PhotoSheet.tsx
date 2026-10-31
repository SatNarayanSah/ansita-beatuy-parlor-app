import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet, ListItem, useToast } from '@/components/ui';
import { usePhotoPicker } from '@/hooks/usePhotoPicker';
import { authService, getErrorMessage } from '@/services';

const SHEET_EXIT_MS = 350;

interface PhotoSheetProps {
  visible: boolean;
  hasPhoto: boolean;
  onClose: () => void;
}

/** Change or remove the profile photo. Saved straight to the account. */
export const PhotoSheet = ({ visible, hasPhoto, onClose }: PhotoSheetProps) => {
  const toast = useToast();
  const { pickFromLibrary, takePhoto } = usePhotoPicker();
  const [busy, setBusy] = useState(false);

  const save = async (getUri: () => Promise<string | null>): Promise<void> => {
    onClose();
    // iOS cannot present the picker while the sheet's modal is still dismissing.
    await new Promise((resolve) => setTimeout(resolve, SHEET_EXIT_MS));
    const uri = await getUri();
    if (uri === null) return;
    setBusy(true);
    try {
      await authService.updateProfile({ avatar: uri === '' ? null : uri });
      toast.success(uri === '' ? 'Photo removed' : 'Profile photo updated');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Profile photo">
      <View>
        <ListItem title="Choose from gallery" leftIcon="images-outline" disabled={busy} onPress={() => void save(pickFromLibrary)} />
        <ListItem title="Take a photo" leftIcon="camera-outline" disabled={busy} onPress={() => void save(takePhoto)} />
        {hasPhoto ? (
          <ListItem title="Remove photo" leftIcon="trash-outline" destructive disabled={busy} onPress={() => void save(async () => '')} />
        ) : null}
      </View>
    </BottomSheet>
  );
};
