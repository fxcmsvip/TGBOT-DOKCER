import { useEffect, useRef, useCallback } from 'react';

/**
 * Accessible modal with focus trap, Escape key, and ARIA attributes.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - title: string
 * - children: ReactNode
 * - footer: ReactNode (optional)
 * - maxWidth: string (optional, default 'max-w-md')
 */
export default function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-md' }) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      document.addEventListener('keydown', handleKeyDown);
      // Focus the dialog on open
      requestAnimationFrame(() => {
        if (dialogRef.current) {
          const first = dialogRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (first) first.focus();
        }
      });
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div
        ref={dialogRef}
        className={`relative bg-white rounded-xl shadow-xl w-full ${maxWidth} mx-4 p-6`}
      >
        {title && (
          <h3
            id="modal-title"
            className="text-lg font-semibold text-text-primary mb-2"
          >
            {title}
          </h3>
        )}
        {children}
        {footer && <div className="flex justify-end gap-3 mt-5">{footer}</div>}
      </div>
    </div>
  );
}
