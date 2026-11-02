import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback } from 'react';

import { useToast } from '@/components/ui/Toast';

/** Longest side a photo is shrunk to before upload: sharp on any screen, well under the 5 MB limit. */
const MAX_SIDE = 1600;

export interface PhotoPickerOptions {
  /** Crop shape offered in the picker; square suits profile photos, 4:3 service and course pictures. */
  aspect?: [number, number];
}

/**
 * Shrinks a picked photo and saves it as JPEG. Camera photos are often several MB and some
 * phones save HEIC, which the server doesn't take; a resized JPEG is small and always accepted.
 */
const toUploadableJpeg = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
  const longest = Math.max(asset.width, asset.height);
  const context = ImageManipulator.manipulate(asset.uri);
  if (longest > MAX_SIDE) context.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return result.uri;
};

/** Photo from the library or camera. Resolves to a local JPEG URI, or null if cancelled/denied. */
export const usePhotoPicker = ({ aspect = [1, 1] }: PhotoPickerOptions = {}) => {
  const toast = useToast();
  const [aspectX, aspectY] = aspect;

  const finish = useCallback(
    async (result: ImagePicker.ImagePickerResult): Promise<string | null> => {
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return null;
      try {
        return await toUploadableJpeg(asset);
      } catch {
        toast.error('Couldn’t prepare that photo. Please try another one.');
        return null;
      }
    },
    [toast],
  );

  const pickFromLibrary = useCallback(async (): Promise<string | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [aspectX, aspectY], quality: 1 });
    return finish(result);
  }, [aspectX, aspectY, finish]);

  const takePhoto = useCallback(async (): Promise<string | null> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast.error('Camera access is off. Enable it in your phone settings.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [aspectX, aspectY], quality: 1 });
    return finish(result);
  }, [aspectX, aspectY, finish, toast]);

  return { pickFromLibrary, takePhoto };
};
