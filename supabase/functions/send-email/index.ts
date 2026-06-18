// @ts-nocheck
// Zenspace — Supabase Edge Function: send-email
// Sends welcome or subscription emails via Resend API
// Deploy: supabase functions deploy send-email
// Secrets needed: RESEND_API_KEY, FROM_EMAIL (optional)

// deno-lint-ignore-file
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Zenspace <onboarding@resend.dev>';

async function sendResendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error: ${err}`);
  }
  return res.json();
}

// ── Welcome Email Template ─────────────────────────────────────
function welcomeEmailHtml(name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Welcome to Zenspace</title>
</head>
<body style="margin:0;padding:0;background:#F8F8F8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F8F8;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo Header -->
        <tr><td style="background:#0A0A0A;border-radius:14px 14px 0 0;padding:28px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:rgba(255,255,255,0.12);border-radius:9px;border:1px solid rgba(255,255,255,0.15);width:34px;height:34px;text-align:center;vertical-align:middle;">
                      <span style="font-size:16px;color:#fff;">✦</span>
                    </td>
                    <td style="padding-left:10px;font-size:20px;color:#fff;font-weight:400;letter-spacing:-0.01em;">Zenspace</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Hero -->
        <tr><td style="background:#0A0A0A;padding:0 36px 36px;">
          <h1 style="margin:0 0 12px;font-size:32px;color:#fff;font-weight:400;letter-spacing:-0.02em;line-height:1.2;">
            Welcome, ${name}! 🎓
          </h1>
          <p style="margin:0;font-size:16px;color:rgba(255,255,255,0.55);line-height:1.6;">
            Your calm, focused study space is ready. Everything you need to stay organised and on top of your academics — in one place.
          </p>
        </td></tr>

        <!-- White body -->
        <tr><td style="background:#fff;padding:36px;">

          <!-- Features list -->
          <p style="margin:0 0 20px;font-size:14px;color:#555;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">What's waiting for you</p>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 0;border-bottom:1px solid #F0F0F0;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="width:32px;height:32px;background:#0A0A0A;border-radius:8px;text-align:center;vertical-align:middle;font-size:14px;">📋</td>
                <td style="padding-left:12px;">
                  <div style="font-size:14px;color:#0A0A0A;font-weight:600;">Task Management</div>
                  <div style="font-size:12px;color:#888;margin-top:2px;">Track assignments, deadlines &amp; goals</div>
                </td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #F0F0F0;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="width:32px;height:32px;background:#0A0A0A;border-radius:8px;text-align:center;vertical-align:middle;font-size:14px;">⏱️</td>
                <td style="padding-left:12px;">
                  <div style="font-size:14px;color:#0A0A0A;font-weight:600;">Focus Timer</div>
                  <div style="font-size:12px;color:#888;margin-top:2px;">Pomodoro sessions with smart tracking</div>
                </td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #F0F0F0;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="width:32px;height:32px;background:#0A0A0A;border-radius:8px;text-align:center;vertical-align:middle;font-size:14px;">📝</td>
                <td style="padding-left:12px;">
                  <div style="font-size:14px;color:#0A0A0A;font-weight:600;">Smart Notes</div>
                  <div style="font-size:12px;color:#888;margin-top:2px;">Rich notes with images, tags &amp; search</div>
                </td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:12px 0;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="width:32px;height:32px;background:#0A0A0A;border-radius:8px;text-align:center;vertical-align:middle;font-size:14px;">💬</td>
                <td style="padding-left:12px;">
                  <div style="font-size:14px;color:#0A0A0A;font-weight:600;">Study Groups</div>
                  <div style="font-size:12px;color:#888;margin-top:2px;">Chat &amp; collaborate with classmates</div>
                </td>
              </tr></table>
            </td></tr>
          </table>

          <!-- CTA -->
          <div style="margin-top:28px;text-align:center;">
            <a href="https://zenspace.app/dashboard.html" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.02em;">
              Open your dashboard →
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F4F4F4;border-radius:0 0 14px 14px;padding:24px 36px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
            You're receiving this because you created a Zenspace account.<br/>
            © 2026 Zenspace. Made with ❤️ for students.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Subscription Email Template ────────────────────────────────
function subscriptionEmailHtml(name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>You're now Zenspace Pro!</title>
</head>
<body style="margin:0;padding:0;background:#F8F8F8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F8F8;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo Header -->
        <tr><td style="background:#0A0A0A;border-radius:14px 14px 0 0;padding:28px 36px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td>
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="background:rgba(255,255,255,0.12);border-radius:9px;border:1px solid rgba(255,255,255,0.15);width:34px;height:34px;text-align:center;vertical-align:middle;">
                  <span style="font-size:16px;color:#fff;">✦</span>
                </td>
                <td style="padding-left:10px;font-size:20px;color:#fff;font-weight:400;">Zenspace</td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Crown badge -->
        <tr><td style="background:#0A0A0A;padding:24px 36px 0;text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:50px;padding:8px 20px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:0.08em;text-transform:uppercase;">
            👑 &nbsp; Pro Member
          </div>
        </td></tr>

        <!-- Hero -->
        <tr><td style="background:#0A0A0A;padding:20px 36px 36px;text-align:center;">
          <h1 style="margin:0 0 12px;font-size:34px;color:#fff;font-weight:400;letter-spacing:-0.02em;line-height:1.2;">
            You're Pro, ${name}! ✨
          </h1>
          <p style="margin:0;font-size:16px;color:rgba(255,255,255,0.55);line-height:1.6;">
            Thank you for upgrading. All premium features are now unlocked and your subscription is active for the next 12 months.
          </p>
        </td></tr>

        <!-- White body -->
        <tr><td style="background:#fff;padding:36px;">

          <!-- What you unlocked -->
          <p style="margin:0 0 20px;font-size:14px;color:#555;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">What you've unlocked</p>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:10px 0;border-bottom:1px solid #F0F0F0;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="color:#006633;font-size:14px;font-weight:700;width:20px;">✓</td>
                <td style="padding-left:10px;font-size:14px;color:#0A0A0A;">Attendance Tracker with CGPA Calculator</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #F0F0F0;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="color:#006633;font-size:14px;font-weight:700;width:20px;">✓</td>
                <td style="padding-left:10px;font-size:14px;color:#0A0A0A;">Zenlab — AI Math, Physics &amp; Chemistry</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #F0F0F0;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="color:#006633;font-size:14px;font-weight:700;width:20px;">✓</td>
                <td style="padding-left:10px;font-size:14px;color:#0A0A0A;">Document Utilities (PDF, Converter, Compressor)</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:10px 0;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="color:#006633;font-size:14px;font-weight:700;width:20px;">✓</td>
                <td style="padding-left:10px;font-size:14px;color:#0A0A0A;">Finance Manager with Budget &amp; Analytics</td>
              </tr></table>
            </td></tr>
          </table>

          <!-- Receipt note -->
          <div style="margin-top:24px;background:#F4F4F4;border-radius:10px;padding:16px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#888;">Plan</td>
                <td style="font-size:13px;color:#0A0A0A;font-weight:600;text-align:right;">Zenspace Pro — 1 Year</td>
              </tr>
              <tr><td style="height:6px;" colspan="2"></td></tr>
              <tr>
                <td style="font-size:13px;color:#888;">Amount paid</td>
                <td style="font-size:13px;color:#0A0A0A;font-weight:600;text-align:right;">₹99</td>
              </tr>
              <tr><td style="height:6px;" colspan="2"></td></tr>
              <tr>
                <td style="font-size:13px;color:#888;">Status</td>
                <td style="font-size:13px;font-weight:600;text-align:right;">
                  <span style="background:#EEF8F2;color:#006633;padding:2px 10px;border-radius:20px;">Active</span>
                </td>
              </tr>
            </table>
          </div>

          <!-- CTA -->
          <div style="margin-top:28px;text-align:center;">
            <a href="https://zenspace.app/dashboard.html" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.02em;">
              Go to dashboard →
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F4F4F4;border-radius:0 0 14px 14px;padding:24px 36px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
            Questions? Reply to this email and we'll help you out.<br/>
            © 2026 Zenspace. Thank you for supporting us 💙
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Main handler ───────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.warn('[send-email] RESEND_API_KEY not set — skipping email');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const type = body.type as string;
    const email = user.email ?? '';
    const meta = user.user_metadata || {};
    const firstName = (meta.full_name || meta.name || '').split(' ')[0] || 'there';

    let subject = '';
    let html = '';

    if (type === 'welcome') {
      subject = `Welcome to Zenspace, ${firstName}! 🎓`;
      html = welcomeEmailHtml(firstName);
    } else if (type === 'subscription') {
      subject = `You're now a Zenspace Pro member, ${firstName}! ✨`;
      html = subscriptionEmailHtml(firstName);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid type. Use "welcome" or "subscription".' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await sendResendEmail(email, subject, html);
    console.log(`[send-email] Sent "${type}" email to ${email}`, result);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[send-email] Error:', e);
    return new Response(JSON.stringify({ error: String(e.message) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
