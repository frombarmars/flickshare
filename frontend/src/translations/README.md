# Internationalization (i18n) Implementation

## Overview
This project uses a comprehensive custom i18n solution for Thai (th) and English (en) localization across the entire application.

## Structure

### Translation Files
- `common.ts` - Common translations (navigation, actions, status messages)
- `support.ts` - Support/payment page translations
- `profile.ts` - Profile page translations
- `review.ts` - Review-related translations
- `reward.ts` - Reward program translations
- `notification.ts` - Notification page translations
- `index.ts` - Central translation hook (useTranslation)

### Context
- `LocaleContext.tsx` - Provides locale state and language switching functionality
- Automatically detects browser language on first load
- Persists user's language preference in localStorage

## Usage

### Using the Central Translation Hook (Recommended)
```typescript
import { useTranslation } from '@/translations';

function MyComponent() {
  const { t, locale } = useTranslation();
  
  return (
    <div>
      {/* Common translations */}
      <h1>{t.common('home')}</h1>
      
      {/* Review translations */}
      <p>{t.review('addReview')}</p>
      
      {/* With parameters */}
      <p>{t.review('characterCount', { count: 250 })}</p>
      
      {/* Profile translations */}
      <button>{t.profile('follow')}</button>
      
      {/* Reward translations */}
      <span>{t.reward('pointsEarned', { points: 10 })}</span>
      
      {/* Notification translations */}
      <span>{t.notification('markAllAsRead')}</span>
      
      {/* Support translations */}
      <span>{t.support('supportReviewer')}</span>
    </div>
  );
}
```

### Using Individual Translation Functions (Alternative)
```typescript
import { useLocale } from "@/context/LocaleContext";
import { getSupportTranslation } from "@/translations/support";

const { locale } = useLocale();
const text = getSupportTranslation(locale, 'supportReviewer');
```

### Add Language Switcher
```typescript
import LanguageSwitcher from "@/components/LanguageSwitcher";

<LanguageSwitcher />
```

The Language Switcher is already integrated in:
- ✅ Home page navigation (Navtop component)
- ✅ Support page header

## Available Translation Namespaces

### Common (`t.common`)
Navigation items, actions, status messages, time units
- Examples: `home`, `movies`, `users`, `loading`, `success`, `back`, `save`

### Profile (`t.profile`)
Profile page specific text
- Examples: `profile`, `followers`, `follow`, `settings`, `editProfile`

### Review (`t.review`)
Review creation and viewing
- Examples: `addReview`, `publishReview`, `writeComment`, `likes`, `comments`

### Reward (`t.reward`)
Reward program and points system
- Examples: `earnPoints`, `dailyCheckIn`, `invite`, `leaderboard`

### Notification (`t.notification`)
Notifications and alerts
- Examples: `notifications`, `markAllAsRead`, `tapToViewReview`

### Support (`t.support`)
Support/payment functionality
- Examples: `supportReviewer`, `sendSupport`, `yourBalance`, `transactionPreview`

## Adding New Translations

### 1. Add to Existing Translation File
Edit the appropriate file (e.g., `/translations/common.ts`):

```typescript
export const commonTranslations = {
  en: {
    newKey: "English text",
    // ... existing translations
  },
  th: {
    newKey: "ข้อความภาษาไทย",
    // ... existing translations
  },
};
```

### 2. Create New Translation Module
For a new feature area:

```typescript
// /translations/newFeature.ts
export const newFeatureTranslations = {
  en: {
    title: "Feature Title",
    description: "Feature description",
  },
  th: {
    title: "ชื่อฟีเจอร์",
    description: "คำอธิบายฟีเจอร์",
  },
};

export type NewFeatureTranslationKey = keyof typeof newFeatureTranslations.en;

export const getNewFeatureTranslation = (
  locale: string,
  key: NewFeatureTranslationKey,
  params?: Record<string, string | number>
): string => {
  const translations = locale === 'th' ? newFeatureTranslations.th : newFeatureTranslations.en;
  let text = translations[key] || newFeatureTranslations.en[key];
  
  if (params) {
    Object.keys(params).forEach((param) => {
      text = text.replace(new RegExp(`{{${param}}}`, 'g'), String(params[param]));
    });
  }
  
  return text;
};
```

Then add it to `index.ts`:

```typescript
import { getNewFeatureTranslation, type NewFeatureTranslationKey } from './newFeature';

export const useTranslation = () => {
  const { locale } = useLocale();

  const t = {
    // ... existing namespaces
    newFeature: (key: NewFeatureTranslationKey, params?: Record<string, string | number>) => 
      getNewFeatureTranslation(locale, key, params),
  };

  return { t, locale };
};
```

## Best Practices

1. **Use descriptive keys**: `supportReviewer` instead of `title1`
2. **Use appropriate namespace**: Keep related translations in the same module
3. **Use parameters for dynamic content**: `{{amount}}`, `{{username}}`, `{{count}}`
4. **Maintain consistency**: Keep key names consistent across languages
5. **Update dependencies**: Add `locale` to useEffect dependencies when using translations
6. **Type safety**: Always use TypeScript types for translation keys
7. **Fallback**: English is the default fallback for missing translations

## Supported Languages
- **English (en)**: Default fallback language
- **Thai (th)**: Primary localized language

## Components

### LanguageSwitcher
- Compact toggle button for switching languages
- Styled to match the application's design system
- Shows current language with white background and shadow
- Integrated in main navigation for global access

### Implementation Example
```typescript
// The component is already integrated in:
// - /components/Navtop/index.tsx (home navigation)
// - /app/(protected)/support/[reviewId]/page.tsx (support page)
```

## Migration Notes

- All navigation items now support i18n
- Language preference persists across sessions
- Browser language is automatically detected on first visit
- Components update immediately when language changes (React context)

## Future Enhancements

To add more languages:
1. Add new language code to each translation file
2. Provide translations for all keys
3. Update `LocaleContext` if needed for language detection
4. Add language option to `LanguageSwitcher`
