export interface SectionFieldDef {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'image' | 'list' | 'select' | 'number';
  placeholder?: string;
  required?: boolean;
  itemSchema?: Record<string, { label: string; type: 'text' | 'textarea' | 'url' | 'image'; placeholder?: string }>;
}

export interface SectionTypeDef {
  type: string;
  label: string;
  description: string;
  icon: string;
  defaultContent: Record<string, any>;
  fields: SectionFieldDef[];
}

export const SECTION_TYPES: Record<string, SectionTypeDef> = {
  hero: {
    type: 'hero',
    label: 'Hero Section',
    description: 'Prominent header banner with headline, call-to-action button, and background image.',
    icon: 'Sparkles',
    defaultContent: {
      headline: 'Build Faster with Tythas Control Center',
      subheadline: 'The complete enterprise website management platform for high-performance teams.',
      ctaText: 'Get Started',
      ctaUrl: '#contact',
      secondaryCtaText: 'Learn More',
      secondaryCtaUrl: '#features',
      badge: 'New Release 2026',
      backgroundImage: '',
    },
    fields: [
      { name: 'badge', label: 'Badge / Pill Text', type: 'text', placeholder: 'e.g. New Release' },
      { name: 'headline', label: 'Main Headline', type: 'text', required: true, placeholder: 'Enter prominent headline' },
      { name: 'subheadline', label: 'Subheadline', type: 'textarea', placeholder: 'Supporting description text' },
      { name: 'ctaText', label: 'Primary CTA Button Label', type: 'text', placeholder: 'e.g. Get Started' },
      { name: 'ctaUrl', label: 'Primary CTA Button URL', type: 'url', placeholder: 'https://... or #contact' },
      { name: 'secondaryCtaText', label: 'Secondary CTA Button Label', type: 'text', placeholder: 'e.g. Learn More' },
      { name: 'secondaryCtaUrl', label: 'Secondary CTA Button URL', type: 'url', placeholder: 'https://... or #features' },
      { name: 'backgroundImage', label: 'Background Image URL', type: 'image', placeholder: 'https://...' },
    ],
  },
  features: {
    type: 'features',
    label: 'Features Grid',
    description: 'Showcase key product capabilities and benefits with icons and descriptions.',
    icon: 'Layers',
    defaultContent: {
      title: 'Built for scale and reliability',
      subtitle: 'Everything you need to deliver high-converting web experiences.',
      items: [
        { title: 'Lightning Performance', description: 'Engineered for sub-second Core Web Vitals score.', icon: 'Zap' },
        { title: 'Full Connector Pipeline', description: 'Zero-overhead sync with your favorite CMS & frameworks.', icon: 'ShieldCheck' },
        { title: 'Autonomous SEO Guard', description: 'Real-time schema, canonical, and link validation.', icon: 'Search' },
      ],
    },
    fields: [
      { name: 'title', label: 'Section Title', type: 'text', required: true, placeholder: 'Features Title' },
      { name: 'subtitle', label: 'Section Subtitle', type: 'textarea', placeholder: 'Introductory subtitle' },
      {
        name: 'items',
        label: 'Feature Items',
        type: 'list',
        itemSchema: {
          title: { label: 'Feature Title', type: 'text', placeholder: 'Feature title' },
          description: { label: 'Description', type: 'textarea', placeholder: 'Feature description' },
          icon: { label: 'Icon Name', type: 'text', placeholder: 'Zap, ShieldCheck, Search, etc.' },
        },
      },
    ],
  },
  cta: {
    type: 'cta',
    label: 'Call to Action (CTA)',
    description: 'High-converting conversion block with headline and action buttons.',
    icon: 'Rocket',
    defaultContent: {
      headline: 'Ready to modernize your digital presence?',
      body: 'Get in touch with our team today to schedule an onboarding demo and audit.',
      primaryButtonText: 'Book a Consultation',
      primaryButtonUrl: '/contact',
      secondaryButtonText: 'View Case Studies',
      secondaryButtonUrl: '/cases',
    },
    fields: [
      { name: 'headline', label: 'CTA Headline', type: 'text', required: true, placeholder: 'Action-oriented headline' },
      { name: 'body', label: 'Supporting Copy', type: 'textarea', placeholder: 'Short conversion pitch' },
      { name: 'primaryButtonText', label: 'Primary Button Text', type: 'text', placeholder: 'e.g. Schedule Demo' },
      { name: 'primaryButtonUrl', label: 'Primary Button URL', type: 'url', placeholder: '/demo or https://...' },
      { name: 'secondaryButtonText', label: 'Secondary Button Text', type: 'text', placeholder: 'e.g. Contact Sales' },
      { name: 'secondaryButtonUrl', label: 'Secondary Button URL', type: 'url', placeholder: '/contact' },
    ],
  },
  faq: {
    type: 'faq',
    label: 'FAQ Accordion',
    description: 'Collapsible frequently asked questions with structured answers.',
    icon: 'HelpCircle',
    defaultContent: {
      title: 'Frequently Asked Questions',
      items: [
        { question: 'How long does onboarding take?', answer: 'Most clients are fully verified and connected within 10 minutes.' },
        { question: 'Does Tythas support custom CMS integrations?', answer: 'Yes! Custom connector routes provide bidirectional REST sync.' },
        { question: 'Can I draft changes without publishing immediately?', answer: 'Yes, draft changes remain in database state until explicitly published.' },
      ],
    },
    fields: [
      { name: 'title', label: 'FAQ Section Title', type: 'text', required: true, placeholder: 'Frequently Asked Questions' },
      {
        name: 'items',
        label: 'Q&A Items',
        type: 'list',
        itemSchema: {
          question: { label: 'Question', type: 'text', placeholder: 'Question prompt' },
          answer: { label: 'Answer', type: 'textarea', placeholder: 'Detailed answer text' },
        },
      },
    ],
  },
  testimonials: {
    type: 'testimonials',
    label: 'Testimonials / Social Proof',
    description: 'Client reviews, ratings, and quotes with author credentials.',
    icon: 'MessageSquare',
    defaultContent: {
      title: 'Trusted by Industry Leaders',
      items: [
        { quote: 'Tythas transformed our web operations and saved 20+ engineer hours each week.', author: 'Alex Reynolds', role: 'Head of Growth, Acme Corp', avatarUrl: '' },
        { quote: 'The instant SEO verification and connector sync is game changing.', author: 'Elena Rostova', role: 'VP Digital, Quantum Brands', avatarUrl: '' },
      ],
    },
    fields: [
      { name: 'title', label: 'Section Title', type: 'text', placeholder: 'Section title' },
      {
        name: 'items',
        label: 'Testimonials',
        type: 'list',
        itemSchema: {
          quote: { label: 'Quote', type: 'textarea', placeholder: 'Client quote...' },
          author: { label: 'Author Name', type: 'text', placeholder: 'Jane Doe' },
          role: { label: 'Author Role / Company', type: 'text', placeholder: 'CTO, Example Inc.' },
          avatarUrl: { label: 'Avatar URL', type: 'image', placeholder: 'https://...' },
        },
      },
    ],
  },
  contact: {
    type: 'contact',
    label: 'Contact Info & Location',
    description: 'Direct contact coordinates, business hours, and location information.',
    icon: 'Mail',
    defaultContent: {
      title: 'Get in Touch',
      subtitle: 'Our dedicated team is here to assist with questions and enterprise implementations.',
      email: 'hello@tythas.example',
      phone: '+1 (555) 019-2834',
      address: '100 Innovation Way, Suite 400, San Francisco, CA',
    },
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Get in Touch' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea', placeholder: 'Subtitle description' },
      { name: 'email', label: 'Email Address', type: 'text', placeholder: 'contact@domain.com' },
      { name: 'phone', label: 'Phone Number', type: 'text', placeholder: '+1 (555) ...' },
      { name: 'address', label: 'Physical Address', type: 'textarea', placeholder: 'Street address' },
    ],
  },
  rich_text: {
    type: 'rich_text',
    label: 'Rich Text / Freeform',
    description: 'General purpose structured text block for articles, guidelines, or custom copy.',
    icon: 'FileText',
    defaultContent: {
      title: 'About Our Mission',
      content: 'We empower teams with scalable, automated website operations, combining best-in-class crawl audits with instant CMS synchronization.',
    },
    fields: [
      { name: 'title', label: 'Block Heading', type: 'text', placeholder: 'Heading' },
      { name: 'content', label: 'Body Content', type: 'textarea', required: true, placeholder: 'Enter narrative text or markdown...' },
    ],
  },
};

export function getSectionTypeDef(type: string): SectionTypeDef {
  return SECTION_TYPES[type] || {
    type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    description: 'Custom section block',
    icon: 'Square',
    defaultContent: {},
    fields: [],
  };
}
