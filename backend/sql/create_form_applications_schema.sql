CREATE TABLE IF NOT EXISTS form_applications (
  application_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(form_id) ON DELETE RESTRICT,
  applicant_id uuid REFERENCES users(user_id) ON DELETE SET NULL,
  application_status character varying(30) NOT NULL DEFAULT 'draft',
  research_title text NOT NULL,
  google_drive_link text,
  reference_no character varying(50) UNIQUE,
  form_name_snapshot character varying(255) NOT NULL,
  form_snapshot jsonb NOT NULL,
  submitted_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_form_applications_status CHECK (
    application_status IN (
      'draft',
      'submitted',
      'under_review',
      'approved',
      'rejected',
      'cancelled'
    )
  )
);

ALTER TABLE IF EXISTS form_applications
  ADD COLUMN IF NOT EXISTS research_title text;

ALTER TABLE IF EXISTS form_applications
  ADD COLUMN IF NOT EXISTS google_drive_link text;

CREATE TABLE IF NOT EXISTS form_application_answers (
  application_answer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES form_applications(application_id) ON DELETE CASCADE,
  question_id uuid REFERENCES form_questions(question_id) ON DELETE SET NULL,
  section_id uuid REFERENCES form_sections(section_id) ON DELETE SET NULL,
  section_name_snapshot character varying(255) NOT NULL,
  question_text_snapshot text NOT NULL,
  question_type_snapshot character varying(50) NOT NULL,
  answer_text text,
  answer_number numeric(18, 4),
  answer_date date,
  answer_json jsonb,
  comment_text text,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_form_application_answers_type CHECK (
    question_type_snapshot IN (
      'RADIO',
      'CHECKBOX',
      'SELECT',
      'TEXT',
      'TEXTAREA',
      'NUMBER',
      'DATE'
    )
  )
);

CREATE TABLE IF NOT EXISTS form_application_answer_options (
  application_answer_option_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_answer_id uuid NOT NULL REFERENCES form_application_answers(application_answer_id) ON DELETE CASCADE,
  option_id uuid REFERENCES form_question_options(option_id) ON DELETE SET NULL,
  option_label_snapshot character varying(100) NOT NULL,
  option_value_snapshot character varying(100) NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS form_application_signatories (
  application_signatory_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES form_applications(application_id) ON DELETE CASCADE,
  signatory_id uuid REFERENCES form_signatories(signatory_id) ON DELETE SET NULL,
  position_name_snapshot character varying(255) NOT NULL,
  is_required boolean NOT NULL DEFAULT TRUE,
  signer_user_id uuid REFERENCES users(user_id) ON DELETE SET NULL,
  signatory_status character varying(30) NOT NULL DEFAULT 'pending',
  remarks text,
  signed_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_form_application_signatories_status CHECK (
    signatory_status IN (
      'pending',
      'signed',
      'rejected',
      'skipped'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_form_applications_form_id
  ON form_applications (form_id);

CREATE INDEX IF NOT EXISTS idx_form_applications_applicant_id
  ON form_applications (applicant_id);

CREATE INDEX IF NOT EXISTS idx_form_applications_status
  ON form_applications (application_status);

CREATE INDEX IF NOT EXISTS idx_form_applications_submitted_at
  ON form_applications (submitted_at);

CREATE INDEX IF NOT EXISTS idx_form_application_answers_application_id
  ON form_application_answers (application_id);

CREATE INDEX IF NOT EXISTS idx_form_application_answers_question_id
  ON form_application_answers (question_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_form_application_answers_application_question
  ON form_application_answers (application_id, question_id)
  WHERE question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_form_application_answer_options_answer_id
  ON form_application_answer_options (application_answer_id);

CREATE INDEX IF NOT EXISTS idx_form_application_signatories_application_id
  ON form_application_signatories (application_id);

CREATE INDEX IF NOT EXISTS idx_form_application_signatories_signer_user_id
  ON form_application_signatories (signer_user_id);
