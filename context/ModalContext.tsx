"use client";

import { createContext, useContext, useState } from "react";

interface ModalContextValue {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const ModalCtx = createContext<ModalContextValue>({
  open: false,
  openModal: () => {},
  closeModal: () => {},
});

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <ModalCtx.Provider
      value={{
        open,
        openModal: () => setOpen(true),
        closeModal: () => setOpen(false),
      }}
    >
      {children}
    </ModalCtx.Provider>
  );
}

export const useModal = () => useContext(ModalCtx);
