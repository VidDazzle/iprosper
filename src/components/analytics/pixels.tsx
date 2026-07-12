"use client";

import Script from "next/script";

/**
 * Client-side ad pixels: Meta Pixel, TikTok Pixel, Google gtag (Ads + GA4).
 * Each loads only when its ID is configured via NEXT_PUBLIC_* env vars, so the
 * site is clean in dev and when a given channel isn't live yet.
 *
 * Env:
 *   NEXT_PUBLIC_META_PIXEL_ID
 *   NEXT_PUBLIC_TIKTOK_PIXEL_ID
 *   NEXT_PUBLIC_GOOGLE_ADS_ID     (e.g. AW-XXXXXXXXX)
 *   NEXT_PUBLIC_GA4_ID            (e.g. G-XXXXXXXXX)
 */
export default function AdPixels() {
  const meta = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const tiktok = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const googleAds = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const ga4 = process.env.NEXT_PUBLIC_GA4_ID;
  const googleId = googleAds || ga4;

  return (
    <>
      {meta && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${meta}');fbq('track','PageView');`}
        </Script>
      )}

      {tiktok && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
ttq.load('${tiktok}');ttq.page();}(window,document,'ttq');`}
        </Script>
      )}

      {googleId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleId}`}
            strategy="afterInteractive"
          />
          <Script id="google-gtag" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());${ga4 ? `gtag('config','${ga4}');` : ""}${googleAds ? `gtag('config','${googleAds}');` : ""}`}
          </Script>
        </>
      )}
    </>
  );
}
