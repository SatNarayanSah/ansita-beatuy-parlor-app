import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet, Button, Chip, Input, RatingStars, Text, useToast } from '@/components/ui';
import { useAdoptParam } from '@/hooks/useAdoptParam';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { appointmentService, reviewService } from '@/services';
import { useTheme } from '@/theme';
import type { Appointment, ReviewRating } from '@/types';

const CUSTOMER_REASONS: readonly string[] = ['Change of plans', 'Feeling unwell', 'Booked by mistake', 'Found another time', 'Other'];

/** Reasons offered when the parlour cancels. */
export const ADMIN_CANCEL_REASONS: readonly string[] = ['Customer called to cancel', 'Stylist unavailable', 'Double booking', 'Parlour closed', 'Other'];

interface CancelSheetProps {
  appointment: Appointment | null;
  /** e.g. "Hair Spa on Sat, 2 Nov at 11:00 AM" */
  summary: string;
  onClose: () => void;
  /** Defaults to customer-facing reasons; "Other" should be last. */
  reasons?: readonly string[];
}

/** Cancel confirmation with a reason. The other side is notified. */
export const CancelAppointmentSheet = ({ appointment, summary, onClose, reasons = CUSTOMER_REASONS }: CancelSheetProps) => {
  const { spacing } = useTheme();
  const toast = useToast();
  const [reason, setReason] = useState<string>(reasons[0] ?? 'Other');
  const [details, setDetails] = useState('');
  const cancel = useAsyncAction(appointmentService.updateStatus);

  // Fresh form each time the sheet opens for an appointment.
  useAdoptParam(appointment?.id, () => {
    setReason(reasons[0] ?? 'Other');
    setDetails('');
    cancel.reset();
  });

  const confirm = async (): Promise<void> => {
    if (!appointment) return;
    const text = reason === 'Other' ? details.trim() || 'Other' : details.trim() ? `${reason}: ${details.trim()}` : reason;
    const updated = await cancel.run(appointment.id, 'cancelled', text);
    if (updated) {
      toast.show({ message: 'Appointment cancelled', type: 'info' });
      onClose();
    }
  };

  return (
    <BottomSheet
      visible={appointment !== null}
      onClose={onClose}
      title="Cancel appointment?"
      subtitle={summary}
      footer={
        <>
          <Button title="Keep it" variant="outline" onPress={onClose} style={{ flex: 1 }} fullWidth />
          <Button title="Cancel booking" variant="danger" loading={cancel.loading} onPress={() => void confirm()} style={{ flex: 1 }} fullWidth />
        </>
      }
    >
      <View style={{ gap: spacing.lg }}>
        <Text variant="label" tone="secondary">
          Reason for cancelling
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {reasons.map((item) => (
            <Chip key={item} label={item} selected={reason === item} onPress={() => setReason(item)} />
          ))}
        </View>
        <Input
          label={reason === 'Other' ? 'Tell us more' : 'Anything else? (optional)'}
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={160}
          showCount
        />
        {cancel.error ? (
          <Text variant="bodySmall" tone="danger">
            {cancel.error}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
};

const RATING_LABELS: Record<ReviewRating, string> = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very good', 5: 'Excellent!' };

interface ReviewSheetProps {
  appointment: Appointment | null;
  summary: string;
  onClose: () => void;
}

/** Star rating and comment for a completed visit. */
export const ReviewSheet = ({ appointment, summary, onClose }: ReviewSheetProps) => {
  const { spacing } = useTheme();
  const toast = useToast();
  const [rating, setRating] = useState<ReviewRating>(5);
  const [comment, setComment] = useState('');
  const submit = useAsyncAction(reviewService.createReview);

  useAdoptParam(appointment?.id, () => {
    setRating(5);
    setComment('');
    submit.reset();
  });

  const send = async (): Promise<void> => {
    if (!appointment) return;
    const review = await submit.run({ appointmentId: appointment.id, rating, comment });
    if (review) {
      toast.success('Thank you for your review!');
      onClose();
    }
  };

  return (
    <BottomSheet
      visible={appointment !== null}
      onClose={onClose}
      title="Rate your visit"
      subtitle={summary}
      footer={<Button title="Submit review" loading={submit.loading} onPress={() => void send()} style={{ flex: 1 }} fullWidth />}
    >
      <View style={{ gap: spacing.lg, alignItems: 'center' }}>
        <RatingStars value={rating} onChange={(value) => setRating(Math.min(5, Math.max(1, value)) as ReviewRating)} size={40} />
        <Text variant="h4" tone="primary">
          {RATING_LABELS[rating]}
        </Text>
        <Input
          label="Your review"
          placeholder="What did you love? What could be better?"
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={300}
          showCount
          containerStyle={{ alignSelf: 'stretch' }}
        />
        {submit.error ? (
          <Text variant="bodySmall" tone="danger">
            {submit.error}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
};
