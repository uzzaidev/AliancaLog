"use client";

// Registra o Service Worker (cache do app shell para abrir offline).
import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* sem SW — o app ainda funciona online */
      });
    }
  }, []);
  return null;
}
