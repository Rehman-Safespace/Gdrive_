export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = "https://drive.google.com/drive/folders/1khTtYCnNlklNPwHgf5ZkqsV2VsF1YDHd";

    // المسار السري وكلمة المرور
    const SECRET_PATH = "/show-logs";
    const SECRET_PASS = "safe33"; // تقدر تغير كلمة السر دي لأي كلمة تختارها

    // لو الطلب جاي للمسار السري
    if (url.pathname === SECRET_PATH) {
      const pass = url.searchParams.get("pass");
      if (pass !== SECRET_PASS) {
        return new Response("Unauthorized", { status: 401 });
      }

      if (!env.VISITORS_KV) {
        return new Response("KV Namespace not bound", { status: 500 });
      }

      // جلب جميع المفاتيح المسجلة
      const list = await env.VISITORS_KV.list({ prefix: "visit_" });
      const logs = await Promise.all(
        list.keys.map(async (key) => {
          const val = await env.VISITORS_KV.get(key.name);
          return val ? JSON.parse(val) : null;
        })
      );

      // ترتيب السجلات من الأحدث إلى الأقدم
      const validLogs = logs
        .filter(Boolean)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // صفحة العرض
      const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>سجل الزيارات</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; }
    h2 { text-align: center; color: #38bdf8; margin-bottom: 8px; }
    .meta { text-align: center; margin-bottom: 24px; color: #94a3b8; font-size: 15px; }
    table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); }
    th, td { padding: 12px 16px; text-align: right; border-bottom: 1px solid #334155; font-size: 13px; }
    th { background: #0284c7; color: white; font-weight: bold; }
    tr:hover { background: #334155; }
    .ua { font-size: 11px; color: #cbd5e1; direction: ltr; text-align: left; word-break: break-all; }
    .ltr { direction: ltr; text-align: left; }
    .badge { background: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <h2>سجل زيارات الرابط</h2>
  <div class="meta">إجمالي الزيارات المسجلة: <span class="badge">${validLogs.length}</span></div>
  <table>
    <thead>
      <tr>
        <th>التوقيت</th>
        <th>الموقع (الدولة / المدينة)</th>
        <th>عنوان IP</th>
        <th>المصدر (Referer)</th>
        <th>بيانات المتصفح والجهاز</th>
      </tr>
    </thead>
    <tbody>
      ${validLogs.map(log => `
        <tr>
          <td class="ltr">${new Date(log.timestamp).toLocaleString()}</td>
          <td>${log.country} -${log.city}</td>
          <td class="ltr">${log.ip}</td>
          <td class="ltr">${log.referer}</td>
          <td class="ua">${log.userAgent}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;

      return new Response(html, {
        headers: { "content-type": "text/html;charset=UTF-8" }
      });
    }

    // مسار الزائر العادي: تسجيل ثم تحويل
    const ip = request.headers.get("cf-connecting-ip") || "Unknown";
    const timestamp = new Date().toISOString();

    const visitorData = {
      timestamp: timestamp,
      ip: ip,
      country: request.cf?.country || "Unknown",
      city: request.cf?.city || "Unknown",
      userAgent: request.headers.get("user-agent") || "Unknown",
      referer: request.headers.get("referer") || "Direct / None"
    };

    const recordKey = `visit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    if (env.VISITORS_KV) {
      ctx.waitUntil(env.VISITORS_KV.put(recordKey, JSON.stringify(visitorData)));
    }

    return Response.redirect(targetUrl, 302);
  }
};
