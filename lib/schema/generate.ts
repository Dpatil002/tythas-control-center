import { SchemaType } from './types';

export function generateJsonLd(type: SchemaType, data: Record<string, any>): Record<string, any> {
  const base = {
    '@context': 'https://schema.org'
  };

  switch (type) {
    case 'FAQ_PAGE': {
      const faqs: Array<{ question: string; answer: string }> = Array.isArray(data.faqs) ? data.faqs : [];
      return {
        ...base,
        '@type': 'FAQPage',
        mainEntity: faqs
          .filter((f) => f && f.question?.trim() && f.answer?.trim())
          .map((f) => ({
            '@type': 'Question',
            name: f.question.trim(),
            acceptedAnswer: {
              '@type': 'Answer',
              text: f.answer.trim()
            }
          }))
      };
    }

    case 'ORGANIZATION': {
      const sameAs = parseArrayField(data.sameAs);
      return {
        ...base,
        '@type': 'Organization',
        name: data.name?.trim(),
        url: data.url?.trim(),
        ...(data.logo ? { logo: data.logo.trim() } : {}),
        ...(data.description ? { description: data.description.trim() } : {}),
        ...(sameAs.length > 0 ? { sameAs } : {})
      };
    }

    case 'LOCAL_BUSINESS': {
      return {
        ...base,
        '@type': 'LocalBusiness',
        name: data.name?.trim(),
        ...(data.url ? { url: data.url.trim() } : {}),
        ...(data.telephone ? { telephone: data.telephone.trim() } : {}),
        ...(data.priceRange ? { priceRange: data.priceRange.trim() } : {}),
        address: {
          '@type': 'PostalAddress',
          streetAddress: data.streetAddress?.trim() || '',
          addressLocality: data.addressLocality?.trim() || '',
          addressRegion: data.addressRegion?.trim() || '',
          postalCode: data.postalCode?.trim() || '',
          addressCountry: data.addressCountry?.trim() || 'IN'
        }
      };
    }

    case 'ARTICLE': {
      return {
        ...base,
        '@type': 'Article',
        headline: data.headline?.trim(),
        author: {
          '@type': 'Person',
          name: data.authorName?.trim() || 'Author'
        },
        datePublished: data.datePublished?.trim(),
        ...(data.dateModified ? { dateModified: data.dateModified.trim() } : {}),
        ...(data.image ? { image: data.image.trim() } : {}),
        ...(data.description ? { description: data.description.trim() } : {})
      };
    }

    case 'BLOG_POSTING': {
      return {
        ...base,
        '@type': 'BlogPosting',
        headline: data.headline?.trim(),
        author: {
          '@type': 'Person',
          name: data.authorName?.trim() || 'Author'
        },
        datePublished: data.datePublished?.trim(),
        ...(data.dateModified ? { dateModified: data.dateModified.trim() } : {}),
        ...(data.image ? { image: data.image.trim() } : {}),
        ...(data.description ? { description: data.description.trim() } : {})
      };
    }

    case 'PRODUCT': {
      const priceNum = Number(data.price) || 0;
      return {
        ...base,
        '@type': 'Product',
        name: data.name?.trim(),
        ...(data.image ? { image: data.image.trim() } : {}),
        ...(data.description ? { description: data.description.trim() } : {}),
        ...(data.sku ? { sku: data.sku.trim() } : {}),
        offers: {
          '@type': 'Offer',
          price: priceNum,
          priceCurrency: data.priceCurrency?.trim() || 'INR',
          availability: `https://schema.org/${data.availability?.trim() || 'InStock'}`
        }
      };
    }

    case 'BREADCRUMB_LIST': {
      const items: Array<{ name: string; url: string }> = Array.isArray(data.items) ? data.items : [];
      return {
        ...base,
        '@type': 'BreadcrumbList',
        itemListElement: items
          .filter((item) => item && item.name?.trim())
          .map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name.trim(),
            ...(item.url ? { item: item.url.trim() } : {})
          }))
      };
    }

    case 'PERSON': {
      const sameAs = parseArrayField(data.sameAs);
      return {
        ...base,
        '@type': 'Person',
        name: data.name?.trim(),
        ...(data.jobTitle ? { jobTitle: data.jobTitle.trim() } : {}),
        ...(data.worksFor ? { worksFor: { '@type': 'Organization', name: data.worksFor.trim() } } : {}),
        ...(data.url ? { url: data.url.trim() } : {}),
        ...(sameAs.length > 0 ? { sameAs } : {})
      };
    }

    case 'WEB_PAGE': {
      return {
        ...base,
        '@type': 'WebPage',
        name: data.name?.trim(),
        ...(data.description ? { description: data.description.trim() } : {}),
        ...(data.url ? { url: data.url.trim() } : {})
      };
    }

    case 'SERVICE': {
      return {
        ...base,
        '@type': 'Service',
        name: data.name?.trim(),
        provider: {
          '@type': 'Organization',
          name: data.providerName?.trim() || ''
        },
        ...(data.areaServed ? { areaServed: data.areaServed.trim() } : {}),
        ...(data.description ? { description: data.description.trim() } : {})
      };
    }

    case 'EVENT': {
      return {
        ...base,
        '@type': 'Event',
        name: data.name?.trim(),
        startDate: data.startDate?.trim(),
        ...(data.endDate ? { endDate: data.endDate.trim() } : {}),
        location: {
          '@type': 'Place',
          name: data.locationName?.trim() || 'Venue'
        },
        ...(data.description ? { description: data.description.trim() } : {})
      };
    }

    case 'REVIEW': {
      const ratingValue = Number(data.ratingValue) || 5;
      const bestRating = Number(data.bestRating) || 5;
      return {
        ...base,
        '@type': 'Review',
        itemReviewed: {
          '@type': 'Thing',
          name: data.itemReviewed?.trim() || 'Item'
        },
        author: {
          '@type': 'Person',
          name: data.authorName?.trim() || 'Reviewer'
        },
        reviewRating: {
          '@type': 'Rating',
          ratingValue,
          bestRating
        },
        reviewBody: data.reviewBody?.trim() || ''
      };
    }

    case 'RECIPE': {
      const ingredients = parseArrayField(data.ingredients);
      return {
        ...base,
        '@type': 'Recipe',
        name: data.name?.trim(),
        ...(data.authorName ? { author: { '@type': 'Person', name: data.authorName.trim() } } : {}),
        ...(data.cookTime ? { cookTime: data.cookTime.trim() } : {}),
        ...(data.recipeYield ? { recipeYield: data.recipeYield.trim() } : {}),
        recipeIngredient: ingredients
      };
    }

    case 'COURSE': {
      return {
        ...base,
        '@type': 'Course',
        name: data.name?.trim(),
        provider: {
          '@type': 'Organization',
          name: data.providerName?.trim() || 'Provider'
        },
        ...(data.description ? { description: data.description.trim() } : {})
      };
    }

    case 'JOB_POSTING': {
      return {
        ...base,
        '@type': 'JobPosting',
        title: data.title?.trim(),
        hiringOrganization: {
          '@type': 'Organization',
          name: data.hiringOrganization?.trim() || 'Company'
        },
        jobLocation: {
          '@type': 'Place',
          address: data.jobLocation?.trim() || 'Remote'
        },
        datePosted: data.datePosted?.trim() || new Date().toISOString().split('T')[0],
        description: data.description?.trim() || ''
      };
    }

    case 'VIDEO_OBJECT': {
      return {
        ...base,
        '@type': 'VideoObject',
        name: data.name?.trim(),
        thumbnailUrl: data.thumbnailUrl?.trim(),
        uploadDate: data.uploadDate?.trim() || new Date().toISOString().split('T')[0],
        ...(data.description ? { description: data.description.trim() } : {}),
        ...(data.contentUrl ? { contentUrl: data.contentUrl.trim() } : {})
      };
    }

    case 'SOFTWARE_APPLICATION': {
      const priceNum = Number(data.price) || 0;
      return {
        ...base,
        '@type': 'SoftwareApplication',
        name: data.name?.trim(),
        ...(data.operatingSystem ? { operatingSystem: data.operatingSystem.trim() } : {}),
        ...(data.applicationCategory ? { applicationCategory: data.applicationCategory.trim() } : {}),
        offers: {
          '@type': 'Offer',
          price: priceNum,
          priceCurrency: 'USD'
        }
      };
    }

    case 'HOW_TO': {
      const steps = parseArrayField(data.steps);
      return {
        ...base,
        '@type': 'HowTo',
        name: data.name?.trim(),
        ...(data.description ? { description: data.description.trim() } : {}),
        step: steps.map((s, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          text: s
        }))
      };
    }

    default:
      return {
        ...base,
        '@type': 'Thing',
        ...data
      };
  }
}

function parseArrayField(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    return val
      .split(/[\n,]+/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Parses structured FAQ items from blog post or section content JSON.
 * Recursively walks Tiptap or custom node tree looking for nodes of type 'faq' or 'faqList'.
 */
export function extractFaqsFromDocument(contentString: string): Array<{ question: string; answer: string }> {
  if (!contentString) return [];
  try {
    const doc = JSON.parse(contentString);
    const results: Array<{ question: string; answer: string }> = [];

    const walk = (node: any) => {
      if (!node || typeof node !== 'object') return;

      // Check if this node is an FAQ block
      if (node.type === 'faq' || node.type === 'faqBlock') {
        if (Array.isArray(node.attrs?.items)) {
          for (const it of node.attrs.items) {
            if (it.question && it.answer) {
              results.push({ question: String(it.question), answer: String(it.answer) });
            }
          }
        } else if (node.attrs?.question && node.attrs?.answer) {
          results.push({ question: String(node.attrs.question), answer: String(node.attrs.answer) });
        }
      }

      // Check for custom sections array in Page models
      if (Array.isArray(node.sections)) {
        for (const s of node.sections) {
          if (s.type === 'faq' && s.content) {
            try {
              const secData = typeof s.content === 'string' ? JSON.parse(s.content) : s.content;
              if (Array.isArray(secData.faqs)) {
                for (const f of secData.faqs) {
                  if (f.question && f.answer) {
                    results.push({ question: String(f.question), answer: String(f.answer) });
                  }
                }
              }
            } catch {}
          }
        }
      }

      // If this object is an array, iterate
      if (Array.isArray(node)) {
        for (const item of node) walk(item);
      } else if (Array.isArray(node.content)) {
        for (const child of node.content) walk(child);
      }
    }

    walk(doc);
    return results;
  } catch {
    return [];
  }
}
