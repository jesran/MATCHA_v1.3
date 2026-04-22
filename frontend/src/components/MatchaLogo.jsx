export default function MatchaLogo({ compact = false }) {
  const sizeClass = compact ? "h-9 w-9" : "h-10 w-10";

  return (
    <img
      src="/matcha-logo.png"
      alt="Matcha logo"
      className={`${sizeClass} rounded-xl object-cover shadow-[0_10px_22px_rgba(69,98,45,0.18)]`}
    />
  );
}
