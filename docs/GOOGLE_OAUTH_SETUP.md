# Google OAuth setup (only you can finish this)

Cloudflare D1, schema, Pages D1 binding, and `SITE_URL` are already done.

You still need a **Google Cloud OAuth Web client** so Sign in works.

## 1. Create OAuth client

1. Open [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Credentials**
2. Configure **OAuth consent screen** if prompted (External is fine for personal projects; add your Google account as test user while in Testing)
3. **Create credentials** → **OAuth client ID** → Application type: **Web application**
4. Name: `Daily Word Hunt`
5. **Authorized JavaScript origins**
   - `https://words.sagasu.art`
6. **Authorized redirect URIs**
   - `https://words.sagasu.art/api/auth/callback`
7. Copy **Client ID** and **Client Secret**

## 2. Put secrets on Cloudflare Pages

Dashboard → **Workers & Pages** → **daily-word-hunt** → **Settings** → **Environment variables**  
(or Variables and Secrets)

| Name | Value | Type | Env |
|------|--------|------|-----|
| `GOOGLE_CLIENT_ID` | (from Google) | Plain text | Production (+ Preview if you test) |
| `GOOGLE_CLIENT_SECRET` | (from Google) | **Secret / Encrypt** | Production (+ Preview) |

Already set by automation (do not remove):

| Name | Value |
|------|--------|
| `SITE_URL` | `https://words.sagasu.art` |
| `PUBLIC_GA_MEASUREMENT_ID` | `G-SZMGNMBD0Z` |
| D1 binding `DB` | database `daily-word-hunt` |

After adding Google vars: **Retry deployment** or push any commit so Functions pick them up.

## 3. Smoke test

1. Open https://words.sagasu.art/ → **Sign in**
2. Complete Google consent
3. Should return `/?auth=ok` and show your name/avatar
4. Finish today’s puzzle → check https://words.sagasu.art/leaderboard/
5. Open https://words.sagasu.art/practice/ → clear one → Next should avoid same ID when signed in

## Support email

`support@sagasu.art` already Email-Routes to `sagasu718@gmail.com` (enabled). No change required unless you want a different destination.
