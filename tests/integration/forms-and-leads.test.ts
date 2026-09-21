import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db/prisma';
import { requireWebsiteAccess } from '@/lib/auth/context';
import { NotFoundError } from '@/lib/http/errors';
import { processFormSubmissionActions, extractLeadDataFromPayload } from '@/lib/forms/actions';
import { CustomConnector } from '@/lib/connectors/custom';
import { WordPressConnector } from '@/lib/connectors/wordpress';
import crypto from 'crypto';

describe('Phase 5: Forms & Leads Integration Tests', () => {
  let orgA: { id: string; name: string };
  let orgB: { id: string; name: string };
  let userA: { id: string; email: string };
  let websiteA: { id: string; domain: string };
  let websiteB: { id: string; domain: string };

  beforeEach(async () => {
    // Clean database
    await db.leadActivity.deleteMany();
    await db.lead.deleteMany();
    await db.formSubmission.deleteMany();
    await db.formAction.deleteMany();
    await db.formField.deleteMany();
    await db.form.deleteMany();
    await db.websiteAccess.deleteMany();
    await db.website.deleteMany();
    await db.client.deleteMany();
    await db.organizationMember.deleteMany();
    await db.user.deleteMany();
    await db.organization.deleteMany();

    // Org A
    orgA = await db.organization.create({ data: { name: 'Org Alpha' } });
    userA = await db.user.create({ data: { email: 'owner-a@alpha.example', passwordHash: 'hash' } });
    await db.organizationMember.create({
      data: { organizationId: orgA.id, userId: userA.id, role: 'OWNER', status: 'ACTIVE' },
    });
    const clientA = await db.client.create({ data: { organizationId: orgA.id, name: 'Client A' } });
    websiteA = await db.website.create({
      data: {
        organizationId: orgA.id,
        clientId: clientA.id,
        name: 'Alpha Site',
        domain: 'alpha.example',
        connectionState: 'CONNECTED',
        ownershipVerifiedAt: new Date(),
      },
    });

    // Org B
    orgB = await db.organization.create({ data: { name: 'Org Beta' } });
    const clientB = await db.client.create({ data: { organizationId: orgB.id, name: 'Client B' } });
    websiteB = await db.website.create({
      data: {
        organizationId: orgB.id,
        clientId: clientB.id,
        name: 'Beta Site',
        domain: 'beta.example',
        connectionState: 'CONNECTED',
        ownershipVerifiedAt: new Date(),
      },
    });
  });

  it('enforces multi-tenant isolation: accessing cross-tenant website forms returns 404', async () => {
    const ctxA = {
      userId: userA.id,
      email: userA.email,
      organizationId: orgA.id,
      organizationName: orgA.name,
      role: 'OWNER' as const,
      sessionId: 'sess_123',
    };

    // User A can access website A
    const accessedA = await requireWebsiteAccess(ctxA, websiteA.id);
    expect(accessedA.id).toBe(websiteA.id);

    // User A accessing website B throws NotFoundError (404)
    await expect(requireWebsiteAccess(ctxA, websiteB.id)).rejects.toThrowError(NotFoundError);
  });

  it('creates form with default fields, actions, and generates unguessable public key', async () => {
    const publicKey = `frm_pk_${crypto.randomBytes(16).toString('hex')}`;
    const form = await db.form.create({
      data: {
        websiteId: websiteA.id,
        name: 'Request a Quote',
        status: 'DRAFT',
        publicKey,
        fields: {
          create: [
            { label: 'Full Name', type: 'TEXT', placeholder: 'Jane Doe', required: true, order: 0 },
            { label: 'Email', type: 'EMAIL', placeholder: 'jane@example.com', required: true, order: 1 },
            { label: 'Message', type: 'TEXT', placeholder: 'Your message', required: true, order: 2 },
          ],
        },
        actions: {
          create: [
            { type: 'CREATE_LEAD', enabled: true, order: 0 },
            { type: 'SHOW_SUCCESS_MESSAGE', enabled: true, config: JSON.stringify({ message: 'Thank you!' }), order: 1 },
          ],
        },
      },
      include: {
        fields: { orderBy: { order: 'asc' } },
        actions: { orderBy: { order: 'asc' } },
      },
    });

    expect(form.id).toBeDefined();
    expect(form.name).toBe('Request a Quote');
    expect(form.publicKey).toMatch(/^frm_pk_/);
    expect(form.fields).toHaveLength(3);
    expect(form.actions).toHaveLength(2);
    expect(form.actions[0].type).toBe('CREATE_LEAD');
    expect(form.actions[0].enabled).toBe(true);
  });

  it('extracts lead attribution and fields from submission payload correctly', () => {
    const payload = {
      Full_Name: 'Arthur Dent',
      Work_Email: 'arthur@earth.example',
      Phone_Number: '+44 7700 900077',
      Inquiry: 'Looking for distributor pricing for botanical cosmetics.',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'spring_launch',
      utm_term: 'luxury skincare',
      utm_content: 'banner_a',
      landing_page: '/products/botanical-serum',
      referrer: 'https://google.co.uk',
      device: 'Desktop (macOS / Safari)',
    };

    const extracted = extractLeadDataFromPayload(payload);
    expect(extracted.name).toBe('Arthur Dent');
    expect(extracted.email).toBe('arthur@earth.example');
    expect(extracted.phone).toBe('+44 7700 900077');
    expect(extracted.message).toBe('Looking for distributor pricing for botanical cosmetics.');
    expect(extracted.utmSource).toBe('google');
    expect(extracted.utmMedium).toBe('cpc');
    expect(extracted.utmCampaign).toBe('spring_launch');
    expect(extracted.landingPage).toBe('/products/botanical-serum');
  });

  it('processes submission actions: preserves raw payload, creates lead, and logs activity timeline', async () => {
    const publicKey = `frm_pk_test_${Date.now()}`;
    const form = await db.form.create({
      data: {
        websiteId: websiteA.id,
        name: 'Contact Form',
        status: 'DEPLOYED',
        publicKey,
        actions: {
          create: [
            { type: 'CREATE_LEAD', enabled: true, order: 0 },
            { type: 'SHOW_SUCCESS_MESSAGE', enabled: true, config: JSON.stringify({ message: 'We received your message!' }), order: 1 },
          ],
        },
      },
      include: {
        actions: true,
      },
    });

    const payload = {
      contact_name: 'Ford Prefect',
      email: 'ford@guide.example',
      phone: '+1 555 4242',
      message: 'Don\'t Panic.',
      utm_source: 'newsletter',
      utm_medium: 'email',
    };

    const submission = await db.formSubmission.create({
      data: {
        formId: form.id,
        rawPayload: JSON.stringify(payload),
      },
    });

    const result = await processFormSubmissionActions(form, submission.id, payload);
    expect(result.leadId).toBeDefined();
    expect(result.successMessage).toBe('We received your message!');

    // Verify created Lead
    const lead = await db.lead.findUnique({
      where: { id: result.leadId! },
      include: {
        activities: { orderBy: { createdAt: 'asc' } },
        formSubmission: true,
      },
    });

    expect(lead).toBeDefined();
    expect(lead?.name).toBe('Ford Prefect');
    expect(lead?.email).toBe('ford@guide.example');
    expect(lead?.status).toBe('NEW');
    expect(lead?.utmSource).toBe('newsletter');
    expect(lead?.formSubmission?.rawPayload).toBe(JSON.stringify(payload));

    // Verify activity timeline has CREATED and FORM_SUBMITTED entries
    expect(lead?.activities).toHaveLength(2);
    expect(lead?.activities[0].type).toBe('CREATED');
    expect(lead?.activities[1].type).toBe('FORM_SUBMITTED');
  });

  it('tracks status change and adds internal notes to the lead activity timeline', async () => {
    const lead = await db.lead.create({
      data: {
        websiteId: websiteA.id,
        name: 'Trillian Astra',
        email: 'trillian@galaxy.example',
        status: 'NEW',
      },
    });

    // Update status to CONTACTED
    await db.lead.update({
      where: { id: lead.id },
      data: {
        status: 'CONTACTED',
        activities: {
          create: {
            type: 'STATUS_CHANGED',
            detail: 'Status changed from NEW to CONTACTED by manager',
          },
        },
      },
    });

    // Append internal note
    await db.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'NOTE_ADDED',
        detail: 'Spoke on the phone regarding opening bulk order of 250 units.',
        createdBy: userA.id,
      },
    });

    const updated = await db.lead.findUnique({
      where: { id: lead.id },
      include: {
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    expect(updated?.status).toBe('CONTACTED');
    expect(updated?.activities).toHaveLength(2);
    expect(updated?.activities[0].type).toBe('NOTE_ADDED');
    expect(updated?.activities[1].type).toBe('STATUS_CHANGED');
  });

  it('connector deployForm generates snippet and validates deployment', async () => {
    const customConnector = new CustomConnector();
    const wpConnector = new WordPressConnector();

    const form = await db.form.create({
      data: {
        websiteId: websiteA.id,
        name: 'Footer Newsletter',
        status: 'DRAFT',
        publicKey: 'frm_pk_footer_123',
        fields: {
          create: [{ label: 'Email', type: 'EMAIL', required: true, order: 0 }],
        },
      },
      include: {
        fields: true,
      },
    });

    // Custom Connector deploy
    const customResult = await customConnector.deployForm(websiteA.domain, form);
    expect(customResult.deployed).toBe(true);

    // WordPress Connector deploy (returns embedSnippet fallback if no plugin active)
    const wpResult = await wpConnector.deployForm(websiteA.domain, form);
    expect(wpResult.embedSnippet).toContain('frm_pk_footer_123');
    expect(wpResult.embedSnippet).toContain('_hp_company');
  });
});
