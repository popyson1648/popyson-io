declare module "virtual:theme.css";
declare module "*.css";
declare module "/pagefind/pagefind.js";

declare module "virtual:site-content" {
  export const POSTS: Post[];
  export const TAGS: string[];
  export const PERSON: Person;
  export const APPS: AppItem[];
  export const READING: ReadingItem[];
  export const ARTICLE_BODIES: Record<string, ArticleBodyEntry>;
}

type LocaleMap<T = string> = Record<string, T> & { ja?: T; en?: T };

type Post = {
  id: string;
  title: LocaleMap;
  date: string;
  dateLabel?: { ja: string; en: string };
  reading: number;
  tags: string[];
  kana: string;
  summary: LocaleMap;
  thumbnail?: string;
  relatedIds?: string[];
};

type AppItem = {
  id: string;
  title: string;
  tagline: LocaleMap;
  desc: LocaleMap;
  detail: LocaleMap<string[]>;
  stack: string[];
  year: string | number;
};

type ReadingItem = {
  id: string | number;
  title: string;
  url?: string;
  source?: string;
  date?: string;
  dateLabel?: { ja: string; en: string };
  done?: boolean;
};

type Person = {
  initials: string;
  name: LocaleMap;
  role: LocaleMap;
  location: LocaleMap;
  tagline: LocaleMap;
  bio: LocaleMap<string[]>;
  career: Array<{ period: string; role: LocaleMap; org: LocaleMap }>;
  activities: LocaleMap[];
  links: Array<{ label: string; href: string }>;
};

type ArticleBodyEntry = {
  ja?: ArticleBodyLocale;
  en?: ArticleBodyLocale;
  headings?: Array<{ id: string; ja: string; en: string }>;
};

type ArticleBodyLocale = { html?: string; text?: string } | string;

type BlogDataShape = {
  PERSON: Person;
  POSTS: Post[];
  TAGS: string[];
  APPS: AppItem[];
  READING: ReadingItem[];
};

interface Window {
  BlogData: BlogDataShape;
  I18N: Record<string, Record<string, any>>;
  ArticleBody: {
    byId: Record<string, ArticleBodyEntry>;
    fallback: ArticleBodyEntry;
    get(id: string): ArticleBodyEntry | Array<Record<string, any>> | undefined;
  };
}
