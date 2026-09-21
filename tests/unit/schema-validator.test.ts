import { describe, it, expect } from 'vitest';
import { generateJsonLd, extractFaqsFromDocument } from '@/lib/schema/generate';
import { validateSchema } from '@/lib/schema/validate';

describe('JSON-LD Schema Generation & Validation', () => {
  it('generates valid FAQPage JSON-LD from structured questions and answers', () => {
    const data = {
      faqs: [
        { question: 'What is Hyaluronic Acid?', answer: 'It is a powerful humectant capable of holding 1000x its weight in water.' },
        { question: 'Is it safe for sensitive skin?', answer: 'Yes, it is non-irritating and hypoallergenic.' }
      ]
    };

    const jsonLd = generateJsonLd('FAQ_PAGE', data);
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('FAQPage');
    expect(jsonLd.mainEntity).toHaveLength(2);
    expect(jsonLd.mainEntity[0]['@type']).toBe('Question');
    expect(jsonLd.mainEntity[0].name).toBe('What is Hyaluronic Acid?');
    expect(jsonLd.mainEntity[0].acceptedAnswer.text).toContain('powerful humectant');

    const validation = validateSchema('FAQ_PAGE', data);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('catches missing questions/answers in FAQ validation', () => {
    const emptyValidation = validateSchema('FAQ_PAGE', { faqs: [] });
    expect(emptyValidation.valid).toBe(false);
    expect(emptyValidation.errors[0]).toContain('at least one question and answer pair');

    const incompleteValidation = validateSchema('FAQ_PAGE', {
      faqs: [{ question: 'Incomplete question?', answer: '' }]
    });
    expect(incompleteValidation.valid).toBe(false);
    expect(incompleteValidation.errors[0]).toContain('missing an answer');
  });

  it('generates Organization and LocalBusiness schemas correctly', () => {
    const orgData = {
      name: 'Amary Beaute',
      url: 'https://amarybeaute.com',
      logo: 'https://amarybeaute.com/logo.png',
      sameAs: 'https://instagram.com/amary, https://twitter.com/amary'
    };

    const orgJsonLd = generateJsonLd('ORGANIZATION', orgData);
    expect(orgJsonLd['@type']).toBe('Organization');
    expect(orgJsonLd.name).toBe('Amary Beaute');
    expect(orgJsonLd.sameAs).toEqual(['https://instagram.com/amary', 'https://twitter.com/amary']);

    const businessData = {
      name: 'Tythas Studio',
      streetAddress: '123 MG Road',
      addressLocality: 'Pune',
      addressRegion: 'Maharashtra',
      postalCode: '411001',
      addressCountry: 'IN'
    };

    const bizJsonLd = generateJsonLd('LOCAL_BUSINESS', businessData);
    expect(bizJsonLd['@type']).toBe('LocalBusiness');
    expect(bizJsonLd.address['@type']).toBe('PostalAddress');
    expect(bizJsonLd.address.addressLocality).toBe('Pune');
  });

  it('validates Product schema fields and pricing', () => {
    const validProduct = {
      name: 'Hydrating Serum',
      price: 1499,
      priceCurrency: 'INR'
    };
    expect(validateSchema('PRODUCT', validProduct).valid).toBe(true);

    const invalidProduct = {
      name: 'Hydrating Serum',
      price: 'invalid_price',
      priceCurrency: 'INR'
    };
    const prodVal = validateSchema('PRODUCT', invalidProduct);
    expect(prodVal.valid).toBe(false);
    expect(prodVal.errors[0]).toContain('positive number');
  });

  it('extracts FAQ nodes from Tiptap document content', () => {
    const tiptapContent = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Introduction to skincare.' }]
        },
        {
          type: 'faq',
          attrs: {
            items: [
              { question: 'When to apply serum?', answer: 'Apply after toner and before moisturizer.' },
              { question: 'Can I use it daily?', answer: 'Yes, both morning and night.' }
            ]
          }
        }
      ]
    });

    const extracted = extractFaqsFromDocument(tiptapContent);
    expect(extracted).toHaveLength(2);
    expect(extracted[0].question).toBe('When to apply serum?');
    expect(extracted[1].answer).toBe('Yes, both morning and night.');
  });
});
