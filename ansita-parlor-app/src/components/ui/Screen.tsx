import type { ReactNode } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { overlayClearance, useTheme, type SpacingKey } from '@/theme';

/** Content wider than this (tablets, landscape) is centred instead of stretched. */
export const MAX_CONTENT_WIDTH = 760;

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). Use false for FlatList screens. */
  scroll?: boolean;
  /** Safe-area edges to pad. Screens under a native header usually omit "top". */
  edges?: readonly Edge[];
  padding?: SpacingKey;
  /** Vertical gap between direct children. */
  gap?: SpacingKey;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Rendered outside the scroll area, e.g. a FAB or sticky footer. */
  overlay?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Standard screen container: background, safe area, padding, keyboard
 * insets, tablet width cap and optional pull-to-refresh.
 */
export const Screen = ({
  children,
  scroll = true,
  edges = ['left', 'right'],
  padding = 'md',
  gap = 'md',
  refreshing = false,
  onRefresh,
  overlay,
  contentStyle,
}: ScreenProps) => {
  const { colors, spacing } = useTheme();
  const inner: ViewStyle = { padding: spacing[padding], gap: spacing[gap] };

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: colors.background }]}>
      {/*
        Keyboard: iOS uses automaticallyAdjustKeyboardInsets (insets + scroll to the
        focused field); Android resizes the window itself. Wrapping this in a
        KeyboardAvoidingView as well would compensate twice.
      */}
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          // Scrolls the focused input above the keyboard on iOS.
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[inner, styles.capped, { paddingBottom: overlay ? overlayClearance : spacing.xl }, contentStyle]}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.root, inner, styles.capped, contentStyle]}>{children}</View>
      )}
      {overlay}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  capped: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
});
