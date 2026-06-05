CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS forms (
  form_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_name character varying(255) NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_by uuid REFERENCES users(user_id) ON DELETE SET NULL,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS form_sections (
  section_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(form_id) ON DELETE CASCADE,
  section_name character varying(255) NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS form_questions (
  question_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES form_sections(section_id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type character varying(50) NOT NULL DEFAULT 'RADIO',
  has_comment boolean NOT NULL DEFAULT TRUE,
  is_required boolean NOT NULL DEFAULT TRUE,
  is_active boolean NOT NULL DEFAULT TRUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(user_id) ON DELETE SET NULL,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS form_question_options (
  option_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES form_questions(question_id) ON DELETE CASCADE,
  option_label character varying(100) NOT NULL,
  option_value character varying(100) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS form_signatories (
  signatory_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(form_id) ON DELETE CASCADE,
  position_name character varying(255) NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT TRUE,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_forms_created_by
  ON forms (created_by);

CREATE INDEX IF NOT EXISTS idx_form_sections_form_id
  ON form_sections (form_id);

CREATE INDEX IF NOT EXISTS idx_form_questions_section_id
  ON form_questions (section_id);

CREATE INDEX IF NOT EXISTS idx_form_questions_created_by
  ON form_questions (created_by);

CREATE INDEX IF NOT EXISTS idx_form_question_options_question_id
  ON form_question_options (question_id);

CREATE INDEX IF NOT EXISTS idx_form_signatories_form_id
  ON form_signatories (form_id);
