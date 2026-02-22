import React, { useEffect } from 'react';
import { useAppTranslation } from '../hooks/useAppTranslation';

interface AlertDialogProps {
    isOpen: boolean;
    message: string;
    onClose: () => void;
}

const AlertDialog: React.FC<AlertDialogProps> = ({ isOpen, message, onClose }) => {
    const { t } = useAppTranslation();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
            <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                <div className="modal-header" style={{ justifyContent: 'center', position: 'relative' }}>
                    <h3 style={{ color: '#ef4444' }}>{t('app.alert_title')}</h3>
                    <button
                        className="close-btn"
                        onClick={onClose}
                        style={{ position: 'absolute', right: '0' }}
                    >
                        &times;
                    </button>
                </div>
                <p style={{ margin: '1rem 0' }}>{message}</p>
                <button
                    className="donate-btn"
                    style={{ background: '#3b82f6', marginTop: '1rem' }}
                    onClick={onClose}
                >
                    OK
                </button>
            </div>
        </div>
    );
};

export default AlertDialog;
