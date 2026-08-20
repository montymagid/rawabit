// Edge Function: fetch-product-meta
// يحاول جلب اسم/صورة/سعر المنتج من رابط أفلييت (نون/أمازون/أي متجر) عبر قراءة وسوم Open Graph.
// ملاحظة: بعض المتاجر (وخصوصًا أمازون) تمنع القراءة الآلية لصفحاتها، فقد لا تتوفر كل الحقول دائمًا.

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractMeta(html: string, ...props: string[]): string | null {
  for (const prop of props) {
    const re1 = new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, "i");
    const re3 = new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
    const m = html.match(re1) || html.match(re2) || html.match(re3);
    if (m) return m[1];
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ ok: false, message: "رابط غير صالح" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
        "Accept-Language": "ar,en;q=0.9",
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, message: `تعذّر الوصول للصفحة (${res.status})` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const html = await res.text();

    const title = extractMeta(html, "og:title", "twitter:title") ||
      (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? null);

    const image = extractMeta(html, "og:image", "twitter:image", "og:image:secure_url");

    let priceStr = extractMeta(html, "og:price:amount", "product:price:amount", "twitter:data1");
    if (!priceStr) {
      const priceMatch = html.match(/"price"\s*:\s*"?([\d.,]+)"?/i) || html.match(/itemprop=["']price["'][^>]+content=["']([\d.,]+)["']/i);
      if (priceMatch) priceStr = priceMatch[1];
    }
    const price = priceStr ? parseFloat(priceStr.toString().replace(/,/g, "")) : null;

    const gotSomething = !!(title || image || price);

    return new Response(JSON.stringify({
      ok: gotSomething,
      title: title ? title.trim().slice(0, 200) : null,
      image: image || null,
      price: price && !isNaN(price) ? price : null,
      message: gotSomething ? null : "لم يتم العثور على بيانات كافية في هذه الصفحة",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, message: "تعذّر قراءة الرابط: " + (err as Error).message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
