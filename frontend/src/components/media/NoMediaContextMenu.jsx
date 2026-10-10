"use client";

import { useEffect } from "react";

const isMediaTarget = (target) => {
  if (!target || typeof target !== "object") return false;
  const el = target.nodeType === 1 ? target : target.parentElement;
  if (!el || typeof el.closest !== "function") return false;
  return Boolean(el.closest("img, picture, video"));
};

/**
 * Blocks the browser context menu (right-click / long-press) and dragging on
 * every image and video so "Save image as…", "Open image in new tab" and
 * drag-to-download are not available from the UI.
 */
export default function NoMediaContextMenu() {
  useEffect(() => {
    const onContextMenu = (e) => {
      if (isMediaTarget(e.target)) e.preventDefault();
    };
    const onDragStart = (e) => {
      if (isMediaTarget(e.target)) e.preventDefault();
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
    };
  }, []);

  return null;
}
