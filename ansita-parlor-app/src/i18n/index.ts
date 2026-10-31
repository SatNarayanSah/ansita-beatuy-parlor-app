import { useCallback } from 'react';

import { useSettingsStore, type Language } from '@/store/settingsStore';

/**
 * Labels for the main customer UI (tabs, titles, primary actions) in English
 * and Nepali. Content such as service names and descriptions stays in English.
 * Nepali strings should be reviewed by a native speaker before release.
 */
const en = {
  'tab.home': 'Home',
  'tab.book': 'Book',
  'tab.bookings': 'Bookings',
  'tab.profile': 'Profile',

  'greeting.morning': 'Good morning',
  'greeting.afternoon': 'Good afternoon',
  'greeting.evening': 'Good evening',

  'home.loyaltyPoints': 'Loyalty points',
  'home.nextVisit': 'Your next visit',
  'home.popular': 'Popular services',
  'home.bookNow': 'Book an appointment',
  'common.seeAll': 'See all',
  'common.next': 'Next',
  'common.back': 'Back',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.retry': 'Try again',

  'services.title': 'Services',
  'services.search': 'Search services',
  'services.all': 'All',
  'services.bookThis': 'Book this',
  'services.duration': 'Duration',
  'services.price': 'Price',
  'services.reviews': 'Reviews',

  'booking.title': 'Book appointment',
  'booking.step.services': 'Services',
  'booking.step.stylist': 'Stylist',
  'booking.step.date': 'Date',
  'booking.step.time': 'Time',
  'booking.step.review': 'Review',
  'booking.confirm': 'Confirm booking',

  'appointments.title': 'My appointments',
  'appointments.upcoming': 'Upcoming',
  'appointments.past': 'Past',
  'appointments.cancelled': 'Cancelled',
  'appointments.reschedule': 'Reschedule',
  'appointments.cancel': 'Cancel',
  'appointments.rebook': 'Rebook',
  'appointments.review': 'Rate & review',

  'profile.title': 'Profile',
  'profile.edit': 'Edit profile',
  'profile.preferences': 'Preferences',
  'profile.loyalty': 'Loyalty history',
  'profile.notifications': 'Notifications',
  'profile.language': 'Language',
  'profile.appearance': 'Appearance',
  'profile.help': 'Help & contact',
  'profile.signOut': 'Sign out',

  'notifications.title': 'Notifications',
  'notifications.markAllRead': 'Mark all read',
} as const;

export type TranslationKey = keyof typeof en;

const ne: Record<TranslationKey, string> = {
  'tab.home': 'गृहपृष्ठ',
  'tab.book': 'बुक',
  'tab.bookings': 'बुकिङ',
  'tab.profile': 'प्रोफाइल',

  'greeting.morning': 'शुभ प्रभात',
  'greeting.afternoon': 'शुभ दिउँसो',
  'greeting.evening': 'शुभ सन्ध्या',

  'home.loyaltyPoints': 'लोयल्टी अंक',
  'home.nextVisit': 'तपाईंको अर्को भेट',
  'home.popular': 'लोकप्रिय सेवाहरू',
  'home.bookNow': 'अपोइन्टमेन्ट बुक गर्नुहोस्',
  'common.seeAll': 'सबै हेर्नुहोस्',
  'common.next': 'अर्को',
  'common.back': 'पछाडि',
  'common.save': 'सेभ गर्नुहोस्',
  'common.cancel': 'रद्द गर्नुहोस्',
  'common.retry': 'फेरि प्रयास गर्नुहोस्',

  'services.title': 'सेवाहरू',
  'services.search': 'सेवा खोज्नुहोस्',
  'services.all': 'सबै',
  'services.bookThis': 'यो बुक गर्नुहोस्',
  'services.duration': 'अवधि',
  'services.price': 'मूल्य',
  'services.reviews': 'समीक्षाहरू',

  'booking.title': 'अपोइन्टमेन्ट बुक',
  'booking.step.services': 'सेवा',
  'booking.step.stylist': 'स्टाइलिस्ट',
  'booking.step.date': 'मिति',
  'booking.step.time': 'समय',
  'booking.step.review': 'पुनरावलोकन',
  'booking.confirm': 'बुकिङ पुष्टि गर्नुहोस्',

  'appointments.title': 'मेरा अपोइन्टमेन्टहरू',
  'appointments.upcoming': 'आगामी',
  'appointments.past': 'विगत',
  'appointments.cancelled': 'रद्द भएका',
  'appointments.reschedule': 'समय परिवर्तन',
  'appointments.cancel': 'रद्द गर्नुहोस्',
  'appointments.rebook': 'फेरि बुक',
  'appointments.review': 'मूल्याङ्कन गर्नुहोस्',

  'profile.title': 'प्रोफाइल',
  'profile.edit': 'प्रोफाइल सम्पादन',
  'profile.preferences': 'प्राथमिकताहरू',
  'profile.loyalty': 'लोयल्टी इतिहास',
  'profile.notifications': 'सूचनाहरू',
  'profile.language': 'भाषा',
  'profile.appearance': 'रूप',
  'profile.help': 'सहयोग र सम्पर्क',
  'profile.signOut': 'साइन आउट',

  'notifications.title': 'सूचनाहरू',
  'notifications.markAllRead': 'सबै पढियो',
};

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { en, ne };

export const translate = (language: Language, key: TranslationKey): string => DICTIONARIES[language][key];

/** `const t = useT(); t('tab.home')`. Re-renders when the language changes. */
export const useT = (): ((key: TranslationKey) => string) => {
  const language = useSettingsStore((state) => state.language);
  return useCallback((key: TranslationKey) => translate(language, key), [language]);
};
