import { useTranslation as useI18nTranslation } from "react-i18next";
import { useCallback } from "react";

export const useAppTranslation = () => {
  const { t, i18n } = useI18nTranslation();

  const toggleLanguage = useCallback(() => {
    const newLang = i18n.language.startsWith("es") ? "en" : "es";
    i18n.changeLanguage(newLang);
  }, [i18n]);

  const currentLanguage = i18n.language.startsWith("es") ? "es" : "en";

  return {
    t,
    i18n,
    currentLanguage,
    toggleLanguage,
  };
};
