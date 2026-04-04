"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if ("serviceWorker" in navigator === false) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        // Registration can fail quietly in unsupported preview environments.
      }
    };

    void register();
  }, []);

  return null;
}
