export function IconeRecurso({ icone }: { icone: string | null }) {
  const comum = "h-12 w-12";
  switch (icone) {
    case "camera":
      return (
        <svg viewBox="0 0 24 24" className={comum} aria-hidden="true">
          <path fill="currentColor" d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm8 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        </svg>
      );
    case "mic":
      return (
        <svg viewBox="0 0 24 24" className={comum} aria-hidden="true">
          <path fill="currentColor" d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zm-5 9a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.9V21h3v2H8v-2h3v-2.1A7 7 0 0 1 5 12h2z" />
        </svg>
      );
    case "tv":
      return (
        <svg viewBox="0 0 24 24" className={comum} aria-hidden="true">
          <path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm2 16h12v2H6v-2z" />
        </svg>
      );
    case "monitor":
      return (
        <svg viewBox="0 0 24 24" className={comum} aria-hidden="true">
          <path fill="currentColor" d="M3 4h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm4 15h10v2H7v-2z" />
        </svg>
      );
    case "presentation":
      return (
        <svg viewBox="0 0 24 24" className={comum} aria-hidden="true">
          <path fill="currentColor" d="M4 3h16v2H4V3zm1 4h14v9H5V7zm6 11h2v3h-2v-3z" />
        </svg>
      );
    case "snowflake":
      return (
        <svg viewBox="0 0 24 24" className={comum} aria-hidden="true">
          <path fill="currentColor" d="M11 2h2v4.1l2.5-2.5 1.4 1.4L13.4 8.5 17 10l-3.6 1.5 3.5 3.5-1.4 1.4L13 13.9V20h-2v-6.1l-2.5 2.5-1.4-1.4 3.5-3.5L7 10l3.6-1.5-3.5-3.5 1.4-1.4L11 6.1V2z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={comum} aria-hidden="true">
          <circle cx="12" cy="12" r="6" fill="currentColor" />
        </svg>
      );
  }
}
