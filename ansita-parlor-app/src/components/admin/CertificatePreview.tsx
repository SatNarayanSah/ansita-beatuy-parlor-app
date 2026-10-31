import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button, Icon, Text, useToast } from '@/components/ui';
import { palette, useTheme } from '@/theme';
import type { Batch, Course, Enrollment } from '@/types';
import { formatDisplayDate, formatShortDate, todayISO } from '@/utils/date';

/**
 * Fixed "parchment" colours from the brand palette: a certificate should look
 * the same printed or on screen, in light or dark mode.
 */
const INK = {
  paper: '#FFFDF8',
  gold: palette.gold500,
  goldLight: palette.gold300,
  rose: palette.rose700,
  heading: palette.rose900,
  body: palette.charcoal,
  muted: '#5C5357',
} as const;

interface CertificatePreviewProps {
  visible: boolean;
  onClose: () => void;
  studentName: string;
  course: Course;
  batch: Batch | undefined;
  enrollment: Enrollment;
  instructorName?: string;
  businessName: string;
}

/** Mock certificate card shown when one is issued. "Download" and "Share" are demo-only. */
export const CertificatePreview = ({ visible, onClose, studentName, course, batch, enrollment, instructorName, businessName }: CertificatePreviewProps) => {
  const { colors, fontFamily, radius, spacing, shadows } = useTheme();
  const toast = useToast();
  const number = `ANS-${new Date().getFullYear()}-${enrollment.id.replace(/\D/g, '').slice(-4).padStart(4, '0')}`;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(160)} style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.lg }]}>
          <Animated.View entering={ZoomIn.duration(220)} style={[shadows.lg, { backgroundColor: INK.paper, borderRadius: radius.lg, padding: 10 }]}>
            <View style={[styles.outer, { borderColor: INK.gold }]}>
              <View style={[styles.inner, { borderColor: INK.goldLight, padding: spacing.xl, gap: spacing.md }]}>
                <BrandLogo size={56} />
                <Text variant="overline" color={INK.rose}>
                  {businessName}
                </Text>
                <Text style={{ fontFamily: fontFamily.headingBold, fontSize: 24, color: INK.heading, textAlign: 'center' }}>
                  Certificate of Completion
                </Text>
                <Text variant="caption" color={INK.muted}>
                  This is proudly presented to
                </Text>
                <Text style={{ fontFamily: fontFamily.headingSemibold, fontSize: 26, color: INK.rose, textAlign: 'center' }}>{studentName}</Text>
                <View style={[styles.rule, { backgroundColor: INK.goldLight }]} />
                <Text variant="bodySmall" color={INK.body} align="center">
                  for successfully completing the <Text variant="label" color={INK.body}>{course.title}</Text>
                  {batch ? ` (${batch.name}, ${formatShortDate(batch.startDate)} - ${formatShortDate(batch.endDate)})` : ''}
                  {` with ${course.syllabus.reduce((sum, m) => sum + m.hours, 0)} hours of training.`}
                </Text>
                <View style={styles.signatures}>
                  <View style={styles.signature}>
                    <Text style={{ fontFamily: fontFamily.headingSemibold, fontSize: 16, color: INK.heading }}>{instructorName ?? 'Instructor'}</Text>
                    <View style={[styles.signLine, { backgroundColor: INK.muted }]} />
                    <Text variant="caption" color={INK.muted}>
                      Instructor
                    </Text>
                  </View>
                  <Icon name="ribbon" size={40} color={INK.gold} />
                  <View style={styles.signature}>
                    <Text style={{ fontFamily: fontFamily.headingSemibold, fontSize: 16, color: INK.heading }}>Ansita Shrestha</Text>
                    <View style={[styles.signLine, { backgroundColor: INK.muted }]} />
                    <Text variant="caption" color={INK.muted}>
                      Director
                    </Text>
                  </View>
                </View>
                <Text variant="caption" color={INK.muted}>
                  No. {number} · Issued {formatDisplayDate(todayISO())}
                </Text>
              </View>
            </View>
          </Animated.View>

          <View style={[styles.actions, { gap: spacing.sm, marginTop: spacing.lg }]}>
            <Button title="Share" leftIcon="share-social-outline" variant="secondary" onPress={() => toast.info('Shared (demo)')} style={styles.flex} fullWidth />
            <Button title="Download PDF" leftIcon="download-outline" variant="secondary" onPress={() => toast.success('Saved certificate.pdf (demo)')} style={styles.flex} fullWidth />
          </View>
          <Button title="Done" onPress={onClose} fullWidth style={{ marginTop: spacing.sm }} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  outer: { borderWidth: 3, padding: 4 },
  inner: { borderWidth: 1, alignItems: 'center' },
  rule: { width: 80, height: 2 },
  signatures: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 8 },
  signature: { alignItems: 'center', gap: 2, width: 110 },
  signLine: { height: 1, alignSelf: 'stretch' },
  actions: { flexDirection: 'row' },
  flex: { flex: 1 },
});
