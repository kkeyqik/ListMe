# MASTER PROJECT CONTEXT & AI HANDOVER DOCUMENT: LISTME

> **Instructions for the AI Assistant Reading This Document:**
> You are inheriting the development of **ListMe**, a high-performance, full-stack real estate marketplace platform tailored for the Indian property market.
> This document provides 100% of the project context, technical architecture, database schemas, feature implementations, conventions, and engineering decisions.
> Read this document thoroughly to maintain architectural integrity, avoid regressions, and continue development seamlessly.

---

## 1. Project Overview & Business Logic

- **Product Name:** ListMe (`listme`)
- **Domain:** Real Estate Portal (India)
- **Core Value Proposition:** Direct buyer-to-owner and tenant-to-landlord connections with zero brokerage friction, transparent pricing, verified listings, and mobile-first ergonomics.
- **Target Metros:** Delhi NCR (Delhi, Ghaziabad, Noida, Gurgaon), Mumbai, Bangalore (Bengaluru), Pune, Hyderabad, and Kolkata.
- **Key User Roles:**
  - `USER`: Regular property seekers, buyers, tenants, owners, and individual landlords.
  - `ADMIN`: Platform moderators who approve/reject listings, manage users, review interest leads, and monitor activity.
  - `SUPER_ADMIN`: Full system control including role assignments, system settings, and SEO configurations.

---

## 2. Technology Stack & Environment

| Layer | Technology | Version / Details |
|---|---|---|
| **Framework** | Next.js (App Router, Turbopack) | `16.2.10` |
| **Language** | TypeScript | `^5` (Strict type safety, zero TS errors enforced) |
| **UI Library** | React | `19.2.4` |
| **Styling** | Pure CSS Modules (`*.module.css`) | Scoped CSS modules + CSS Custom Properties in `globals.css` (No Tailwind) |
| **Icons** | Lucide React | `lucide-react ^1.24.0` |
| **Database** | PostgreSQL | Hosted on Supabase Database |
| **ORM** | Prisma ORM | `@prisma/client ^7.8.0`, `@prisma/adapter-pg ^7.8.0` |
| **File Storage** | Supabase Storage Buckets | `listing-images`, `listing-videos` |
| **Authentication** | Supabase Auth + Custom Cookies | Signed session cookies (`src/lib/session.ts`) + Supabase Auth |
| **SMS / Phone Auth** | Firebase Auth | `firebase ^12.16.0` (Client-side phone verification & OTP) |
| **Email Service** | Nodemailer | `nodemailer ^9.0.3` (SMTP delivery with HTML templates & logging) |
| **Animations** | GSAP (GreenSock) | `gsap ^3.15.0` (Ticker, smooth transitions, lifecycle cleanup) |
| **Image Compression** | browser-image-compression | `^2.0.2` (Client-side pre-upload optimization) |

---

## 3. Architecture & Global Providers

### Root Layout (`src/app/layout.tsx`)
The global wrapper mounts the following provider hierarchy:
```tsx
<SettingsProvider>       {/* Dynamic platform settings & SEO defaults */}
  <GoogleAnalytics />    {/* Client-side tracking */}
  <AuthProvider>         {/* User session, role state, login/logout methods */}
    <ToastProvider>      {/* Global alert notifications */}
      <MobileMenuProvider> {/* Controls mobile drawer open/close states */}
        <ErrorMonitor /> {/* Global uncaught error logger */}
        {children}
        <div className="mobileOnly">
          <MobileBottomNav />     {/* 5-button bottom navigation bar */}
          <MobileMenuDrawer />    {/* 7-category All Categories side drawer */}
          <MobileSearchDrawer />  {/* Bottom sheet dynamic search drawer */}
        </div>
      </MobileMenuProvider>
    </ToastProvider>
  </AuthProvider>
</SettingsProvider>
```

### Viewport Isolation Strategy (`.desktopOnly` vs `.mobileOnly`)
- Mobile-first approach: Rather than forcing messy responsive compromises into single components, complex experiences use clean dual-viewport isolation:
  - Mobile components live inside `.mobileOnly` or `@media (max-width: 1023px)`.
  - Desktop components live inside `.desktopOnly` or `@media (min-width: 1024px)`.
  - Guarantees 0 horizontal blowout, native mobile ergonomics (bottom sheets, 44px touch targets), and uncompromised desktop layouts.

---

## 4. Database Schema & Prisma Models (`prisma/schema.prisma`)

### Core Models
1. **`Profile` (`profiles`)**:
   - `id`: UUID (matches Supabase Auth UID)
   - `name`, `email` (unique), `phone` (unique), `phoneVerified` (Boolean)
   - `role`: `USER` | `ADMIN` | `SUPER_ADMIN`
   - `status`: `ACTIVE` | `SUSPENDED` | `BANNED`
   - Relations: `listings`, `interests`, `notifications`, `shortlists`, `savedSearches`, `adminLogs`

2. **`Listing` (`listings`)**:
   - `id`: UUID
   - `ownerId`: Relation to `Profile`
   - `listingFor`: `SALE` | `RENT`
   - `propertyType`: `APARTMENT`, `HOUSE`, `VILLA`, `PLOT`, `BUILDER_FLOOR`, `PG`, `OFFICE`, `SHOP`, `WAREHOUSE`, `COMMERCIAL_LAND`, etc.
   - `title`, `description`, `keyHighlights` (array of strings)
   - `city`, `locality`, `subLocality`, `pinCode`, `fullAddress`, `landmark`, `latitude`, `longitude`
   - Pricing: `askingPrice` (Decimal), `pricePerSqft`, `maintenanceCharges`, `securityDeposit`, `priceNegotiable`
   - Specifications: `bedrooms`, `bathrooms`, `balconies`, `carpetArea`, `builtUpArea`, `plotArea`, `furnishing`, `facing`, `possession`, `ownership`, `parking`, `waterSupply`, `powerBackup`, `reraNumber`
   - Status & Moderation: `status` (`DRAFT`, `PENDING_REVIEW`, `ACTIVE`, `REJECTED`, `EXPIRED`, `DEACTIVATED`), `rejectionReason`, `viewCount`, `isFeatured`, `expiresAt`
   - Relations: `images` (`ListingImage`), `videos` (`ListingVideo`), `amenities` (`ListingAmenity`), `documents` (`ListingDocument`), `furnishingItems` (`FurnishingItem`), `interests` (`Interest`), `shortlists` (`Shortlist`)

3. **`ListingImage` & `ListingVideo`**:
   - `ListingImage`: `imageUrl`, `imageType`, `displayOrder`, `isPrimary`
   - `ListingVideo`: `videoUrl`, `videoType` (supports both uploaded mp4/webm from Supabase storage and embeddable links like YouTube/Vimeo)

4. **`Interest` (`interests`)**:
   - Tracks buyer/tenant leads on properties.
   - `userId`, `listingId`, `status` (`NEW`, `ADMIN_CONTACTED`, `IN_PROGRESS`, `SOLD`, `CLOSED`), `adminNotes`, `commissionAmount`

5. **`PasswordResetToken` (`password_reset_tokens`)**:
   - Secure OTP password recovery system.
   - `userId`, `channel` ("EMAIL" | "SMS"), `target` (masked email or phone), `tokenHash`, `expiresAt`, `usedAt`, `attempts`

6. **`AdminActivityLog` & `UserActivityLog`**:
   - Forensic audit trail tracking moderation changes, user signups, logins, and property views.

---

## 5. Directory & File Structure

```
G:\Projects\ListMe\listme\
├── prisma/
│   ├── schema.prisma            # Prisma schema (PostgreSQL)
│   └── seed.ts                  # Database seeder (amenities, default cities, admin)
├── public/                      # Static assets, SVG illustrations, logos
└── src/
    ├── app/
    │   ├── (auth)/              # Auth routes: /login, /signup, /forgot-password
    │   ├── admin/               # Admin portal: /admin, /admin/listings, /admin/users, /admin/activity, /admin/interests
    │   ├── api/                 # Next.js API Routes (Route Handlers)
    │   │   ├── admin/           # Admin APIs (metrics, users, listings, activity)
    │   │   ├── auth/            # Auth APIs (forgot-password, OTP, login, session, check-user)
    │   │   ├── listings/        # Listing CRUD & media upload endpoints
    │   │   ├── cities/          # City directory & trends
    │   │   └── users/           # Profile, shortlist, and lead management
    │   ├── dashboard/           # User dashboard: /dashboard/listings, /dashboard/profile, /dashboard/notifications
    │   ├── listings/            # Public property catalog with filter pills & sort
    │   ├── post-property/       # Post property wizard with dynamic ticker & prefill
    │   ├── property/[id]/       # Property detail page (photos, video player, specs, lead modal)
    │   ├── globals.css          # Design tokens, CSS reset, typography, safe-area variables
    │   ├── layout.tsx           # Root app layout & global provider tree
    │   └── page.tsx             # Homepage (Dual-viewport: desktop view & MobileHome)
    ├── components/
    │   ├── auth/                # AuthModal, LoginForm, SignupForm
    │   ├── home/                # MobileHome.tsx, HeroSearch, FeaturedListings, WhyTrustUs
    │   ├── layout/              # Header, Footer, MobileBottomNav, MobileMenuDrawer, AdminSidebar
    │   ├── search/              # MobileSearchDrawer (Dynamic location & bottom sheet search)
    │   └── ui/                  # Toast, Modal, Button, Badge primitives
    ├── context/
    │   ├── AuthContext.tsx      # User authentication state & methods
    │   ├── MobileMenuContext.tsx# Search drawer & menu drawer open/close control
    │   └── SettingsContext.tsx  # Dynamic system settings
    └── lib/
        ├── firebase/            # Client-side Firebase SDK configuration (Phone OTP)
        ├── supabase/            # Supabase client & server-side clients
        ├── email.ts             # Nodemailer email transport & HTML email templates
        ├── prisma.ts            # Singleton Prisma client instance
        ├── session.ts           # HMAC-signed session cookies and OTP generation
        └── upload.ts            # Supabase storage upload helpers & MIME validators
```

---

## 6. Key Subsystems & Implementations

### A. Mobile Search Bottom Drawer (`MobileSearchDrawer.tsx`)
- **Interaction**: Triggered by tapping the search icon in `MobileBottomNav` or the sticky search capsule on the mobile homepage.
- **Header**: Segmented tabs (`Buy`, `Rent/PG`, `Commercial`), pull handle, and close button.
- **Dynamic Geolocation vs. India Fallback**:
  - Automatically queries `navigator.permissions.query({ name: 'geolocation' })` and registers `status.onchange` to update live if browser site permissions change.
  - **Location Granted (`hasLocationAccess === true`)**:
    - Automatically resolves user coordinates using refined bounding boxes for 9 metros (Ghaziabad, Noida, Gurgaon, Delhi, Mumbai, Bangalore, Pune, Hyderabad, Kolkata) + reverse geocoding fallback with Indian synonym normalization (*Bengaluru* -> *Bangalore*, *Gurugram* -> *Gurgaon*).
    - Renders: `Popular Localities in <span class="boldCity">{selectedCity}</span>` with 6 locality pills (e.g. for Ghaziabad: Indirapuram, Raj Nagar Extension, Vaishali, NH 24, Vasundhara, Ahinsa Khand).
  - **Location Denied / Blocked (`hasLocationAccess === false`)**:
    - Renders: `Popular Cities in <span class="boldCity">India</span>` with 6 metro city pills: `Delhi NCR`, `Mumbai`, `Bangalore`, `Hyderabad`, `Pune`, `Kolkata`.
  - **Routing**: Tapping a locality routes to `/listings?type=${tab}&city=${city}&query=${locality}`. Tapping a city routes to `/listings?type=${tab}&city=${city}`.
  - **Autocomplete & Recent Searches**: Real-time dropdown when query >= 2 characters, recent search caching in `localStorage`.

### B. Mobile Navigation & Header (`MobileBottomNav.tsx`, `Header.tsx`, `MobileHome.tsx`)
- **5-Button Bottom Nav**:
  1. `Home`: Navigates to `/` or smoothly scrolls to top if already on homepage.
  2. `Search`: Opens `MobileSearchDrawer`.
  3. `Sell/Rent` (Center CTA): Features a centered green **FREE** pill badge horizontally aligned with `left: 50%; transform: translateX(-50%);`.
  4. `Activity`: Shows user activity / saved properties.
  5. `Menu`: Opens `MobileMenuDrawer`.
- **All Categories Drawer (`MobileMenuDrawer.tsx`)**:
  - Left navigation rail with 7 categories (`Sell/Rent`, `Buy Residential`, `Rent/PG`, `Buy Commercial`, `Lease Commercial`, `Price & Insights`, `Activity & Support`).
  - Persistent Login/Register card at the top of the content area that auto-resets scroll (`scrollTop = 0`) on category switch.
  - 'Manage Profile' under Activity & Support with auth-guarded routing.
- **Mobile Homepage Header**:
  - Displays official `Home` brand icon + `ListMe` text alongside a fast "Post Property FREE" header CTA.

### C. Admin Portal (`src/app/admin/`)
- **Dedicated Mobile Experience**:
  - Mobile bottom navigation bar specifically for admins (`Dashboard`, `Listings`, `Users`, `Leads`, `More`).
  - 2x2 Metric cards (`Total Listings`, `Active Properties`, `Total Leads`, `Registered Users`).
  - Mobile listing cards: Property thumbnail with 3 compact under-thumbnail action buttons (👁️ View, ✏️ Edit, 🗑️ Delete), symmetrical owner & date baseline alignment, and pill filters.
  - User Directory: Avatar badges, status indicators, phone verification triggers, and detailed inspection modals.
  - Desktop View: Full data tables, CSV export, multi-select bulk actions, and pagination preserved at `>= 1024px`.

### D. Property Listing Wizard (`src/app/post-property/`, `src/app/dashboard/listings/new/`)
- **Dynamic Post Property Hero**:
  - Animated GSAP benefit ticker looping through 4 selling points with golden highlight accents.
  - Category selector: Residential (Sell: 8 pills; Rent: 7 pills; PG: 5 pills + Sharing/Private room types) vs Commercial (2 tabs: Sell and Rent/Lease, 7 commercial pills).
  - Sticky floating mobile bottom CTA ("Start now, it's FREE") with frosted glass background that smoothly scrolls to the contact input if empty.
- **Optional Media**: Photos and videos are 100% optional during creation and editing.
- **Video Handling**: Supports dual-mode upload (direct MP4/WebM upload up to 50MB to Supabase storage OR pasting YouTube/Vimeo links with automatic player embed parsing).

### E. Password Reset & Security (`src/app/(auth)/forgot-password/`, `src/lib/session.ts`)
- Dual-channel OTP verification: User can choose to receive a 6-digit cryptographically random OTP via **Email** or **SMS**.
- Rate limiting: Max 5 attempts per token, 10-minute expiry, single-use invalidation (`usedAt`).
- Signed Reset Tokens: HMAC SHA-256 signed session tokens ensure password change requests are authenticated without relying on client-side state.

---

## 7. Coding Standards & Architectural Guidelines

When writing code for ListMe, you MUST strictly adhere to these rules:

1. **Touch Targets & Ergonomics**:
   - Every mobile interactive element (buttons, pills, dropdown triggers, close icons) MUST have a minimum touch target height of **44px** (or min 40px with pseudo-element expanded touch areas).
   - Use `user-select: none;` and `-webkit-tap-highlight-color: transparent;` on touch elements.

2. **Styling & CSS Modules**:
   - **Do NOT install or introduce Tailwind CSS.** ListMe uses pure CSS Modules (`*.module.css`).
   - Use CSS custom properties defined in `globals.css`:
     - Navy Primary: `var(--color-navy, #0A1128)`
     - Sage Accent: `var(--color-sage, #607A66)`
     - Fonts: `var(--font-heading)` (Outfit), `var(--font-body)` (Inter)
   - Account for device notch and virtual home bar using safe-area insets:
     - `padding-top: env(safe-area-inset-top, 0px);`
     - `padding-bottom: env(safe-area-inset-bottom, 0px);`

3. **Hydration & SSR Safety**:
   - Never access `window`, `document`, or `localStorage` directly in component body during initial render.
   - Guard browser APIs inside `useEffect`, or use state initializers with `typeof window !== 'undefined'` checks.

4. **Accessibility (ARIA)**:
   - Provide explicit `aria-label`, `role="dialog"`, `role="tab"`, `role="tablist"`, `aria-selected`, and `aria-hidden="true"` on decorative icons (e.g. `+` signs in pills).
   - Ensure all non-submitting buttons have explicit `type="button"` to avoid accidental form submissions.

5. **Build & Type Verification**:
   - Always run `npx tsc --noEmit` before considering any task complete.
   - Always ensure `npm run build` succeeds cleanly across all 64 static/dynamic routes.
   - Never bypass types with unsafe `any` casts unless strictly unavoidable.

---

## 8. Quick Verification Commands

```powershell
# Check TypeScript compilation (Must output 0 errors)
npx tsc --noEmit

# Run full Next.js production build (Must build all 64 routes successfully)
npm run build

# Start local development server
npm run dev
```

---

## 9. Current Project State & Recent Commits

The repository is on branch `main` at `https://github.com/kkeyqik/ListMe.git`.
Recent key commits:
- `df20060`: `fix(search): remove change city button from popular localities header`
- `c7909fe`: `feat(search): dynamic location detection for popular localities with India cities fallback`
- `4797fee`: `fix(mobile): harden search and menu drawers against race conditions, scroll jumps, and touch gesture edge cases`
- `7c56d9f`: `fix(search): fix drawer auto-close race condition and connect Home button scroll-to-top`
- `57c8c1a`: `feat(search): add mobile search bottom drawer matching design specifications`
- `11edab3`: `fix(nav): center FREE badge horizontally on mobile bottom nav Sell/Rent button`
- `b85efc0`: `fix(home): harden mobile sticky search bar with safe area, frosted backdrop, and tap reliability`
- `86a5c9b`: `fix(home): add brand logo icon and style mobile homepage header`
- `e4be5a4`: `feat(admin): redesign registered users directory mobile UI matching reference mockup with QA hardening`
- `5c09724`: `feat(auth): implement password reset with dual OTP delivery (Email and SMS)`
- `513a9e1`: `feat(listings): add video file upload to property listing with dual mode (upload/link)`
