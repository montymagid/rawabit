// Edge Function: notify-store-event
// يرسل إشعارات بريد إلكتروني عند: تسجيل متجر جديد (للإدارة + تأكيد للمتجر)، القبول، الرفض، الإيقاف، إعادة التفعيل.
// لتفعيل الإرسال الفعلي: أضف Secret باسم RESEND_API_KEY في إعدادات المشروع (Edge Functions > Secrets)
// من مزود بريد مثل https://resend.com ثم عدّل ADMIN_EMAIL و FROM_EMAIL بالأسفل.

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "montasir.geo@gmail.com";
const FROM_EMAIL = "روابط <onboarding@resend.dev>"; // غيّرها بعد ربط نطاقك في Resend

async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.log("RESEND_API_KEY غير مضبوط — تخطي الإرسال الفعلي:", { to, subject });
    return { skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  return { skipped: false, ok: res.ok };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { type, store_name, store_email, reason } = body;
    let results: any[] = [];

    if (type === "new_registration") {
      results.push(await sendEmail(ADMIN_EMAIL, `طلب تسجيل متجر جديد: ${store_name}`,
        `<p>وصل طلب تسجيل متجر جديد باسم <b>${store_name}</b> (${store_email}).</p><p>يرجى مراجعته من لوحة الإدارة.</p>`));
      if (store_email) {
        results.push(await sendEmail(store_email, "تم استلام طلب تسجيل متجرك في روابط",
          `<p>مرحبًا ${store_name}،</p><p>وصلنا طلب تسجيل متجرك، وسنراجعه قريبًا ونعلمك بالنتيجة عبر البريد.</p>`));
      }
    } else if (type === "approve" && store_email) {
      results.push(await sendEmail(store_email, "تم قبول متجرك في روابط 🎉",
        `<p>مبروك! تم تفعيل متجر <b>${store_name}</b> على منصة روابط. يمكنك الآن تسجيل الدخول ونشر منتجاتك.</p>`));
    } else if (type === "reject" && store_email) {
      results.push(await sendEmail(store_email, "بخصوص طلب تسجيل متجرك في روابط",
        `<p>نأسف، تم رفض طلب تسجيل متجر <b>${store_name}</b>.</p>${reason ? `<p>السبب: ${reason}</p>` : ""}`));
    } else if (type === "suspend" && store_email) {
      results.push(await sendEmail(store_email, "تم إيقاف متجرك مؤقتًا في روابط",
        `<p>تم إيقاف متجر <b>${store_name}</b> مؤقتًا.</p>${reason ? `<p>السبب: ${reason}</p>` : ""}`));
    } else if (type === "reactivate" && store_email) {
      results.push(await sendEmail(store_email, "تم إعادة تفعيل متجرك في روابط",
        `<p>تم إعادة تفعيل متجر <b>${store_name}</b>. أهلًا بعودتك!</p>`));
    }

    return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, message: (err as Error).message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
