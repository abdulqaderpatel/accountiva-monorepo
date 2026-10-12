import { computed } from 'vue';
import { useTheme } from '@/composables/useTheme';
import { accountivaDarkLogoUrl, accountivaLogoUrl } from '@/lib/brand';

export const useAccountivaLogo = () => {
  const { effectiveTheme } = useTheme();

  const accountivaLogoSrc = computed(() =>
    effectiveTheme.value === 'dark'
      ? accountivaDarkLogoUrl
      : accountivaLogoUrl,
  );

  return { accountivaLogoSrc };
};
