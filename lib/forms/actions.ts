import { db } from '@/lib/db/prisma';
import { createNotification } from '@/lib/notifications/service';

export interface FormSubmissionPayload {
  [key: string]: any;
}

export function extractLeadDataFromPayload(payload: FormSubmissionPayload) {
  const cleanPayload: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined && v !== null) {
      cleanPayload[k.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')] = String(v);
    }
  }

  // 1. Name extraction
  let name: string | null =
    cleanPayload.name ||
    cleanPayload.full_name ||
    cleanPayload.fullname ||
    cleanPayload.your_name ||
    cleanPayload.contact_name ||
    null;

  if (!name && (cleanPayload.first_name || cleanPayload.firstname)) {
    const first = cleanPayload.first_name || cleanPayload.firstname || '';
    const last = cleanPayload.last_name || cleanPayload.lastname || '';
    name = `${first} ${last}`.trim() || null;
  }

  // 2. Email extraction
  let email: string | null =
    cleanPayload.email ||
    cleanPayload.your_email ||
    cleanPayload.email_address ||
    cleanPayload.contact_email ||
    null;

  if (!email) {
    for (const val of Object.values(cleanPayload)) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        email = val;
        break;
      }
    }
  }

  // 3. Phone extraction
  const phone: string | null =
    cleanPayload.phone ||
    cleanPayload.phone_number ||
    cleanPayload.tel ||
    cleanPayload.telephone ||
    cleanPayload.mobile ||
    cleanPayload.mobile_number ||
    cleanPayload.contact_phone ||
    null;

  // 4. Message extraction
  const message: string | null =
    cleanPayload.message ||
    cleanPayload.comments ||
    cleanPayload.inquiry ||
    cleanPayload.notes ||
    cleanPayload.description ||
    cleanPayload.query ||
    null;

  // 5. Attribution parameters
  const utmSource = cleanPayload.utm_source || cleanPayload.utmsource || null;
  const utmMedium = cleanPayload.utm_medium || cleanPayload.utmmedium || null;
  const utmCampaign = cleanPayload.utm_campaign || cleanPayload.utmcampaign || null;
  const utmTerm = cleanPayload.utm_term || cleanPayload.utmterm || null;
  const utmContent = cleanPayload.utm_content || cleanPayload.utmcontent || null;
  const landingPage = cleanPayload.landing_page || cleanPayload.landingpage || cleanPayload._landing_page || null;
  const referrer = cleanPayload.referrer || cleanPayload._referrer || cleanPayload.http_referrer || null;
  const device = cleanPayload.device || cleanPayload._device || cleanPayload.user_agent || null;

  return {
    name,
    email,
    phone,
    message,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    landingPage,
    referrer,
    device,
  };
}

export async function processFormSubmissionActions(
  form: any,
  submissionId: string,
  payload: FormSubmissionPayload
) {
  const actions = Array.isArray(form.actions)
    ? [...form.actions].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
    : [];

  const enabledActions = actions.filter((a: any) => a.enabled);
  let createdLeadId: string | null = null;
  let customSuccessMessage: string | null = form.successMessage || null;
  let customRedirectUrl: string | null = form.redirectUrl || null;

  const leadData = extractLeadDataFromPayload(payload);

  for (const act of enabledActions) {
    let config: any = {};
    try {
      config = typeof act.config === 'string' ? JSON.parse(act.config) : act.config || {};
    } catch {
      config = {};
    }

    switch (act.type) {
      case 'CREATE_LEAD': {
        // Create Lead
        const lead = await db.lead.create({
          data: {
            websiteId: form.websiteId,
            formSubmissionId: submissionId,
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone,
            message: leadData.message,
            status: 'NEW',
            utmSource: leadData.utmSource,
            utmMedium: leadData.utmMedium,
            utmCampaign: leadData.utmCampaign,
            utmTerm: leadData.utmTerm,
            utmContent: leadData.utmContent,
            landingPage: leadData.landingPage,
            referrer: leadData.referrer,
            device: leadData.device,
          },
        });

        createdLeadId = lead.id;

        // Log initial activities: CREATED and FORM_SUBMITTED
        await db.leadActivity.createMany({
          data: [
            {
              leadId: lead.id,
              type: 'CREATED',
              detail: `Lead created from form "${form.name}"`,
            },
            {
              leadId: lead.id,
              type: 'FORM_SUBMITTED',
              detail: `Form "${form.name}" submitted with ${Object.keys(payload).length} fields`,
            },
          ],
        });

        // Fire NEW_LEAD notification
        try {
          const ws = await db.website.findUnique({
            where: { id: form.websiteId },
            select: { organizationId: true, name: true },
          });
          if (ws) {
            await createNotification({
              organizationId: ws.organizationId,
              websiteId: form.websiteId,
              type: 'NEW_LEAD',
              severity: 'INFO',
              title: 'New lead received',
              detail: `New lead received from "${leadData.name || leadData.email || 'Anonymous'}" via form "${form.name}".`,
              linkPath: '/leads',
            });
          }
        } catch {}
        break;
      }

      case 'SHOW_SUCCESS_MESSAGE': {
        if (config.message) {
          customSuccessMessage = config.message;
        }
        break;
      }

      case 'REDIRECT': {
        if (config.url) {
          customRedirectUrl = config.url;
        }
        break;
      }

      case 'SEND_EMAIL': {
        // Enqueue or log notification
        console.log(`[Form Action] Sending email notification to ${config.toEmail || 'owner'} for form ${form.name}`);
        break;
      }

      case 'SEND_WEBHOOK': {
        if (config.url) {
          // Asynchronously trigger webhook without blocking
          fetch(config.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'TythasControlCenter/1.0' },
            body: JSON.stringify({
              event: 'form.submission',
              formId: form.id,
              formName: form.name,
              submissionId,
              payload,
              lead: leadData,
              timestamp: new Date().toISOString(),
            }),
          }).catch(async (err) => {
            console.error(`[Form Action] Webhook delivery failed for ${config.url}:`, err.message);
            try {
              const ws = await db.website.findUnique({
                where: { id: form.websiteId },
                select: { organizationId: true },
              });
              if (ws) {
                await createNotification({
                  organizationId: ws.organizationId,
                  websiteId: form.websiteId,
                  type: 'FORM_ERROR',
                  severity: 'WARNING',
                  title: 'Form webhook delivery failed',
                  detail: `Webhook action for form "${form.name}" failed: ${err.message}`,
                  linkPath: '/forms',
                });
              }
            } catch {}
          });
        }
        break;
      }

      case 'TRIGGER_CONVERSION': {
        console.log(`[Form Action] Conversion event logged: ${config.eventName || 'generate_lead'} on website ${form.websiteId}`);
        break;
      }
    }
  }

  return {
    leadId: createdLeadId,
    successMessage: customSuccessMessage || 'Thank you! Your submission has been received.',
    redirectUrl: customRedirectUrl,
  };
}
