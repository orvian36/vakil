CREATE TABLE "case_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"analysis_type" varchar(50) NOT NULL,
	"analysis_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"result_path" varchar(500),
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uniq_case_analysis_per_type" UNIQUE("case_id","analysis_type"),
	CONSTRAINT "case_analyses_analysis_type_check" CHECK ((analysis_type)::text = ANY ((ARRAY['soc'::character varying, 'defence'::character varying])::text[])),
	CONSTRAINT "case_analyses_analysis_status_check" CHECK ((analysis_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "case_parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"name" text NOT NULL,
	"chinese_name" text,
	"role" varchar(20) NOT NULL,
	"type" varchar(20) DEFAULT 'person' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "case_parties_role_check" CHECK ((role)::text = ANY ((ARRAY['plaintiff'::character varying, 'defendant'::character varying])::text[])),
	CONSTRAINT "case_parties_type_check" CHECK ((type)::text = ANY ((ARRAY['person'::character varying, 'company'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"case_type" varchar(20) NOT NULL,
	"court" varchar(20),
	"case_number" varchar(20),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cases_case_type_check" CHECK ((case_type)::text = ANY ((ARRAY['SOC'::character varying, 'DEFENCE'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"type" varchar(100) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_key" varchar(512) NOT NULL,
	"processing_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"ocr_data" text,
	"error_message" text,
	"summary" text,
	"entities" jsonb,
	"document_date" date,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "files_processing_status_check" CHECK ((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "soc_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_analysis_id" uuid NOT NULL,
	"all_file_ocr" text,
	"particulars_json" jsonb,
	"chronology_json" jsonb,
	"statement_of_claim" text,
	"statement_of_damages" text,
	"pre_action_letter" text,
	"witness_statement" text,
	"particulars_markdown" text,
	"chronology_markdown" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uniq_soc_by_case_analysis" UNIQUE("case_analysis_id")
);
--> statement-breakpoint
CREATE INDEX "idx_case_analyses_case_id" ON "case_analyses" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_case_analyses_analysis_type" ON "case_analyses" USING btree ("analysis_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_case_parties_case_id" ON "case_parties" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_case_parties_role" ON "case_parties" USING btree ("role" text_ops);--> statement-breakpoint
CREATE INDEX "idx_case_parties_type" ON "case_parties" USING btree ("type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_cases_user_id" ON "cases" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_cases_created_at" ON "cases" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_files_case_id" ON "files" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_files_processing_status" ON "files" USING btree ("processing_status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_files_document_date" ON "files" USING btree ("document_date");--> statement-breakpoint
CREATE INDEX "idx_soc_analyses_case_analysis_id" ON "soc_analyses" USING btree ("case_analysis_id" uuid_ops);