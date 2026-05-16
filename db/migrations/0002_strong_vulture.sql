CREATE TABLE "case_evidence_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"key" varchar(100) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT true NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_case_evidence_types_case_id" ON "case_evidence_types" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_case_evidence_types_key" ON "case_evidence_types" USING btree ("key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_case_evidence_types_display_order" ON "case_evidence_types" USING btree ("display_order");--> statement-breakpoint
ALTER TABLE "case_evidence_types" ADD CONSTRAINT "case_evidence_types_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;