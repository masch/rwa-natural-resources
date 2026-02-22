import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            "app": {
                "title": "Water Forests (BDA)",
                "connect": "Connect Stellar Wallet",
                "connected": "✅",
                "loading": "Loading Water Forests...",
                "syncing": "Syncing KMZ and Oracle Data",
            },
            "modal": {
                "title": "Thank you for your contribution! 🌿",
                "p1": "Your donation has been registered on the Stellar network. You have received the NFTs corresponding to the parcels that are now part of the natural reserve of perfectly protected Sierras de Córdoba.",
                "p2": "Lots reforested and successfully secured.",
                "btn": "View Updated Map"
            },
            "map": {
                "legend": {
                    "donated": "Donated (Natural Reserve)",
                    "available": "Available for Conservation",
                    "selected": "Selected"
                }
            },
            "sidebar": {
                "title": "Your Contribution",
                "empty_line1": "Click on the available lots on the map to add them",
                "empty_line2": "to your donation.",
                "lot_subtitle": "Conservation Parcel",
                "subtotal": "Subtotal",
                "donate_btn": "Donate and Get NFT",
                "alert_connect": "Please connect your Stellar wallet and select at least one lot.",
                "alert_fail": "Failed to mint NFT. See console for details."
            },
            "popup": {
                "partOf": "This parcel is part of the Natural Reserve.",
                "value": "Ecological value:",
                "protected": "Protected by NFT on Stellar"
            }
        }
    },
    es: {
        translation: {
            "app": {
                "title": "Bosques de Agua (BDA)",
                "connect": "Conectar Wallet Stellar",
                "connected": "✅",
                "loading": "Cargando Bosques de Agua...",
                "syncing": "Sincronizando KMZ y Oracle Datos",
            },
            "modal": {
                "title": "¡Gracias por tu contribución! 🌿",
                "p1": "Tu donación ha sido registrada en la red Stellar. Haz recibido los NFTs correspondientes a las parcelas que ahora son parte de la reserva natural de las Sierras de Córdoba.",
                "p2": "Lotes reforestados y asegurados con éxito.",
                "btn": "Ver Mapa Actualizado"
            },
            "map": {
                "legend": {
                    "donated": "Donado (Reserva Natural)",
                    "available": "Disponible para Conservación",
                    "selected": "Seleccionado"
                }
            },
            "sidebar": {
                "title": "Tu Contribución",
                "empty_line1": "Haz clic en los lotes disponibles del mapa para agregarlos a",
                "empty_line2": "tu donación.",
                "lot_subtitle": "Parcela Conservación",
                "subtotal": "Subtotal",
                "donate_btn": "Donar y Obtener NFT",
                "alert_connect": "Por favor conecta tu wallet Stellar y selecciona al menos un lote.",
                "alert_fail": "Error al acuñar el NFT. Revisa la consola para más detalles."
            },
            "popup": {
                "partOf": "Esta parcela es parte de la Reserva Natural.",
                "value": "Valor ecológico:",
                "protected": "Protegido mediante NFT en Stellar"
            }
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
