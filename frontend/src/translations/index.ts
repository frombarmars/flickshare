// Centralized translation hook

import { useLocale } from '@/context/LocaleContext';
import { getCommonTranslation, type CommonTranslationKey } from './common';
import { getProfileTranslation, type ProfileTranslationKey } from './profile';
import { getReviewTranslation, type ReviewTranslationKey } from './review';
import { getRewardTranslation, type RewardTranslationKey } from './reward';
import { getNotificationTranslation, type NotificationTranslationKey } from './notification';
import { getSupportTranslation, type SupportTranslationKey } from './support';

export type TranslationKey = 
  | CommonTranslationKey 
  | ProfileTranslationKey 
  | ReviewTranslationKey 
  | RewardTranslationKey 
  | NotificationTranslationKey
  | SupportTranslationKey;

export const useTranslation = () => {
  const { locale } = useLocale();

  const t = {
    common: (key: CommonTranslationKey) => getCommonTranslation(locale, key),
    profile: (key: ProfileTranslationKey) => getProfileTranslation(locale, key),
    review: (key: ReviewTranslationKey, params?: Record<string, string | number>) => 
      getReviewTranslation(locale, key, params),
    reward: (key: RewardTranslationKey, params?: Record<string, string | number>) => 
      getRewardTranslation(locale, key, params),
    notification: (key: NotificationTranslationKey, params?: Record<string, string | number>) => 
      getNotificationTranslation(locale, key, params),
    support: (key: SupportTranslationKey, params?: Record<string, string | number>) => 
      getSupportTranslation(locale, key, params),
  };

  return { t, locale };
};
