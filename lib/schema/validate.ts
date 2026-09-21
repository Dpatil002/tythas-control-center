import { SchemaType, SCHEMA_REGISTRY } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSchema(type: SchemaType, data: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  const definition = SCHEMA_REGISTRY[type];

  if (!definition) {
    return { valid: false, errors: [`Unknown schema type: ${type}`] };
  }

  // Type-specific custom validations
  switch (type) {
    case 'FAQ_PAGE': {
      const faqs = Array.isArray(data.faqs) ? data.faqs : [];
      if (faqs.length === 0) {
        errors.push('FAQ Page schema requires at least one question and answer pair.');
      } else {
        faqs.forEach((faq, idx) => {
          if (!faq || !faq.question?.trim()) {
            errors.push(`FAQ item #${idx + 1} is missing a question.`);
          }
          if (!faq || !faq.answer?.trim()) {
            errors.push(`FAQ item #${idx + 1} is missing an answer.`);
          }
        });
      }
      break;
    }

    case 'ORGANIZATION': {
      if (!data.name?.trim()) errors.push('Organization name is required.');
      if (!data.url?.trim()) {
        errors.push('Organization website URL is required.');
      } else if (!isValidUrl(data.url)) {
        errors.push('Organization website URL must be a valid URL starting with http:// or https://.');
      }
      break;
    }

    case 'LOCAL_BUSINESS': {
      if (!data.name?.trim()) errors.push('Business name is required.');
      if (!data.streetAddress?.trim()) errors.push('Street address is required for local business schema.');
      if (!data.addressLocality?.trim()) errors.push('City / Locality is required.');
      break;
    }

    case 'ARTICLE':
    case 'BLOG_POSTING': {
      if (!data.headline?.trim()) errors.push('Headline is required.');
      if (!data.authorName?.trim()) errors.push('Author name is required.');
      if (!data.datePublished?.trim()) errors.push('Date published is required.');
      break;
    }

    case 'PRODUCT': {
      if (!data.name?.trim()) errors.push('Product name is required.');
      if (data.price === undefined || data.price === null || String(data.price).trim() === '') {
        errors.push('Product price is required.');
      } else if (isNaN(Number(data.price)) || Number(data.price) < 0) {
        errors.push('Product price must be a valid positive number.');
      }
      if (!data.priceCurrency?.trim()) errors.push('Currency code (e.g. INR, USD) is required.');
      break;
    }

    case 'BREADCRUMB_LIST': {
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) {
        errors.push('Breadcrumb List requires at least one breadcrumb step.');
      } else {
        items.forEach((item, idx) => {
          if (!item || !item.name?.trim()) {
            errors.push(`Breadcrumb step #${idx + 1} is missing a label/name.`);
          }
        });
      }
      break;
    }

    default: {
      // General required field check from registry
      for (const field of definition.fields) {
        if (field.required) {
          const val = data[field.name];
          if (val === undefined || val === null || String(val).trim() === '') {
            errors.push(`${field.label} is required.`);
          }
        }
      }
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function isValidUrl(val: string): boolean {
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
