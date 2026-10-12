import { useTheme } from "@/context/ThemeContext";

export const accountivaLogoUrl = "/accountiva_logo.png";
export const accountivaDarkLogoUrl = "/accountiva_dark_logo.png";

export function useAccountivaLogo() {
  const { isDark } = useTheme();
  return {
    accountivaLogoSrc: isDark ? accountivaDarkLogoUrl : accountivaLogoUrl,
  };
}
