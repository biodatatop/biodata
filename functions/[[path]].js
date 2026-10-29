
import { getApiBase } from "./_shared/config.js";

export async function onRequest(context) {
  const url = new URL(context.request.url);

  const path = url.pathname
    .replace(/^\/+/, "")
    .toLowerCase();

  const apiBase = await getApiBase(context);

  // REDIRECT LINK
  if (url.pathname.startsWith("/r/")) {
    return fetch(apiBase + url.pathname, {
      redirect: "manual"
    });
  }

  // STATIC FILES
  if (
    path.includes(".") ||
    path.startsWith("css/") ||
    path.startsWith("js/") ||
    path.startsWith("assets/") ||
    path.startsWith("components/") ||
    path.startsWith("amp/") ||
    path.startsWith("og/")
  ) {
    return context.env.ASSETS.fetch(context.request);
  }

  const reserved = [
    "",
    "login",
    "register",
    "dashboard",
    "privacy",
    "og",
    "amp",
    "sitemap-users.xml",
    "profile"
  ];

  // PUBLIC PROFILE
  if (path && !reserved.includes(path)) {
    try {
      const api = await fetch(`${apiBase}/${path}`);

      if (!api.ok) {
        return new Response(notFoundHtml(), {
          status: 404,
          headers: {
            "Content-Type": "text/html;charset=UTF-8"
          }
        });
      }

      const profile = await api.json();

      return new Response(profileHtml(profile, url), {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "X-Content-Type-Options": "nosniff"
        }
      });
    } catch {
      return new Response(notFoundHtml(), {
        status: 404,
        headers: {
          "Content-Type": "text/html;charset=UTF-8"
        }
      });
    }
  }

  // DEFAULT
  return context.env.ASSETS.fetch(context.request);
}

// PROFILE HTML + SEO
function profileHtml(profile, url) {
  const username = profile.username || "";
  const displayName = profile.name || username;

  const title = `${displayName} | Biodata`;

  const description =
    profile.bio || `Lihat semua link ${displayName}`;

  // Gambar untuk preview sosial, bukan avatar profil.
  const image =
    `${url.origin}/og/${encodeURIComponent(username)}`;

  const theme = profile.theme || "default";

  // Inisial otomatis: "AI Mr Ferdy" menjadi "AM".
  // Jika ingin dua kata pertama saja, hasilnya "AM".
  const initials = (displayName || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join("") || "?";

  // Gunakan URL foto hanya jika API menyediakan field profile.avatar.
  // Tidak membuat endpoint avatar baru.
  const avatarUrl =
    typeof profile.avatar === "string"
      ? profile.avatar.trim()
      : "";

  const avatarHtml = avatarUrl
    ? `
      <img
        class="profile-avatar"
        src="${escapeHtml(avatarUrl)}"
        alt="${escapeHtml(displayName)}"
        loading="eager"
        decoding="async"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">

      <div
        class="profile-avatar profile-avatar-initials"
        role="img"
        aria-label="${escapeHtml(`Inisial ${displayName}`)}"
        style="display:none">
        ${escapeHtml(initials)}
      </div>
    `
    : `
      <div
        class="profile-avatar profile-avatar-initials"
        role="img"
        aria-label="${escapeHtml(`Inisial ${displayName}`)}">
        ${escapeHtml(initials)}
      </div>
    `;

  const links = (profile.links || [])
    .filter(link => link.active !== false)
    .map(link => `
      <a
        class="profile-link"
        href="/r/${encodeURIComponent(username)}/${encodeURIComponent(String(link.id))}"
        target="_blank"
        rel="noopener noreferrer">
        ${escapeHtml(link.title || "")}
      </a>
    `)
    .join("");

  const canonical = url.href;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "name": displayName,
    "description": description,
    "url": canonical,
    "image": image
  };

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">

  <title>${escapeHtml(title)}</title>

  <meta
    name="description"
    content="${escapeHtml(description)}">

  <meta name="robots" content="index,follow">

  <link
    rel="canonical"
    href="${escapeHtml(canonical)}">

  <meta property="og:type" content="profile">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:site_name" content="Biodata">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">

  <link rel="stylesheet" href="/css/profile.css">
  <link
    rel="stylesheet"
    href="/css/themes/profile-${escapeHtml(theme)}.css">

  <script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, "\\u003c")}</script>
</head>

<body>
  <main class="profile">
    <div class="profile-card">

      ${avatarHtml}

      <h1 class="profile-name">
        ${escapeHtml(displayName)}
      </h1>

      <p class="profile-bio">
        ${escapeHtml(profile.bio || "")}
      </p>

    </div>

    <div class="profile-links">
      ${links}
    </div>

    <footer class="profile-footer">
      <a href="/" class="btn btn-secondary">
        Buat Halaman Seperti Ini
      </a>
    </footer>
  </main>
</body>
</html>
`;
}

function notFoundHtml() {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Profil Tidak Ditemukan | Biodata</title>
</head>
<body>
  <main class="not-found">
    <h1>404</h1>
    <p>Profil tidak ditemukan.</p>
    <br>
    <a href="/">Kembali ke Beranda</a>
  </main>
</body>
</html>
`;
}

function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
