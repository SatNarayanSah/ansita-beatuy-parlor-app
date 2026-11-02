import { createNavigationContainerRef } from '@react-navigation/native';

import type { NotificationLink, UserRole } from '@/types';

import type { RootStackParamList } from './types';

/** Navigation from outside a screen, e.g. when a phone notification is tapped. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Opens the screen a notification points to; links with no screen for this role do nothing. */
export const openNotificationLink = (role: UserRole, link: NotificationLink | null): void => {
  if (!link || !navigationRef.isReady()) return;
  const navigate = navigationRef.navigate;
  if (role === 'admin') {
    switch (link.kind) {
      case 'appointment':
        navigate('AppointmentDetail', { appointmentId: link.id });
        return;
      case 'enrollment':
        navigate('EnrollmentDetail', { enrollmentId: link.id });
        return;
      case 'customer':
        navigate('CustomerDetail', { customerId: link.id });
        return;
      case 'course':
        navigate('CourseManage', { courseId: link.id });
        return;
      case 'offer':
        return;
    }
  }
  switch (link.kind) {
    case 'appointment':
      navigate('CustomerTabs', { screen: 'MyAppointments' });
      return;
    case 'offer':
      navigate('CustomerTabs', { screen: 'Home' });
      return;
    // e.g. a course fee payment confirmed or not.
    case 'enrollment':
      navigate('MyCourses');
      return;
    // Courses are managed by the parlour; customers only see their own enrollments.
    case 'course':
    case 'customer':
      return;
  }
};
