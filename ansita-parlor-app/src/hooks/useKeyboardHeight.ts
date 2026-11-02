import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Height of the on-screen keyboard, 0 while hidden. For views the system doesn't
 * resize for the keyboard, such as a Modal on Android with edge-to-edge.
 */
export const useKeyboardHeight = (): number => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // iOS reports before the animation (smoother); Android only after.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => setHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
};
