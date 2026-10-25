import React, { useEffect, useState } from 'react';

export interface VendorSEOData {
  vendor_id: string;
  vendor_name: string;
  google_analytics_id?: string;
  google_tag_manager_id?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  canonical_url?: string;
  og_image_url?: string;
  schema_json_ld?: any;
}

interface VendorSEOMetaManagerProps {
  vendorId?: string;
  customTitle?: string;
  customDescription?: string;
  pageType?: string;
}

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

export const VendorSEOMetaManager: React.FC<VendorSEOMetaManagerProps> = ({
  vendorId = 'vendor_anb_philly',
  customTitle,
  customDescription,
  pageType = 'fleet_booking'
}) => {
  const [seoData, setSeoData] = useState<VendorSEOData | null>(null);

  useEffect(() => {
    let isMounted = true;
    const cleanId = vendorId.replace('-', '_');

    // Fetch authoritative SEO & Analytics metadata from backend
    fetch(`/api/v1/vendors/${cleanId}/seo`)
      .then((res) => {
        if (!res.ok) throw new Error('SEO fetch status: ' + res.status);
        return res.json();
      })
      .then((data: VendorSEOData) => {
        if (!isMounted) return;
        setSeoData(data);
      })
      .catch(() => {
        // Fallback to local hub endpoint if running in global hub context
        fetch(`/api/v1/global-hub/vendors/${cleanId}/seo`)
          .then((res) => res.json())
          .then((data: VendorSEOData) => {
            if (isMounted) setSeoData(data);
          })
          .catch(() => {});
      });

    return () => {
      isMounted = false;
    };
  }, [vendorId]);

  useEffect(() => {
    if (!seoData) return;

    // 1. DYNAMIC PAGE TITLE
    const title = customTitle || seoData.seo_title || `${seoData.vendor_name} | Sovereign Executive Chauffeur Service`;
    document.title = title;

    // Helper to create or update meta tag
    const setMetaTag = (attrName: string, attrVal: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrVal}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 2. STANDARD SEO META TAGS
    const desc = customDescription || seoData.seo_description || `Premier luxury chauffeur and limousine transportation by ${seoData.vendor_name}.`;
    setMetaTag('name', 'description', desc);
    if (seoData.seo_keywords) {
      setMetaTag('name', 'keywords', seoData.seo_keywords);
    }
    setMetaTag('name', 'author', seoData.vendor_name);

    // 3. OPEN GRAPH TAGS (FOR SOCIAL & SEARCH PREVIEWS)
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', desc);
    setMetaTag('property', 'og:type', 'website');
    if (seoData.canonical_url) {
      setMetaTag('property', 'og:url', seoData.canonical_url);
    }
    if (seoData.og_image_url) {
      const fullImageUrl = seoData.og_image_url.startsWith('http')
        ? seoData.og_image_url
        : `${window.location.origin}${seoData.og_image_url}`;
      setMetaTag('property', 'og:image', fullImageUrl);
    }

    // 4. CANONICAL LINK
    if (seoData.canonical_url) {
      let linkElement = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
      if (!linkElement) {
        linkElement = document.createElement('link');
        linkElement.setAttribute('rel', 'canonical');
        document.head.appendChild(linkElement);
      }
      linkElement.setAttribute('href', seoData.canonical_url);
    }

    // 5. STRUCTURED DATA (JSON-LD SCHEMA)
    if (seoData.schema_json_ld) {
      let scriptElement = document.getElementById('vendor-schema-jsonld') as HTMLScriptElement;
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.id = 'vendor-schema-jsonld';
        scriptElement.type = 'application/ld+json';
        document.head.appendChild(scriptElement);
      }
      scriptElement.text = JSON.stringify(seoData.schema_json_ld);
    }

    // 6. ISOLATED GOOGLE ANALYTICS 4 (GA4) INJECTION PER VENDOR
    if (seoData.google_analytics_id && seoData.google_analytics_id.startsWith('G-')) {
      const gaScriptId = `ga4-script-${seoData.vendor_id}`;
      let gaScript = document.getElementById(gaScriptId) as HTMLScriptElement;
      if (!gaScript) {
        gaScript = document.createElement('script');
        gaScript.id = gaScriptId;
        gaScript.async = true;
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${seoData.google_analytics_id}`;
        document.head.appendChild(gaScript);

        window.dataLayer = window.dataLayer || [];
        function gtag(...args: any[]) {
          window.dataLayer.push(args);
        }
        window.gtag = gtag;
        gtag('js', new Date());
      }

      if (window.gtag) {
        window.gtag('config', seoData.google_analytics_id, {
          page_path: window.location.pathname,
          vendor_id: seoData.vendor_id,
          page_type: pageType,
          send_page_view: true
        });
      }
    }
  }, [seoData, customTitle, customDescription, pageType]);

  return null;
};
