import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Veranstaltungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    aktive_interaktion?: RecordUrl; // applookup -> URL zu 'Interaktionen' Record
    titel?: string;
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    beschreibung?: string;
  };
}

export interface Interaktionen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    reihenfolge?: number;
    frage?: string;
    erlaeuterung?: string;
    vorprompt?: string;
    endprompt?: string;
    zusammenfassung?: string;
    ki_antwort?: string;
    veranstaltung?: RecordUrl; // applookup -> URL zu 'Veranstaltungen' Record
  };
}

export interface Feedbacks {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    interaktion?: RecordUrl; // applookup -> URL zu 'Interaktionen' Record
    kuerzel?: string;
    feedback_text?: string;
    absende_kennung?: string;
  };
}

export interface Abschlussbewertungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    kuerzel?: string;
    sterne?: LookupValue;
    kommentar?: string;
    email?: string;
    einwilligung?: boolean;
    veranstaltung?: RecordUrl; // applookup -> URL zu 'Veranstaltungen' Record
  };
}

export const APP_IDS = {
  VERANSTALTUNGEN: '6aeddd3ca7d0815337b5debc',
  INTERAKTIONEN: '6aeddd436ce9be16cc4568af',
  FEEDBACKS: '6aeddd435245b8a408d21886',
  ABSCHLUSSBEWERTUNGEN: '6aeddd44637f0f36f304315c',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'abschlussbewertungen': {
    sterne: [{ key: "stern_1", get label() { return lookupLabel('abschlussbewertungen', 'sterne', "stern_1") ?? "1 Stern"; } }, { key: "stern_2", get label() { return lookupLabel('abschlussbewertungen', 'sterne', "stern_2") ?? "2 Sterne"; } }, { key: "stern_3", get label() { return lookupLabel('abschlussbewertungen', 'sterne', "stern_3") ?? "3 Sterne"; } }, { key: "stern_4", get label() { return lookupLabel('abschlussbewertungen', 'sterne', "stern_4") ?? "4 Sterne"; } }, { key: "stern_5", get label() { return lookupLabel('abschlussbewertungen', 'sterne', "stern_5") ?? "5 Sterne"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'veranstaltungen': {
    'aktive_interaktion': 'applookup/select',
    'titel': 'string/text',
    'datum': 'date/datetimeminute',
    'beschreibung': 'string/textarea',
  },
  'interaktionen': {
    'reihenfolge': 'number',
    'frage': 'string/textarea',
    'erlaeuterung': 'string/textarea',
    'vorprompt': 'string/textarea',
    'endprompt': 'string/textarea',
    'zusammenfassung': 'string/textarea',
    'ki_antwort': 'string/textarea',
    'veranstaltung': 'applookup/select',
  },
  'feedbacks': {
    'interaktion': 'applookup/select',
    'kuerzel': 'string/text',
    'feedback_text': 'string/textarea',
    'absende_kennung': 'string/text',
  },
  'abschlussbewertungen': {
    'kuerzel': 'string/text',
    'sterne': 'lookup/radio',
    'kommentar': 'string/textarea',
    'email': 'string/email',
    'einwilligung': 'bool',
    'veranstaltung': 'applookup/select',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateVeranstaltungen = StripLookup<Veranstaltungen['fields']>;
export type CreateInteraktionen = StripLookup<Interaktionen['fields']>;
export type CreateFeedbacks = StripLookup<Feedbacks['fields']>;
export type CreateAbschlussbewertungen = StripLookup<Abschlussbewertungen['fields']>;