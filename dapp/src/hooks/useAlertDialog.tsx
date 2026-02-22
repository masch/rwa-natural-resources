import { useState, useCallback } from "react";
import AlertDialog from "../components/AlertDialog";

export const useAlertDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  const showAlert = useCallback((msg: string) => {
    setMessage(msg);
    setIsOpen(true);
  }, []);

  const hideAlert = useCallback(() => {
    setIsOpen(false);
    setMessage("");
  }, []);

  const AlertDialogComponent = useCallback(
    () => <AlertDialog isOpen={isOpen} message={message} onClose={hideAlert} />,
    [isOpen, message, hideAlert],
  );

  return { showAlert, hideAlert, AlertDialogComponent };
};
