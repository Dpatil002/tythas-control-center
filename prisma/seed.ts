import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth/password';
import { encrypt } from '../lib/auth/crypto';
import { hashToken } from '../lib/auth/tokens';
import { encryptIntegrationToken } from '../lib/integrations/crypto';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    throw new Error('Refusing to run seed.ts against production. This script is for local development only.');
  }

  console.log('🌱 Seeding Tythas Control Center database (Phase 6)...');

  const ownerEmail = process.env.SEED_OWNER_EMAIL || 'owner@tythas.example';
  const ownerPassword = process.env.SEED_OWNER_PASSWORD || 'ChangeMe123!';

  // Clean existing data in dev environment
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.monitoringIncident.deleteMany();
  await prisma.monitoringCheck.deleteMany();
  await prisma.conversionEventMapping.deleteMany();
  await prisma.conversionEvent.deleteMany();
  await prisma.customScript.deleteMany();
  await prisma.googleBusinessReview.deleteMany();
  await prisma.integrationCredential.deleteMany();
  await prisma.integrationConnection.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.formSubmission.deleteMany();
  await prisma.formAction.deleteMany();
  await prisma.formField.deleteMany();
  await prisma.form.deleteMany();
  await prisma.analysisIssue.deleteMany();
  await prisma.analyzedPage.deleteMany();
  await prisma.websiteAnalysis.deleteMany();
  await prisma.ownershipVerification.deleteMany();
  await prisma.connectorCredential.deleteMany();
  await prisma.websiteAccess.deleteMany();
  await prisma.loginEvent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.website.deleteMany();
  await prisma.client.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Tythas',
    },
  });
  console.log(`✓ Created Organization: ${org.name} (${org.id})`);

  // 2. Create Owner User with initial password and demo MFA enabled
  const passwordHash = await hashPassword(ownerPassword);
  const demoSecret = 'JBSWY3DPEHPK3PXP';
  const encryptedMfaSecret = encrypt(demoSecret);
  const demoBackupCodes = JSON.stringify(['ABCD-1234', 'EFGH-5678', 'JKLM-9012'].map(hashToken));

  const owner = await prisma.user.create({
    data: {
      email: ownerEmail.toLowerCase().trim(),
      passwordHash,
      mfaSecret: encryptedMfaSecret,
      mfaEnabled: true,
      mfaBackupCodes: demoBackupCodes,
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: owner.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });
  console.log(`✓ Created Owner user: ${owner.email} (${owner.id})`);

  // 3. Create Demo Clients and Websites
  const clientsData = [
    {
      name: 'Amary Beaute',
      primaryContactName: 'Amelie Laurent',
      contactEmail: 'contact@amarybeaute.com',
      status: 'ACTIVE',
      website: {
        name: 'Amary Beaute Global',
        domain: 'amarybeaute.com',
        connectorType: 'WORDPRESS',
        connectionState: 'CONNECTED',
        ownershipVerifiedAt: new Date(),
        pagesFound: 127,
        indexableCount: 119,
        detectedCms: 'WordPress',
        detectedBuilder: 'Elementor',
        sslValid: true,
        sitemapFound: true,
        robotsFound: true,
      },
    },
    {
      name: 'Finansh',
      primaryContactName: 'Vikram Mehta',
      contactEmail: 'ops@finansh.io',
      status: 'ACTIVE',
      website: {
        name: 'Finansh Portal',
        domain: 'finansh.io',
        connectorType: 'CUSTOM',
        connectionState: 'CONNECTED',
        ownershipVerifiedAt: new Date(),
        pagesFound: 64,
        indexableCount: 62,
        detectedCms: 'Next.js / Custom',
        detectedBuilder: null,
        sslValid: true,
        sitemapFound: true,
        robotsFound: true,
      },
    },
    {
      name: 'Therma by Eureka',
      primaryContactName: 'Rajeev Nair',
      contactEmail: 'contact@therma.eureka.in',
      status: 'ACTIVE',
      website: {
        name: 'Therma India',
        domain: 'therma.eureka.in',
        connectorType: 'UNCONNECTED',
        connectionState: 'AUDIT_ONLY', // Demonstrates verified website with no connector credentials
        ownershipVerifiedAt: new Date(),
        pagesFound: 42,
        indexableCount: 40,
        detectedCms: 'WordPress',
        detectedBuilder: 'Gutenberg',
        sslValid: true,
        sitemapFound: true,
        robotsFound: true,
      },
    },
    {
      name: 'Soché Studio',
      primaryContactName: 'Sophie Chen',
      contactEmail: 'design@soche.design',
      status: 'ACTIVE',
      website: {
        name: 'Soché Design',
        domain: 'soche.design',
        connectorType: 'UNCONNECTED',
        connectionState: 'DISCONNECTED',
        ownershipVerifiedAt: null, // Unverified - demonstrates hidden from global switcher
        pagesFound: 0,
        indexableCount: 0,
        detectedCms: null,
        detectedBuilder: null,
        sslValid: null,
        sitemapFound: null,
        robotsFound: null,
      },
    },
  ];

  for (const item of clientsData) {
    const client = await prisma.client.create({
      data: {
        organizationId: org.id,
        name: item.name,
        primaryContactName: item.primaryContactName,
        contactEmail: item.contactEmail,
        status: item.status,
      },
    });

    const website = await prisma.website.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        name: item.website.name,
        domain: item.website.domain,
        connectorType: item.website.connectorType,
        connectionState: item.website.connectionState,
        ownershipVerifiedAt: item.website.ownershipVerifiedAt,
      },
    });

    // NOTE: The seeded WebsiteAnalysis and AnalysisIssue rows below are local DEV FIXTURES
    // to provide rich test data in local dev. Real production analyses are created by the crawler.
    if (item.website.ownershipVerifiedAt) {
      const completedAt = new Date(Date.now() - 12 * 60 * 1000); // 12 minutes ago
      const startedAt = new Date(completedAt.getTime() - 45 * 1000);

      const analysis = await prisma.websiteAnalysis.create({
        data: {
          websiteId: website.id,
          status: 'COMPLETE',
          startedAt,
          completedAt,
          pagesFound: item.website.pagesFound,
          indexableCount: item.website.indexableCount,
          detectedCms: item.website.detectedCms,
          detectedBuilder: item.website.detectedBuilder,
          sslValid: item.website.sslValid,
          sitemapFound: item.website.sitemapFound,
          robotsFound: item.website.robotsFound,
        },
      });

      await prisma.website.update({
        where: { id: website.id },
        data: { latestAnalysisId: analysis.id },
      });

      // Seed issues for Amary Beaute (mirroring design reference 23 issues)
      const issuesFixture = [
        // Technical
        { category: 'TECHNICAL', severity: 'HEALTHY', checkKey: 'ssl_certificate', title: 'SSL Certificate', detail: 'Valid SSL certificate (expires in 184 days)', affectedCount: 0 },
        { category: 'TECHNICAL', severity: 'HEALTHY', checkKey: 'sitemap_present', title: 'XML Sitemap', detail: 'Sitemap found at /sitemap.xml with 127 URLs', affectedCount: 0 },
        { category: 'TECHNICAL', severity: 'HEALTHY', checkKey: 'robots_txt_present', title: 'Robots.txt', detail: 'Valid robots.txt present with crawl directives', affectedCount: 0 },
        { category: 'TECHNICAL', severity: 'ATTENTION', checkKey: 'redirect_chains', title: 'Redirect Chains', detail: '3 pages have redirect chains longer than 1 hop', affectedCount: 3 },
        { category: 'TECHNICAL', severity: 'CRITICAL', checkKey: 'broken_internal_links', title: 'Broken Internal Links', detail: '2 broken internal links found (HTTP 404)', affectedCount: 2 },
        { category: 'TECHNICAL', severity: 'HEALTHY', checkKey: 'canonical_present', title: 'Canonical Tags', detail: '127/127 pages have canonical link tags', affectedCount: 0 },
        { category: 'TECHNICAL', severity: 'HEALTHY', checkKey: 'indexability', title: 'Indexability', detail: '119 indexable pages, 8 excluded by noindex rule', affectedCount: 0 },

        // Performance
        { category: 'PERFORMANCE', severity: 'HEALTHY', checkKey: 'core_web_vitals', title: 'Core Web Vitals', detail: '75th percentile LCP is 1.8s, CLS 0.04 (Passing)', affectedCount: 0 },
        { category: 'PERFORMANCE', severity: 'ATTENTION', checkKey: 'page_speed_signals', title: 'Page Speed Signals', detail: '4 pages have server response time > 1.2s', affectedCount: 4 },
        { category: 'PERFORMANCE', severity: 'ATTENTION', checkKey: 'large_images', title: 'Image Assets', detail: '14 images over 500KB without modern WebP format', affectedCount: 14 },

        // Content
        { category: 'CONTENT', severity: 'HEALTHY', checkKey: 'missing_meta_title', title: 'Meta Titles', detail: 'All 127 pages have title tags defined', affectedCount: 0 },
        { category: 'CONTENT', severity: 'ATTENTION', checkKey: 'missing_meta_description', title: 'Meta Descriptions', detail: '5 pages missing a meta description', affectedCount: 5 },
        { category: 'CONTENT', severity: 'ATTENTION', checkKey: 'duplicate_titles', title: 'Duplicate Titles', detail: '4 pages share duplicate title tags', affectedCount: 4 },
        { category: 'CONTENT', severity: 'HEALTHY', checkKey: 'duplicate_descriptions', title: 'Duplicate Descriptions', detail: 'No duplicate meta descriptions found', affectedCount: 0 },
        { category: 'CONTENT', severity: 'HEALTHY', checkKey: 'missing_h1', title: 'H1 Headings', detail: 'All pages have exactly one primary H1 heading', affectedCount: 0 },
        { category: 'CONTENT', severity: 'ATTENTION', checkKey: 'missing_alt_text', title: 'Image Alt Text', detail: '8 images missing descriptive alt text', affectedCount: 8 },
        { category: 'CONTENT', severity: 'NOT_CONFIGURED', checkKey: 'thin_content', title: 'Thin Content Threshold', detail: 'Judgment-heavy check · skipped by default', affectedCount: 0 },
      ];

      await prisma.analysisIssue.createMany({
        data: issuesFixture.map((iss) => ({
          analysisId: analysis.id,
          ...iss,
        })),
      });

      // ============ PHASE 4: Seed CMS Pages, BlogPosts, Schemas, Redirects, TechnicalFiles ============
      if (item.name === 'Amary Beaute') {
        // 1. Pages
        const homePage = await prisma.page.create({
          data: {
            websiteId: website.id,
            slug: 'home',
            title: 'Amary Beaute — Clean Clinical Skincare',
            status: 'PUBLISHED',
            seoTitle: 'Amary Beaute — Clean Clinical Skincare for Radiant Skin',
            seoDescription: 'Discover science-backed, botanical facial serums and restorative moisturizers engineered for delicate and sensitive skin types.',
            h1: 'Science-Backed Botanical Skincare',
            canonicalUrl: 'https://amarybeaute.com/',
            robotsDirective: 'INDEX_FOLLOW',
            focusKeyword: 'botanical skincare',
            secondaryKeywords: JSON.stringify(['facial serum', 'clinical skincare', 'clean beauty']),
            ogTitle: 'Amary Beaute — Botanical Skincare',
            ogDescription: 'Science-backed facial serums and moisturizers.'
          }
        });

        const shopPage = await prisma.page.create({
          data: {
            websiteId: website.id,
            slug: 'shop',
            title: 'Shop All Formulas',
            status: 'PUBLISHED',
            seoTitle: 'Shop Skincare Serums & Creams | Amary Beaute',
            seoDescription: 'Explore our complete collection of dermatologically tested serums, cleansers, and hydrating night creams.',
            h1: 'Shop Complete Collection',
            canonicalUrl: 'https://amarybeaute.com/shop',
            robotsDirective: 'INDEX_FOLLOW',
            focusKeyword: 'skincare shop',
            secondaryKeywords: JSON.stringify(['buy serum online', 'natural moisturizer'])
          }
        });

        const serumPage = await prisma.page.create({
          data: {
            websiteId: website.id,
            slug: 'products/hydrating-serum',
            title: 'Hydrating Botanical Serum',
            status: 'PUBLISHED',
            seoTitle: 'Hydrating Botanical Serum (50ml) | Amary Beaute',
            seoDescription: 'Intense hyaluronic acid serum with rosehip oil and green tea polyphenols. Dermatologist approved.',
            h1: 'Hydrating Botanical Serum',
            canonicalUrl: 'https://amarybeaute.com/products/hydrating-serum',
            robotsDirective: 'INDEX_FOLLOW',
            focusKeyword: 'hydrating serum',
            secondaryKeywords: JSON.stringify(['hyaluronic acid', 'rosehip serum'])
          }
        });

        // Page with missing meta description to test SEO checklist
        await prisma.page.create({
          data: {
            websiteId: website.id,
            slug: 'about-us',
            title: 'Our Story & Heritage',
            status: 'PUBLISHED',
            seoTitle: 'Our Story & Brand Philosophy | Amary Beaute',
            seoDescription: null, // Intentionally missing description
            h1: 'Clean Skincare Formulated in France',
            canonicalUrl: 'https://amarybeaute.com/about-us',
            robotsDirective: 'INDEX_FOLLOW'
          }
        });

        // 2. Author & Blog Post with structured FAQ block
        const author = await prisma.author.create({
          data: {
            websiteId: website.id,
            name: 'Dr. Sophie Vane',
            roleLabel: 'Chief Dermatologist & Formulator',
            bio: 'Board-certified dermatologist with 15+ years in botanical cosmetic chemistry.'
          }
        });

        const faqTiptapContent = JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Understanding how active botanicals interact with your skin barrier is essential for lasting hydration.' }]
            },
            {
              type: 'faq',
              attrs: {
                items: [
                  {
                    question: 'Can I use Hyaluronic Acid with Vitamin C?',
                    answer: 'Yes! Applying hyaluronic acid before Vitamin C maximizes moisture retention while stabilizing antioxidant delivery.'
                  },
                  {
                    question: 'How often should I apply the botanical serum?',
                    answer: 'We recommend applying 3-4 drops morning and night directly onto damp, cleansed skin.'
                  },
                  {
                    question: 'Is this formula suitable for acne-prone skin?',
                    answer: 'All Amary Beaute formulas are strictly non-comedogenic and free from pore-clogging mineral oils.'
                  }
                ]
              }
            }
          ]
        });

        const post = await prisma.blogPost.create({
          data: {
            websiteId: website.id,
            authorId: author.id,
            slug: 'ultimate-hyaluronic-acid-guide',
            title: 'The Ultimate Guide to Hyaluronic Acid in Botanical Skincare',
            content: faqTiptapContent,
            status: 'PUBLISHED',
            seoTitle: 'The Ultimate Guide to Hyaluronic Acid | Amary Beaute',
            seoDescription: 'Learn why multi-molecular hyaluronic acid combined with botanical actives delivers 48-hour deep cellular hydration.',
            h1: 'The Ultimate Guide to Hyaluronic Acid in Botanical Skincare',
            canonicalUrl: 'https://amarybeaute.com/blog/ultimate-hyaluronic-acid-guide',
            robotsDirective: 'INDEX_FOLLOW',
            focusKeyword: 'hyaluronic acid guide',
            secondaryKeywords: JSON.stringify(['skincare routine', 'skin hydration'])
          }
        });

        // Seed Auto-FAQ Schema on post
        const faqsJsonLd = {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'Can I use Hyaluronic Acid with Vitamin C?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes! Applying hyaluronic acid before Vitamin C maximizes moisture retention while stabilizing antioxidant delivery.'
              }
            },
            {
              '@type': 'Question',
              name: 'How often should I apply the botanical serum?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'We recommend applying 3-4 drops morning and night directly onto damp, cleansed skin.'
              }
            },
            {
              '@type': 'Question',
              name: 'Is this formula suitable for acne-prone skin?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'All Amary Beaute formulas are strictly non-comedogenic and free from pore-clogging mineral oils.'
              }
            }
          ]
        };

        await prisma.postSchema.create({
          data: {
            postId: post.id,
            type: 'FAQ_PAGE',
            data: JSON.stringify({
              faqs: [
                { question: 'Can I use Hyaluronic Acid with Vitamin C?', answer: 'Yes! Applying hyaluronic acid before Vitamin C maximizes moisture retention.' },
                { question: 'How often should I apply the botanical serum?', answer: 'We recommend applying 3-4 drops morning and night.' },
                { question: 'Is this formula suitable for acne-prone skin?', answer: 'All Amary Beaute formulas are non-comedogenic.' }
              ]
            }),
            jsonLd: JSON.stringify(faqsJsonLd),
            source: 'auto_faq'
          }
        });

        // 3. Seed Redirects (including deliberate chain A->B->C and loop X->Y->X)
        const redirectsFixture = [
          { fromPath: '/old-store', toPath: '/shop', type: 'R301' }, // Chain Hop 1
          { fromPath: '/shop', toPath: '/products/hydrating-serum', type: 'R301' }, // Chain Hop 2 (A -> B -> C)
          { fromPath: '/cycle-a', toPath: '/cycle-b', type: 'R301' }, // Loop Hop 1
          { fromPath: '/cycle-b', toPath: '/cycle-a', type: 'R301' }, // Loop Hop 2 (Loop!)
          { fromPath: '/instagram-bio', toPath: '/products/hydrating-serum', type: 'R302' },
          { fromPath: '/summer-promo', toPath: '/shop', type: 'R307' },
          { fromPath: '/contact-us', toPath: '/about-us', type: 'R301' },
          { fromPath: '/heritage', toPath: '/about-us', type: 'R301' }
        ];

        for (const r of redirectsFixture) {
          await prisma.redirect.create({
            data: {
              websiteId: website.id,
              fromPath: r.fromPath,
              toPath: r.toPath,
              type: r.type
            }
          });
        }

        // 4. Seed Technical Files (Robots.txt & llms.txt)
        await prisma.technicalFile.create({
          data: {
            websiteId: website.id,
            type: 'ROBOTS_TXT',
            content: `User-agent: *\nAllow: /\nDisallow: /wp-admin/\nDisallow: /api/\n\nSitemap: https://amarybeaute.com/sitemap.xml`,
            mode: 'safe',
            updatedBy: owner.email
          }
        });

        await prisma.technicalFile.create({
          data: {
            websiteId: website.id,
            type: 'LLMS_TXT',
            content: `# Amary Beaute — AI Crawler Documentation\n\n- Brand: Amary Beaute\n- Specialty: Clean clinical botanical skincare formulations.\n- Documentation: For ingredient safety and full formulas, refer to /blog/ultimate-hyaluronic-acid-guide.\n- Index: https://amarybeaute.com/sitemap.xml`,
            mode: 'safe',
            updatedBy: owner.email
          }
        });

        // 5. Seed initial SitemapRun
        await prisma.sitemapRun.create({
          data: {
            websiteId: website.id,
            urlCount: 127
          }
        });

        // ============ PHASE 5: Seed Forms & Leads ============
        // 1. Form: Contact Us (DEPLOYED)
        const contactForm = await prisma.form.create({
          data: {
            websiteId: website.id,
            name: 'Contact Us',
            status: 'DEPLOYED',
            publicKey: 'form_pub_contact_amary123',
            successMessage: 'Thank you! We received your inquiry and will be in touch shortly.',
            fields: {
              create: [
                { label: 'Full Name', type: 'TEXT', placeholder: 'Jane Doe', required: true, order: 0 },
                { label: 'Email Address', type: 'EMAIL', placeholder: 'jane@example.com', required: true, order: 1 },
                { label: 'Phone Number', type: 'PHONE', placeholder: '+1 (555) 000-0000', required: false, order: 2 },
                { label: 'How can we help?', type: 'TEXT', placeholder: 'Write your message...', required: true, order: 3 },
              ],
            },
            actions: {
              create: [
                { type: 'CREATE_LEAD', enabled: true, config: '{}', order: 0 },
                { type: 'SHOW_SUCCESS_MESSAGE', enabled: true, config: JSON.stringify({ message: 'Thank you! We received your inquiry and will be in touch shortly.' }), order: 1 },
                { type: 'SEND_EMAIL', enabled: true, config: JSON.stringify({ to: 'team@amarybeaute.com', subject: 'New Contact Form Submission' }), order: 2 },
              ],
            },
          },
        });

        // 2. Form: Wholesale & Partnership Inquiry (DEPLOYED)
        const wholesaleForm = await prisma.form.create({
          data: {
            websiteId: website.id,
            name: 'Wholesale & Partnership Inquiry',
            status: 'DEPLOYED',
            publicKey: 'form_pub_wholesale_amary456',
            successMessage: 'Thank you for your partnership request! Our B2B team will respond within 24 hours.',
            fields: {
              create: [
                { label: 'Contact Name', type: 'TEXT', placeholder: 'Alex Smith', required: true, order: 0 },
                { label: 'Business Email', type: 'EMAIL', placeholder: 'alex@company.com', required: true, order: 1 },
                { label: 'Company / Spa Name', type: 'TEXT', placeholder: 'Apothecary & Co', required: true, order: 2 },
                {
                  label: 'Business Type',
                  type: 'DROPDOWN',
                  options: JSON.stringify(['Luxury Day Spa', 'Boutique Retailer', 'Dermatology Clinic', 'International Distributor']),
                  required: true,
                  order: 3,
                },
                { label: 'Estimated Monthly Units', type: 'NUMBER', placeholder: '250', required: false, order: 4 },
                { label: 'Additional Partnership Notes', type: 'TEXT', placeholder: 'Tell us about your distribution reach...', required: false, order: 5 },
              ],
            },
            actions: {
              create: [
                { type: 'CREATE_LEAD', enabled: true, config: '{}', order: 0 },
                { type: 'SHOW_SUCCESS_MESSAGE', enabled: true, config: JSON.stringify({ message: 'Thank you for your partnership request! Our B2B team will respond within 24 hours.' }), order: 1 },
                { type: 'TRIGGER_CONVERSION', enabled: true, config: JSON.stringify({ eventName: 'generate_wholesale_lead' }), order: 2 },
              ],
            },
          },
        });

        // 3. Form: Customer Feedback (DRAFT)
        await prisma.form.create({
          data: {
            websiteId: website.id,
            name: 'Customer Product Feedback',
            status: 'DRAFT',
            publicKey: 'form_pub_feedback_amary789',
            fields: {
              create: [
                { label: 'Overall Satisfaction (1-10)', type: 'NUMBER', placeholder: '10', required: true, order: 0 },
                { label: 'Product Used', type: 'TEXT', placeholder: 'Hydrating Botanical Serum', required: true, order: 1 },
                { label: 'Your Detailed Feedback', type: 'TEXT', placeholder: 'How did your skin respond?', required: true, order: 2 },
              ],
            },
            actions: {
              create: [
                { type: 'CREATE_LEAD', enabled: true, config: '{}', order: 0 },
                { type: 'SHOW_SUCCESS_MESSAGE', enabled: true, config: JSON.stringify({ message: 'Thank you for sharing your experience with us!' }), order: 1 },
              ],
            },
          },
        });

        // 4. Seed Submissions and Leads with realistic pipelines
        // Lead 1: Elena Rostova (WON)
        const sub1 = await prisma.formSubmission.create({
          data: {
            formId: wholesaleForm.id,
            rawPayload: JSON.stringify({
              contact_name: 'Elena Rostova',
              business_email: 'elena@nordicspa.se',
              company_name: 'Nordic Spa & Wellness',
              business_type: 'Luxury Day Spa',
              monthly_volume: 500,
              notes: 'Interested in placing an opening order of 500 units for our flagship boutique spas in Stockholm.',
              utm_source: 'google',
              utm_medium: 'cpc',
              utm_campaign: 'summer_skincare_promo',
            }),
          },
        });

        const lead1 = await prisma.lead.create({
          data: {
            websiteId: website.id,
            formSubmissionId: sub1.id,
            name: 'Elena Rostova',
            email: 'elena@nordicspa.se',
            phone: '+46 8 123 4567',
            message: 'Interested in placing an opening order of 500 units for our flagship boutique spas in Stockholm.',
            status: 'WON',
            assignedUserId: owner.id,
            utmSource: 'google',
            utmMedium: 'cpc',
            utmCampaign: 'summer_skincare_promo',
            landingPage: '/products/hydrating-serum',
            referrer: 'https://www.google.com/search?q=luxury+botanical+facial+serum',
            device: 'Desktop (macOS / Chrome)',
            createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
          },
        });

        await prisma.leadActivity.createMany({
          data: [
            { leadId: lead1.id, type: 'CREATED', detail: 'Lead created from Wholesale & Partnership Inquiry form', createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
            { leadId: lead1.id, type: 'FORM_SUBMITTED', detail: 'Form submitted via Wholesale & Partnership Inquiry', createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
            { leadId: lead1.id, type: 'ASSIGNED', detail: `Lead assigned to ${owner.email}`, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
            { leadId: lead1.id, type: 'STATUS_CHANGED', detail: 'Status changed to CONTACTED — Introductory consultation call scheduled for Friday', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
            { leadId: lead1.id, type: 'STATUS_CHANGED', detail: 'Status changed to QUALIFIED — Client verified 3 spa locations with high boutique retail turnover', createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
            { leadId: lead1.id, type: 'STATUS_CHANGED', detail: 'Status changed to PROPOSAL — Dispatched Tier-2 Wholesale Agreement and customized merchandising kit proposal', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
            { leadId: lead1.id, type: 'NOTE_ADDED', detail: 'Contract signed! Initial PO received for 500 units of Hydrating Botanical Serum.', createdBy: owner.id, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
            { leadId: lead1.id, type: 'STATUS_CHANGED', detail: 'Status changed to WON — Purchase order confirmed and invoice issued', createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) },
          ],
        });

        // Lead 2: Marcus Thorne (PROPOSAL)
        const sub2 = await prisma.formSubmission.create({
          data: {
            formId: wholesaleForm.id,
            rawPayload: JSON.stringify({
              contact_name: 'Marcus Thorne',
              business_email: 'marcus@thorneapothecary.com',
              company_name: 'Thorne Apothecary SF',
              business_type: 'Boutique Retailer',
              monthly_volume: 200,
              notes: 'Read Dr. Sophie Vane\'s clinical guide on botanical hyaluronic acid. We want to feature Amary Beaute in our San Francisco locations.',
              utm_source: 'instagram',
              utm_medium: 'paid_social',
              utm_campaign: 'influencer_collab_dr_vane',
            }),
          },
        });

        const lead2 = await prisma.lead.create({
          data: {
            websiteId: website.id,
            formSubmissionId: sub2.id,
            name: 'Marcus Thorne',
            email: 'marcus@thorneapothecary.com',
            phone: '+1 (415) 890-1234',
            message: 'Read Dr. Sophie Vane\'s clinical guide on botanical hyaluronic acid. We want to feature Amary Beaute in our San Francisco locations.',
            status: 'PROPOSAL',
            assignedUserId: owner.id,
            utmSource: 'instagram',
            utmMedium: 'paid_social',
            utmCampaign: 'influencer_collab_dr_vane',
            landingPage: '/blog/ultimate-hyaluronic-acid-guide',
            referrer: 'https://l.instagram.com/',
            device: 'Mobile (iOS / Safari)',
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
        });

        await prisma.leadActivity.createMany({
          data: [
            { leadId: lead2.id, type: 'CREATED', detail: 'Lead created from Wholesale & Partnership Inquiry form', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
            { leadId: lead2.id, type: 'STATUS_CHANGED', detail: 'Status changed to CONTACTED — Sent wholesale welcome packet and sample request form', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
            { leadId: lead2.id, type: 'NOTE_ADDED', detail: 'Tester box with 10 serum vials shipped to SF store for staff evaluation.', createdBy: owner.id, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
            { leadId: lead2.id, type: 'STATUS_CHANGED', detail: 'Status changed to PROPOSAL — Staff loved the botanical fragrance and texture. Sent standard retail terms.', createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000) },
          ],
        });

        // Lead 3: Chloe Dupont (QUALIFIED)
        const sub3 = await prisma.formSubmission.create({
          data: {
            formId: contactForm.id,
            rawPayload: JSON.stringify({
              name: 'Chloe Dupont',
              email: 'chloe@dupont-esthetics.fr',
              phone: '+33 1 42 68 55 00',
              message: 'Looking for distributor pricing for French retail salons in Paris and Lyon.',
              utm_source: 'meta',
              utm_medium: 'cpc',
              utm_campaign: 'retargeting_cart_abandoners',
            }),
          },
        });

        const lead3 = await prisma.lead.create({
          data: {
            websiteId: website.id,
            formSubmissionId: sub3.id,
            name: 'Chloe Dupont',
            email: 'chloe@dupont-esthetics.fr',
            phone: '+33 1 42 68 55 00',
            message: 'Looking for distributor pricing for French retail salons in Paris and Lyon.',
            status: 'QUALIFIED',
            utmSource: 'meta',
            utmMedium: 'cpc',
            utmCampaign: 'retargeting_cart_abandoners',
            landingPage: '/shop',
            referrer: 'https://facebook.com',
            device: 'Desktop (Windows / Edge)',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
        });

        await prisma.leadActivity.createMany({
          data: [
            { leadId: lead3.id, type: 'CREATED', detail: 'Lead created from Contact Us form', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
            { leadId: lead3.id, type: 'STATUS_CHANGED', detail: 'Status changed to CONTACTED', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
            { leadId: lead3.id, type: 'STATUS_CHANGED', detail: 'Status changed to QUALIFIED — Confirmed valid French VAT registration and 4 salon venues', createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000) },
          ],
        });

        // Lead 4: Sarah Jenkins (CONTACTED)
        const sub4 = await prisma.formSubmission.create({
          data: {
            formId: contactForm.id,
            rawPayload: JSON.stringify({
              name: 'Sarah Jenkins',
              email: 'sarah@glowdayspa.com',
              phone: '+1 (212) 555-0199',
              message: 'Requesting clinical safety data sheets and allergy test certifications for sensitive skin facials.',
              utm_source: 'google',
              utm_medium: 'organic',
            }),
          },
        });

        const lead4 = await prisma.lead.create({
          data: {
            websiteId: website.id,
            formSubmissionId: sub4.id,
            name: 'Sarah Jenkins',
            email: 'sarah@glowdayspa.com',
            phone: '+1 (212) 555-0199',
            message: 'Requesting clinical safety data sheets and allergy test certifications for sensitive skin facials.',
            status: 'CONTACTED',
            utmSource: 'google',
            utmMedium: 'organic',
            landingPage: '/',
            referrer: 'https://www.google.com/',
            device: 'Desktop (macOS / Safari)',
            createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
          },
        });

        await prisma.leadActivity.createMany({
          data: [
            { leadId: lead4.id, type: 'CREATED', detail: 'Lead created from Contact Us form', createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000) },
            { leadId: lead4.id, type: 'STATUS_CHANGED', detail: 'Status changed to CONTACTED — Emailed dermatologist safety dossier PDF', createdAt: new Date(Date.now() - 14 * 60 * 60 * 1000) },
          ],
        });

        // Lead 5: David Kim (NEW)
        const sub5 = await prisma.formSubmission.create({
          data: {
            formId: wholesaleForm.id,
            rawPayload: JSON.stringify({
              contact_name: 'David Kim',
              business_email: 'david@kbeautycurations.com',
              company_name: 'K-Beauty Curations Inc',
              business_type: 'International Distributor',
              monthly_volume: 1200,
              notes: 'Inquiring about exclusive distribution rights for West Coast organic skincare stores.',
              utm_source: 'linkedin',
              utm_medium: 'social',
              utm_campaign: 'b2b_partnerships',
            }),
          },
        });

        const lead5 = await prisma.lead.create({
          data: {
            websiteId: website.id,
            formSubmissionId: sub5.id,
            name: 'David Kim',
            email: 'david@kbeautycurations.com',
            phone: '+1 (310) 555-8842',
            message: 'Inquiring about exclusive distribution rights for West Coast organic skincare stores.',
            status: 'NEW',
            utmSource: 'linkedin',
            utmMedium: 'social',
            utmCampaign: 'b2b_partnerships',
            landingPage: '/wholesale-inquiry',
            referrer: 'https://www.linkedin.com/',
            device: 'Desktop (macOS / Chrome)',
            createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          },
        });

        await prisma.leadActivity.createMany({
          data: [
            { leadId: lead5.id, type: 'CREATED', detail: 'Lead created from Wholesale & Partnership Inquiry form', createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
            { leadId: lead5.id, type: 'FORM_SUBMITTED', detail: 'Form submitted with high estimated monthly volume (1200 units)', createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
          ],
        });

        // Lead 6: Hannah Schmidt (NEW)
        const sub6 = await prisma.formSubmission.create({
          data: {
            formId: contactForm.id,
            rawPayload: JSON.stringify({
              name: 'Hannah Schmidt',
              email: 'hannah.schmidt@purebotanicals.de',
              phone: '+49 30 901820',
              message: 'Please send ingredient MSDS sheets, lab certificates, and German export packaging options.',
              utm_source: 'google',
              utm_medium: 'cpc',
              utm_campaign: 'clean_beauty_search',
            }),
          },
        });

        const lead6 = await prisma.lead.create({
          data: {
            websiteId: website.id,
            formSubmissionId: sub6.id,
            name: 'Hannah Schmidt',
            email: 'hannah.schmidt@purebotanicals.de',
            phone: '+49 30 901820',
            message: 'Please send ingredient MSDS sheets, lab certificates, and German export packaging options.',
            status: 'NEW',
            utmSource: 'google',
            utmMedium: 'cpc',
            utmCampaign: 'clean_beauty_search',
            landingPage: '/products/hydrating-serum',
            referrer: 'https://www.google.de/',
            device: 'Desktop (Linux / Chrome)',
            createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 mins ago
          },
        });

        await prisma.leadActivity.createMany({
          data: [
            { leadId: lead6.id, type: 'CREATED', detail: 'Lead created from Contact Us form', createdAt: new Date(Date.now() - 45 * 60 * 1000) },
          ],
        });

        // Lead 7: Alexander Wright (LOST)
        const sub7 = await prisma.formSubmission.create({
          data: {
            formId: contactForm.id,
            rawPayload: JSON.stringify({
              name: 'Alexander Wright',
              email: 'alex@wrightskincare.co.uk',
              phone: '+44 20 7946 0912',
              message: 'Do you offer OEM private white-labeling for custom formulas?',
              utm_source: 'newsletter',
              utm_medium: 'email',
              utm_campaign: 'september_roundup',
            }),
          },
        });

        const lead7 = await prisma.lead.create({
          data: {
            websiteId: website.id,
            formSubmissionId: sub7.id,
            name: 'Alexander Wright',
            email: 'alex@wrightskincare.co.uk',
            phone: '+44 20 7946 0912',
            message: 'Do you offer OEM private white-labeling for custom formulas?',
            status: 'LOST',
            utmSource: 'newsletter',
            utmMedium: 'email',
            utmCampaign: 'september_roundup',
            landingPage: '/products/hydrating-serum',
            device: 'Desktop (macOS / Safari)',
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          },
        });

        await prisma.leadActivity.createMany({
          data: [
            { leadId: lead7.id, type: 'CREATED', detail: 'Lead created from Contact Us form', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
            { leadId: lead7.id, type: 'STATUS_CHANGED', detail: 'Status changed to CONTACTED', createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000) },
            { leadId: lead7.id, type: 'NOTE_ADDED', detail: 'Customer exclusively requested OEM private-label contract manufacturing, which is outside our brand business model.', createdBy: owner.id, createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
            { leadId: lead7.id, type: 'STATUS_CHANGED', detail: 'Status changed to LOST — Unqualified service request', createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
          ],
        });

        // Lead 8: Dr. Olivia Brooks (QUALIFIED - Manual source)
        const lead8 = await prisma.lead.create({
          data: {
            websiteId: website.id,
            name: 'Dr. Olivia Brooks',
            email: 'dr.brooks@brooksdermatology.com',
            phone: '+1 (312) 555-4321',
            message: 'Met at Annual Dermatology Congress 2026. Requested sample packs for patient clinical evaluations.',
            status: 'QUALIFIED',
            assignedUserId: owner.id,
            device: 'Conference / In-Person',
            createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          },
        });

        await prisma.leadActivity.createMany({
          data: [
            { leadId: lead8.id, type: 'CREATED', detail: 'Lead created manually by owner — Added after Dermatology Congress meeting', createdBy: owner.id, createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
            { leadId: lead8.id, type: 'STATUS_CHANGED', detail: 'Status changed to QUALIFIED — Dr. Brooks requested 25 sample packs for patient trial group', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          ],
        });

        // ============ PHASE 6: Seed Integrations, Conversion Events, Reviews, Custom Scripts ============
        // NOTE: The seeded tokens and integration connections are local DEV/TEST FIXTURES.
        const mockGa4Cred = encryptIntegrationToken('mock_ga4_oauth_token_fixture_dev');
        const mockMetaCred = encryptIntegrationToken('mock_meta_access_token_fixture_dev');
        const mockGbpCred = encryptIntegrationToken('mock_gbp_access_token_fixture_dev');

        // 1. Integration Connections (spanning CONNECTED, NOT_CONNECTED, ERROR)
        const ga4Conn = await prisma.integrationConnection.create({
          data: {
            websiteId: website.id,
            provider: 'GA4',
            status: 'CONNECTED',
            externalAccountId: 'properties/318942105',
            externalAccountName: 'amarybeaute.com — GA4 Property (G-7X9B82)',
            connectedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            lastSyncedAt: new Date(Date.now() - 15 * 60 * 1000),
          },
        });
        await prisma.integrationCredential.create({
          data: {
            connectionId: ga4Conn.id,
            accessTokenEncrypted: mockGa4Cred,
            expiresAt: new Date(Date.now() + 3600 * 1000),
            scopes: JSON.stringify(['https://www.googleapis.com/auth/analytics.readonly']),
          },
        });

        await prisma.integrationConnection.create({
          data: {
            websiteId: website.id,
            provider: 'GSC',
            status: 'NOT_CONNECTED',
          },
        });

        await prisma.integrationConnection.create({
          data: {
            websiteId: website.id,
            provider: 'GTM',
            status: 'ERROR',
            externalAccountId: 'GTM-AB792X',
            externalAccountName: 'amarybeaute.com — Web Container',
            lastError: 'GTM Container permissions revoked or container deleted on Google side. Please reconnect.',
            connectedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          },
        });

        await prisma.integrationConnection.create({
          data: {
            websiteId: website.id,
            provider: 'GOOGLE_ADS',
            status: 'NOT_CONNECTED',
          },
        });

        const metaConn = await prisma.integrationConnection.create({
          data: {
            websiteId: website.id,
            provider: 'META',
            status: 'CONNECTED',
            externalAccountId: '891274910284',
            externalAccountName: 'Amary Beaute Meta Pixel (Dataset #891274910284)',
            connectedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            lastSyncedAt: new Date(Date.now() - 30 * 60 * 1000),
          },
        });
        await prisma.integrationCredential.create({
          data: {
            connectionId: metaConn.id,
            accessTokenEncrypted: mockMetaCred,
            expiresAt: new Date(Date.now() + 60 * 86400 * 1000),
            scopes: JSON.stringify(['ads_read', 'business_management']),
          },
        });

        await prisma.integrationConnection.create({
          data: {
            websiteId: website.id,
            provider: 'MS_CLARITY',
            status: 'NOT_CONNECTED',
          },
        });

        const gbpConn = await prisma.integrationConnection.create({
          data: {
            websiteId: website.id,
            provider: 'GOOGLE_BUSINESS_PROFILE',
            status: 'CONNECTED',
            externalAccountId: 'locations/984128471029',
            externalAccountName: 'Amary Beaute Salon & Spa (Baner Main Branch)',
            connectedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
            lastSyncedAt: new Date(Date.now() - 60 * 60 * 1000),
          },
        });
        await prisma.integrationCredential.create({
          data: {
            connectionId: gbpConn.id,
            accessTokenEncrypted: mockGbpCred,
            expiresAt: new Date(Date.now() + 3600 * 1000),
            scopes: JSON.stringify(['https://www.googleapis.com/auth/business.manage']),
          },
        });

        // 2. Conversion Events (7 Spec Examples)
        const event1 = await prisma.conversionEvent.create({
          data: {
            websiteId: website.id,
            name: 'Contact form submission',
            classification: 'PRIMARY',
          },
        });
        // Mappings for Contact form submission (GA4 + Meta)
        await prisma.conversionEventMapping.createMany({
          data: [
            {
              conversionEventId: event1.id,
              provider: 'GA4',
              externalEventName: 'generate_lead',
            },
            {
              conversionEventId: event1.id,
              provider: 'META',
              externalEventName: 'Lead',
            },
          ],
        });

        await prisma.conversionEvent.create({
          data: {
            websiteId: website.id,
            name: 'Phone click',
            classification: 'PRIMARY',
          },
        });

        await prisma.conversionEvent.create({
          data: {
            websiteId: website.id,
            name: 'WhatsApp click',
            classification: 'PRIMARY',
          },
        });

        await prisma.conversionEvent.create({
          data: {
            websiteId: website.id,
            name: 'Booking',
            classification: 'PRIMARY',
          },
        });

        await prisma.conversionEvent.create({
          data: {
            websiteId: website.id,
            name: 'Quote request',
            classification: 'PRIMARY',
          },
        });

        await prisma.conversionEvent.create({
          data: {
            websiteId: website.id,
            name: 'Brochure download',
            classification: 'SECONDARY',
          },
        });

        await prisma.conversionEvent.create({
          data: {
            websiteId: website.id,
            name: 'Newsletter signup',
            classification: 'SECONDARY',
          },
        });

        // 3. Google Business Reviews
        await prisma.googleBusinessReview.createMany({
          data: [
            {
              websiteId: website.id,
              externalReviewId: 'gbp_rev_1',
              reviewerName: 'Aarav Mehta',
              rating: 5,
              excerpt: 'Outstanding service and transformative results from their botanical serum lineup. Highly recommended!',
              postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
              replyStatus: 'Replied',
            },
            {
              websiteId: website.id,
              externalReviewId: 'gbp_rev_2',
              reviewerName: 'Priya Sharma',
              rating: 5,
              excerpt: 'The in-person consultation in Baner was extremely thorough. Skin texture improved within two weeks.',
              postedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              replyStatus: 'Not replied',
            },
            {
              websiteId: website.id,
              externalReviewId: 'gbp_rev_3',
              reviewerName: 'Rohan Deshmukh',
              rating: 4,
              excerpt: 'Great range of clean formulations. Shipping was fast and packaging is fully recyclable.',
              postedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
              replyStatus: 'Replied',
            },
            {
              websiteId: website.id,
              externalReviewId: 'gbp_rev_4',
              reviewerName: 'Sneha Kulkarni',
              rating: 5,
              excerpt: 'Loved the personalized regimen recommendation. 5 stars all the way!',
              postedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
              replyStatus: 'Not replied',
            },
          ],
        });

        // 4. Custom Scripts (1 Active, 1 Disabled)
        await prisma.customScript.createMany({
          data: [
            {
              websiteId: website.id,
              name: 'Google Search Console Verification Tag',
              scope: 'SITE',
              placement: 'HEAD',
              code: '<meta name="google-site-verification" content="tythas_gsc_verification_token_demo_98765" />',
              status: 'ACTIVE',
              createdBy: owner.id,
            },
            {
              websiteId: website.id,
              name: 'Legacy Hotjar Analytics Script',
              scope: 'SITE',
              placement: 'FOOTER',
              code: '<script type="text/javascript">\n  (function(h,o,t,j,a,r){\n    h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};\n    h._hjSettings={hjid:1234567,hjsv:6};\n  })(window,document);\n</script>',
              status: 'DISABLED',
              createdBy: owner.id,
            },
          ],
        });
      }

      // ============ PHASE 7 SEED FIXTURES ============
      // 1. Generate 30 days of Monitoring Checks (every 6 hours)
      const nowMs = Date.now();
      const monitoringChecksData = [];
      for (let i = 0; i < 120; i++) {
        const checkTime = new Date(nowMs - i * 6 * 60 * 60 * 1000);
        // Realistic distribution: 98% healthy, occasional blip
        const isUp = i !== 14 && i !== 15;
        monitoringChecksData.push({
          websiteId: website.id,
          type: 'UPTIME',
          status: isUp ? 'HEALTHY' : 'CRITICAL',
          detail: isUp ? `Responding with 200 (~${85 + (i % 20)}ms)` : 'Connection timed out (>6s)',
          checkedAt: checkTime,
        });
      }

      // SSL check
      const isAmary = item.name === 'Amary Beaute';
      monitoringChecksData.push({
        websiteId: website.id,
        type: 'SSL_EXPIRY',
        status: isAmary ? 'HEALTHY' : 'HEALTHY',
        detail: isAmary ? 'Valid TLS 1.3 certificate (expires in 48 days)' : 'Valid TLS 1.3 certificate (expires in 184 days)',
        checkedAt: new Date(nowMs - 2 * 60 * 60 * 1000),
      });

      // Crawl check
      monitoringChecksData.push({
        websiteId: website.id,
        type: 'CRAWL',
        status: isAmary ? 'HEALTHY' : 'HEALTHY',
        detail: isAmary ? '127 URLs checked, 4 issues detected' : '34 URLs checked, 0 issues detected',
        checkedAt: new Date(nowMs - 4 * 60 * 60 * 1000),
      });

      await prisma.monitoringCheck.createMany({
        data: monitoringChecksData,
      });

      // 2. Monitoring Incidents
      if (isAmary) {
        await prisma.monitoringIncident.create({
          data: {
            websiteId: website.id,
            type: 'UPTIME',
            title: 'Website down',
            detail: 'Homepage returned HTTP 500 error during upstream server reload',
            startedAt: new Date(nowMs - 3 * 24 * 60 * 60 * 1000 - 4 * 60 * 1000),
            resolvedAt: new Date(nowMs - 3 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    console.log(`✓ Created Client: ${client.name} with Website: ${website.domain} (${website.connectionState})`);
  }

  // 4. Create Notification Preferences for Owner
  await prisma.notificationPreference.create({
    data: {
      userId: owner.id,
      sslExpiry: true,
      newLead: true,
      seoAudit: true,
      publishingAndForms: true,
    },
  });

  // 5. Create Sample Notifications
  const firstWebsite = await prisma.website.findFirst({ where: { domain: 'amarybeaute.com' } });

  await prisma.notification.createMany({
    data: [
      {
        organizationId: org.id,
        websiteId: firstWebsite?.id,
        type: 'NEW_LEAD',
        severity: 'INFO',
        title: 'New lead received',
        detail: 'New lead received from "Sophie Bernard" via form "Consultation Booking".',
        linkPath: '/leads',
        readAt: null,
        createdAt: new Date(Date.now() - 35 * 60 * 1000),
      },
      {
        organizationId: org.id,
        websiteId: firstWebsite?.id,
        type: 'WEBSITE_DOWN',
        severity: 'SUCCESS',
        title: 'Website back up',
        detail: 'Homepage for amarybeaute.com is responding normally (was down for 4 minutes).',
        linkPath: '/monitoring',
        readAt: null,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: org.id,
        websiteId: firstWebsite?.id,
        type: 'PUBLISHING_COMPLETED',
        severity: 'SUCCESS',
        title: 'Page published',
        detail: 'Page "Botanical Radiance Serum" (/products/botanical-radiance) published successfully.',
        linkPath: '/pages',
        readAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: org.id,
        websiteId: null,
        type: 'USER_INVITATION_STATUS_CHANGED',
        severity: 'INFO',
        title: 'Invitation accepted',
        detail: 'sarah.manager@tythas.example has accepted the invitation and joined as Manager.',
        linkPath: '/settings/organization',
        readAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: org.id,
        websiteId: firstWebsite?.id,
        type: 'SSL_EXPIRY_WARNING',
        severity: 'WARNING',
        title: 'SSL certificate expiry warning',
        detail: 'SSL certificate for amarybeaute.com expires in 48 days. Please renew promptly.',
        linkPath: '/monitoring',
        readAt: null,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('✅ Phase 7 Database Seeding completed successfully!');
  console.log(`Default login: ${ownerEmail} / ${ownerPassword}`);
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

