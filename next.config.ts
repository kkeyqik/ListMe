import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Supabase project origin (REST, auth, storage, realtime). Falls back to the
// wildcard so preview/dev projects keep working.
function supabaseOrigins(): string[] {
  const origins = ["https://*.supabase.co", "wss://*.supabase.co"];
  try {
    const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (raw) {
      const url = new URL(raw);
      origins.push(url.origin, `wss://${url.host}`);
    }
  } catch {
    // ignore malformed URL; wildcard above still applies
  }
  return Array.from(new Set(origins));
}

const supabase = supabaseOrigins().join(" ");
const supabaseHttps = supabaseOrigins().filter((o) => o.startsWith("https://")).join(" ");

// Google services used by Firebase phone auth (reCAPTCHA), Google sign-in
// redirects, and Google Analytics.
const googleScripts =
  "https://www.google.com https://www.gstatic.com https://apis.google.com https://www.recaptcha.net https://www.googletagmanager.com";
const googleConnect =
  "https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://firebaseinstallations.googleapis.com https://www.google.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com";
const googleFrames =
  "https://www.google.com https://recaptcha.google.com https://www.recaptcha.net https://*.firebaseapp.com";

// Third-party video / 3D tour embeds allowed on property pages.
const embedFrames =
  "https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://my.matterport.com https://www.loom.com https://streamable.com";

// Public APIs called from the browser (address/pincode lookup, reverse geocoding).
const publicApis =
  "https://api.postalpincode.in https://nominatim.openstreetmap.org https://api.bigdatacloud.net";

// Full policy, shipped as Report-Only first so nothing breaks; violations show
// in the browser console. Promote to Content-Security-Policy once clean.
const cspReportOnly = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${googleScripts} https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${googleConnect} ${publicApis} https://vitals.vercel-insights.com`,
  "media-src 'self' blob: https:",
  `frame-src 'self' ${googleFrames} ${embedFrames}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  `form-action 'self' ${supabaseHttps} https://accounts.google.com`,
  "frame-ancestors 'none'",
  // No upgrade-insecure-requests: browsers ignore it in a report-only policy and log an error.
].join("; ");

// Small enforced policy: only directives that cannot break page functionality.
// frame-ancestors is ignored in Report-Only, so it must be enforced here.
const cspEnforced = ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'"].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspEnforced },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(self), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    unoptimized: true,
    // Only matters if optimisation is re-enabled; never allow a wildcard host
    // (that would turn /_next/image into an open proxy).
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  serverExternalPackages: ["@prisma/client", "pg"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
