import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button, Icon, Text, useToast } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Batch, Course, Enrollment } from '@/types';
import { formatDisplayDate, formatShortDate, todayISO } from '@/utils/date';

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
          <Animated.View entering={ZoomIn.duration(220)} style={[shadows.lg, { backgroundColor: '#FFFDF8', borderRadius: radius.lg, padding: 10 }]}>
            {/* Fixed parchment colours: a certificate looks the same in dark mode. */}
            <View style={[styles.outer, { borderColor: '#C49A45' }]}>
              <View style={[styles.inner, { borderColor: '#E0BC6E', padding: spacing.xl, gap: spacing.md }]}>
                <BrandLogo size={56} />
                <Text variant="overline" color="#9C3D5E">
                  {businessName}
                </Text>
                <Text style={{ fontFamily: fontFamily.headingBold, fontSize: 24, color: '#3F2430', textAlign: 'center' }}>
                  Certificate of Completion
                </Text>
                <Text variant="caption" color="#6B6166">
                  This is proudly presented to
                </Text>
                <Text style={{ fontFamily: fontFamily.headingSemibold, fontSize: 26, color: '#9C3D5E', textAlign: 'center' }}>{studentName}</Text>
                <View style={[styles.rule, { backgroundColor: '#E0BC6E' }]} />
                <Text variant="bodySmall" color="#2B2528" align="center">
                  for successfully completing the <Text variant="label" color="#2B2528">{course.title}</Text>
                  {batch ? ` (${batch.name}, ${formatShortDate(batch.startDate)} - ${formatShortDate(batch.endDate)})` : ''}
                  {` with ${course.syllabus.reduce((sum, m) => sum + m.hours, 0)} hours of training.`}
                </Text>
                <View style={styles.signatures}>
                  <View style={styles.signature}>
                    <Text style={{ fontFamily: fontFamily.headingSemibold, fontSize: 16, color: '#3F2430' }}>{instructorName ?? 'Instructor'}</Text>
                    <View style={[styles.signLine, { backgroundColor: '#6B6166' }]} />
                    <Text variant="caption" color="#6B6166">
                      Instructor
                    </Text>
                  </View>
                  <Icon name="ribbon" size={40} color="#C49A45" />
                  <View style={styles.signature}>
                    <Text style={{ fontFamily: fontFamily.headingSemibold, fontSize: 16, color: '#3F2430' }}>Ansita Shrestha</Text>
                    <View style={[styles.signLine, { backgroundColor: '#6B6166' }]} />
                    <Text variant="caption" color="#6B6166">
                      Director
                    </Text>
                  </View>
                </View>
                <Text variant="caption" color="#9A8F94">
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
