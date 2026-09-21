export type SchemaType =
  | 'ORGANIZATION'
  | 'LOCAL_BUSINESS'
  | 'PERSON'
  | 'WEB_PAGE'
  | 'ARTICLE'
  | 'BLOG_POSTING'
  | 'PRODUCT'
  | 'SERVICE'
  | 'FAQ_PAGE'
  | 'BREADCRUMB_LIST'
  | 'EVENT'
  | 'REVIEW'
  | 'RECIPE'
  | 'COURSE'
  | 'JOB_POSTING'
  | 'VIDEO_OBJECT'
  | 'SOFTWARE_APPLICATION'
  | 'HOW_TO';

export interface SchemaTypeDefinition {
  type: SchemaType;
  label: string;
  category: 'core' | 'extended';
  description: string;
  fields: {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'url' | 'number' | 'array' | 'faq_list' | 'breadcrumbs' | 'rating';
    required: boolean;
    placeholder?: string;
    helpText?: string;
  }[];
}

export const SCHEMA_REGISTRY: Record<SchemaType, SchemaTypeDefinition> = {
  FAQ_PAGE: {
    type: 'FAQ_PAGE',
    label: 'FAQ Page',
    category: 'core',
    description: 'Frequently Asked Questions list that can show rich accordion snippets in Google Search.',
    fields: [
      {
        name: 'faqs',
        label: 'Questions & Answers',
        type: 'faq_list',
        required: true,
        helpText: 'Add question and answer pairs.'
      }
    ]
  },
  ORGANIZATION: {
    type: 'ORGANIZATION',
    label: 'Organization / Brand',
    category: 'core',
    description: 'Brand identity, official website URL, logo, and social profile links (Knowledge Graph).',
    fields: [
      { name: 'name', label: 'Organization Name', type: 'text', required: true, placeholder: 'Acme Corp' },
      { name: 'url', label: 'Website URL', type: 'url', required: true, placeholder: 'https://example.com' },
      { name: 'logo', label: 'Logo Image URL', type: 'url', required: false, placeholder: 'https://example.com/logo.png' },
      { name: 'description', label: 'Description', type: 'textarea', required: false },
      { name: 'sameAs', label: 'Social Profile URLs (comma separated)', type: 'array', required: false, placeholder: 'https://twitter.com/acme, https://linkedin.com/company/acme' }
    ]
  },
  LOCAL_BUSINESS: {
    type: 'LOCAL_BUSINESS',
    label: 'Local Business',
    category: 'core',
    description: 'Physical store or service with street address, phone, price range, and opening hours.',
    fields: [
      { name: 'name', label: 'Business Name', type: 'text', required: true, placeholder: 'Tythas Digital Pune' },
      { name: 'streetAddress', label: 'Street Address', type: 'text', required: true, placeholder: '123 MG Road, Camp' },
      { name: 'addressLocality', label: 'City / Locality', type: 'text', required: true, placeholder: 'Pune' },
      { name: 'addressRegion', label: 'State / Region', type: 'text', required: true, placeholder: 'Maharashtra' },
      { name: 'postalCode', label: 'Postal Code', type: 'text', required: true, placeholder: '411001' },
      { name: 'addressCountry', label: 'Country Code', type: 'text', required: true, placeholder: 'IN' },
      { name: 'telephone', label: 'Phone Number', type: 'text', required: false, placeholder: '+91 98765 43210' },
      { name: 'priceRange', label: 'Price Range (e.g. $$, ₹₹)', type: 'text', required: false, placeholder: '₹₹' },
      { name: 'url', label: 'Website / Location Page URL', type: 'url', required: false }
    ]
  },
  ARTICLE: {
    type: 'ARTICLE',
    label: 'Article',
    category: 'core',
    description: 'News or general article metadata for Google News and Top Stories eligibility.',
    fields: [
      { name: 'headline', label: 'Headline / Title', type: 'text', required: true },
      { name: 'authorName', label: 'Author Name', type: 'text', required: true },
      { name: 'datePublished', label: 'Date Published', type: 'text', required: true, placeholder: '2026-09-18' },
      { name: 'dateModified', label: 'Date Modified', type: 'text', required: false },
      { name: 'image', label: 'Main Image URL', type: 'url', required: false },
      { name: 'description', label: 'Short Summary / Abstract', type: 'textarea', required: false }
    ]
  },
  BLOG_POSTING: {
    type: 'BLOG_POSTING',
    label: 'Blog Posting',
    category: 'core',
    description: 'Detailed blog post schema linking author, publishing date, and featured media.',
    fields: [
      { name: 'headline', label: 'Post Title', type: 'text', required: true },
      { name: 'authorName', label: 'Author Name', type: 'text', required: true },
      { name: 'datePublished', label: 'Date Published', type: 'text', required: true, placeholder: '2026-09-18' },
      { name: 'dateModified', label: 'Date Modified', type: 'text', required: false },
      { name: 'image', label: 'Featured Image URL', type: 'url', required: false },
      { name: 'description', label: 'Post Excerpt / Meta Description', type: 'textarea', required: false }
    ]
  },
  PRODUCT: {
    type: 'PRODUCT',
    label: 'Product',
    category: 'core',
    description: 'E-commerce or D2C product with pricing, currency, availability, and review ratings.',
    fields: [
      { name: 'name', label: 'Product Name', type: 'text', required: true, placeholder: 'Hydrating Facial Serum' },
      { name: 'image', label: 'Product Image URL', type: 'url', required: false },
      { name: 'description', label: 'Product Description', type: 'textarea', required: false },
      { name: 'sku', label: 'SKU / Product Code', type: 'text', required: false, placeholder: 'AB-SERUM-50' },
      { name: 'price', label: 'Price (number)', type: 'number', required: true, placeholder: '1499' },
      { name: 'priceCurrency', label: 'Currency Code', type: 'text', required: true, placeholder: 'INR' },
      { name: 'availability', label: 'Availability', type: 'text', required: false, placeholder: 'InStock' }
    ]
  },
  BREADCRUMB_LIST: {
    type: 'BREADCRUMB_LIST',
    label: 'Breadcrumb List',
    category: 'core',
    description: 'Hierarchy trail (e.g. Home > Shop > Skincare) shown directly in search result URLs.',
    fields: [
      {
        name: 'items',
        label: 'Breadcrumb Trail (Title and URL per step)',
        type: 'breadcrumbs',
        required: true,
        helpText: 'Enter name and URL for each navigation step in order.'
      }
    ]
  },
  PERSON: {
    type: 'PERSON',
    label: 'Person / Expert',
    category: 'extended',
    description: 'Author, founder, or practitioner profile with affiliations and credentials.',
    fields: [
      { name: 'name', label: 'Full Name', type: 'text', required: true },
      { name: 'jobTitle', label: 'Job Title / Role', type: 'text', required: false },
      { name: 'worksFor', label: 'Company / Organization', type: 'text', required: false },
      { name: 'url', label: 'Profile / Bio URL', type: 'url', required: false },
      { name: 'sameAs', label: 'Social Profiles (comma separated)', type: 'array', required: false }
    ]
  },
  WEB_PAGE: {
    type: 'WEB_PAGE',
    label: 'Web Page',
    category: 'extended',
    description: 'General webpage metadata with name, description, and primary entity.',
    fields: [
      { name: 'name', label: 'Page Name', type: 'text', required: true },
      { name: 'description', label: 'Page Description', type: 'textarea', required: false },
      { name: 'url', label: 'Canonical Page URL', type: 'url', required: false }
    ]
  },
  SERVICE: {
    type: 'SERVICE',
    label: 'Service',
    category: 'extended',
    description: 'Professional or agency service offering, provider, area served, and terms.',
    fields: [
      { name: 'name', label: 'Service Name', type: 'text', required: true },
      { name: 'providerName', label: 'Provider Organization Name', type: 'text', required: true },
      { name: 'areaServed', label: 'Area Served (e.g. Pune, Maharashtra, Global)', type: 'text', required: false },
      { name: 'description', label: 'Service Description', type: 'textarea', required: false }
    ]
  },
  EVENT: {
    type: 'EVENT',
    label: 'Event',
    category: 'extended',
    description: 'Conferences, webinars, workshops with start/end time and location or virtual URL.',
    fields: [
      { name: 'name', label: 'Event Name', type: 'text', required: true },
      { name: 'startDate', label: 'Start Date & Time (ISO)', type: 'text', required: true, placeholder: '2026-10-15T10:00:00+05:30' },
      { name: 'endDate', label: 'End Date & Time (ISO)', type: 'text', required: false },
      { name: 'locationName', label: 'Venue or Virtual Location', type: 'text', required: true },
      { name: 'description', label: 'Event Description', type: 'textarea', required: false }
    ]
  },
  REVIEW: {
    type: 'REVIEW',
    label: 'Review',
    category: 'extended',
    description: 'Critic or client review of an item, book, service, or creative work.',
    fields: [
      { name: 'itemReviewed', label: 'Item Reviewed Name', type: 'text', required: true },
      { name: 'authorName', label: 'Reviewer Name', type: 'text', required: true },
      { name: 'ratingValue', label: 'Rating (e.g. 5 or 4.5)', type: 'number', required: true },
      { name: 'bestRating', label: 'Best Rating (default 5)', type: 'number', required: false },
      { name: 'reviewBody', label: 'Review Content', type: 'textarea', required: true }
    ]
  },
  RECIPE: {
    type: 'RECIPE',
    label: 'Recipe',
    category: 'extended',
    description: 'Cooking or culinary recipe with ingredients, cook time, and instructions.',
    fields: [
      { name: 'name', label: 'Recipe Name', type: 'text', required: true },
      { name: 'authorName', label: 'Author / Chef', type: 'text', required: false },
      { name: 'cookTime', label: 'Cook Time (e.g. PT30M)', type: 'text', required: false },
      { name: 'recipeYield', label: 'Yield / Servings', type: 'text', required: false },
      { name: 'ingredients', label: 'Ingredients (comma separated)', type: 'array', required: true }
    ]
  },
  COURSE: {
    type: 'COURSE',
    label: 'Course',
    category: 'extended',
    description: 'Educational course metadata with provider, curriculum summary, and credentials.',
    fields: [
      { name: 'name', label: 'Course Title', type: 'text', required: true },
      { name: 'providerName', label: 'Course Provider / Academy', type: 'text', required: true },
      { name: 'description', label: 'Course Description', type: 'textarea', required: false }
    ]
  },
  JOB_POSTING: {
    type: 'JOB_POSTING',
    label: 'Job Posting',
    category: 'extended',
    description: 'Employment opportunity for Google for Jobs listing.',
    fields: [
      { name: 'title', label: 'Job Title', type: 'text', required: true },
      { name: 'hiringOrganization', label: 'Hiring Company', type: 'text', required: true },
      { name: 'jobLocation', label: 'City / Location (or Remote)', type: 'text', required: true },
      { name: 'datePosted', label: 'Date Posted', type: 'text', required: true },
      { name: 'description', label: 'Job Description', type: 'textarea', required: true }
    ]
  },
  VIDEO_OBJECT: {
    type: 'VIDEO_OBJECT',
    label: 'Video Object',
    category: 'extended',
    description: 'Video embed with title, thumbnail, upload date, and duration.',
    fields: [
      { name: 'name', label: 'Video Title', type: 'text', required: true },
      { name: 'description', label: 'Video Description', type: 'textarea', required: false },
      { name: 'thumbnailUrl', label: 'Thumbnail URL', type: 'url', required: true },
      { name: 'uploadDate', label: 'Upload Date (ISO)', type: 'text', required: true },
      { name: 'contentUrl', label: 'Video Stream / File URL', type: 'url', required: false }
    ]
  },
  SOFTWARE_APPLICATION: {
    type: 'SOFTWARE_APPLICATION',
    label: 'Software Application / App',
    category: 'extended',
    description: 'Web, mobile, or desktop application with operating system, category, and price.',
    fields: [
      { name: 'name', label: 'Software Name', type: 'text', required: true },
      { name: 'operatingSystem', label: 'Operating System (e.g. Web, iOS, Android)', type: 'text', required: false },
      { name: 'applicationCategory', label: 'Category (e.g. BusinessApplication, DeveloperApplication)', type: 'text', required: false },
      { name: 'price', label: 'Price (0 if free)', type: 'number', required: false }
    ]
  },
  HOW_TO: {
    type: 'HOW_TO',
    label: 'How-To Guide',
    category: 'extended',
    description: 'Step-by-step instructional guide that can render rich expandable steps.',
    fields: [
      { name: 'name', label: 'Guide Title (e.g. How to connect a custom domain)', type: 'text', required: true },
      { name: 'description', label: 'Summary', type: 'textarea', required: false },
      { name: 'steps', label: 'Steps (comma separated or multiline)', type: 'array', required: true }
    ]
  }
};
