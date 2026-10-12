export default {
  async fetch(request, env, ctx) {
    const targetUrl = "https://drive.google.com/drive/folders/1khTtYCnNlklNPwHgf5ZkqsV2VsF1YDHd";

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

    // مفتاح فريد لكل زيارة
    const recordKey = `visit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // حفظ البيانات في الخلفية
    if (env.VISITORS_KV) {
      ctx.waitUntil(env.VISITORS_KV.put(recordKey, JSON.stringify(visitorData)));
    }

    // التحويل الفوري للرابط
    return Response.redirect(targetUrl, 302);
  }
};
