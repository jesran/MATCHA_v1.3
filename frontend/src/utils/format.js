export function capitalizeWord(value) {
  const cleaned = `${value || ""}`.trim();
  if (!cleaned) {
    return "";
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

export function displayName(user = {}) {
  // Prefer real names, but keep usernames readable when the profile is not filled out.
  const firstName = capitalizeWord(user.first_name);
  const lastName = capitalizeWord(user.last_name);
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  return capitalizeWord(user.username || "");
}

export function assetUrl(path = "") {
  // Media fields may arrive as relative Django paths; convert them for the Vite app.
  if (!path) {
    return "";
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function daysAgo(value) {
  // Small relative labels are easier to scan in request lists than full timestamps.
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const diff = Math.max(0, Date.now() - date.getTime());
  const days = Math.floor(diff / 86400000);
  if (days === 0) {
    return "today";
  }
  if (days === 1) {
    return "1 day ago";
  }
  return `${days} days ago`;
}
