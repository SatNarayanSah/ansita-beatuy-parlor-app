import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState, Text } from '@/components/ui';
import { useTheme } from '@/theme';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Last line of defence for render errors anywhere in the app. Shows a friendly
 * screen with a retry instead of a white screen (or a red box in production).
 * Rendered inside the theme and toast providers, so the fallback is themed.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // A real app would report this to a crash service here.
    console.error('Unhandled render error', error, info.componentStack);
  }

  private reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return <ErrorFallback error={error} onRetry={this.reset} />;
  }
}

const ErrorFallback = ({ error, onRetry }: { error: Error; onRetry: () => void }) => {
  const { colors } = useTheme();
  return (
  <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.root}>
    <EmptyState
      icon="sad-outline"
      tone="danger"
      title="Something went wrong"
      message="Sorry about that. Your data is safe. Try again, and if it keeps happening, restart the app."
      actionLabel="Try again"
      onAction={onRetry}
    />
    {__DEV__ ? (
      <View style={styles.details}>
        <Text variant="label" tone="danger">
          {error.name}: {error.message}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={12}>
          {error.stack}
        </Text>
      </View>
    ) : null}
  </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  details: { gap: 6, marginTop: 16 },
});
