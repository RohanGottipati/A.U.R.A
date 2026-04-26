"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type ModalType = "waitlist" | "demo" | "geminiKey";

interface ModalContextValue {
  open: ModalType | null;
  openModal: (type?: ModalType) => void;
  closeModal: () => void;
}

const ModalCtx = createContext<ModalContextValue>({
  open: null,
  openModal: () => {},
  closeModal: () => {},
});

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<ModalType | null>(null);

  const openModal = useCallback((type: ModalType = "waitlist") => {
    setOpen(type);
  }, []);

  const closeModal = useCallback(() => {
    setOpen(null);
  }, []);

  return (
    <ModalCtx.Provider value={{ open, openModal, closeModal }}>
      {children}
    </ModalCtx.Provider>
  );
}

export const useModal = () => useContext(ModalCtx);
