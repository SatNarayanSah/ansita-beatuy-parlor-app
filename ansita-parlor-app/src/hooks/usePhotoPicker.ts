import * as ImagePicker from 'expo-image-picker';
import { useCallback } from 'react';

import { useToast } from '@/components/ui/Toast';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

/** Square profile photo from the library or camera. Resolves to a local URI, or null if cancelled/denied. */
export const usePhotoPicker = () => {
  const toast = useToast();

  const pickFromLibrary = useCallback(async (): Promise<string | null> => {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    return result.canceled ? null : (result.assets[0]?.uri ?? null);
  }, []);

  const takePhoto = useCallback(async (): Promise<string | null> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast.error('Camera access is off. Enable it in your phone settings.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    return result.canceled ? null : (result.assets[0]?.uri ?? null);
  }, [toast]);

  return { pickFromLibrary, takePhoto };
};
