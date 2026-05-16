import {
	pgTable,
	index,
	check,
	uuid,
	varchar,
	text,
	jsonb,
	timestamp,
	date,
	unique,
	integer,
	boolean,
  } from "drizzle-orm/pg-core";
  import { sql } from "drizzle-orm";
  import { relations } from "drizzle-orm/relations";
  
  /**
   * Notes:
   * - case_type values: 'SOC' | 'DEFENCE'
   * - party_role values: 'plaintiff' | 'defendant'
   * - file processing_status values: 'pending' | 'processing' | 'failed' | 'completed'
   * - analysis_type values: 'soc' | 'defence' (keeps it extensible)
   *
   * Naming conventions: snake_case DB column names are used where you originally had them,
   * but Drizzle column identifiers keep camelCase for easier TS usage.
   */
  
  /* ---------------------------
	 Core: cases
	 --------------------------- */
  export const cases = pgTable(
	"cases",
	{
	  id: uuid("id").defaultRandom().primaryKey().notNull(), // caseId
	  userId: uuid("user_id").notNull(), // owner (we don't create users table per your note)
	  title: text("title").notNull(),
	  summary: text("summary"), // optional background
	  caseType: varchar("case_type", { length: 20 }).notNull(), // 'SOC' | 'DEFENCE'
	  court: varchar("court", { length: 20 }),
	  caseNumber: varchar("case_number", { length: 20 }),
	  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
	  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
	},
	(table) => [
	  index("idx_cases_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	  index("idx_cases_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	  check(
		"cases_case_type_check",
		sql`(case_type)::text = ANY ((ARRAY['SOC'::character varying, 'DEFENCE'::character varying])::text[])`
	  ),
	]
  );
  
  /* ---------------------------
	 Normalized parties table: plaintiffs & defendants
	 - we store each party as a row with role
	 --------------------------- */
	 export const caseParties = pgTable(
		"case_parties",
		{
		  id: uuid("id").defaultRandom().primaryKey().notNull(),
		  caseId: uuid("case_id").notNull(),
		  name: text("name").notNull(),
		  chineseName: text("chinese_name"),
		  role: varchar("role", { length: 20 }).notNull(), // 'plaintiff' | 'defendant'
		  type: varchar("type", { length: 20 }).default("person").notNull(), // 'person' | 'company'
		  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
		},
		(table) => [
		  index("idx_case_parties_case_id").using("btree", table.caseId.asc().nullsLast().op("uuid_ops")),
		  index("idx_case_parties_role").using("btree", table.role.asc().nullsLast().op("text_ops")),
		  index("idx_case_parties_type").using("btree", table.type.asc().nullsLast().op("text_ops")),
		  check(
			"case_parties_role_check",
			sql`(role)::text = ANY ((ARRAY['plaintiff'::character varying, 'defendant'::character varying])::text[])`
		  ),
		  check(
			"case_parties_type_check",
			sql`(type)::text = ANY ((ARRAY['person'::character varying, 'company'::character varying])::text[])`
		  ),
		]
	  );
	  
  
  /* ---------------------------
	 Files
	 --------------------------- */
  export const files = pgTable(
	"files",
	{
	  id: uuid("id").defaultRandom().primaryKey().notNull(), // file_id
	  caseId: uuid("case_id").notNull(),
	  type: varchar("type", { length: 100 }).notNull(), // evidence/type
	  fileName: varchar("file_name", { length: 255 }).notNull(),
	  fileKey: varchar("file_key", { length: 512 }).notNull(), // digitalocean key / key in object store
	  processingStatus: varchar("processing_status", { length: 50 }).default("pending").notNull(),
	  ocrData: text("ocr_data"), // can be null
	  errorMessage: text("error_message"),
	  summary: text("summary"),
	  entities: jsonb("entities"),
	  documentDate: date("document_date"),
	  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
	  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
	},
	(table) => [
	  index("idx_files_case_id").using("btree", table.caseId.asc().nullsLast().op("uuid_ops")),
	  index("idx_files_processing_status").using("btree", table.processingStatus.asc().nullsLast().op("text_ops")),
	  index("idx_files_document_date").using("btree", table.documentDate.asc().nullsLast()),
	  check(
		"files_processing_status_check",
		sql`(processing_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])`
	  ),
	]
  );
  
  /* ---------------------------
	 Generic analyses table
	 - one or more analysis types per case in future. For now: allow one analysis per case per analysis_type.
	 - unique(case_id, analysis_type) enforces one analysis per type per case.
	 --------------------------- */
  export const caseAnalyses = pgTable(
	"case_analyses",
	{
	  id: uuid("id").defaultRandom().primaryKey().notNull(),
	  caseId: uuid("case_id").notNull(),
	  analysisType: varchar("analysis_type", { length: 50 }).notNull(), // 'soc' | 'defence' | etc
	  // store generic analysis metadata (path to full result, status, etc) if needed:
	  analysisStatus: varchar("analysis_status", { length: 50 }).default("pending").notNull(),
	  resultPath: varchar("result_path", { length: 500 }),
	  errorMessage: text("error_message"),
	  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
	  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
	},
	(table) => [
	  index("idx_case_analyses_case_id").using("btree", table.caseId.asc().nullsLast().op("uuid_ops")),
	  index("idx_case_analyses_analysis_type").using("btree", table.analysisType.asc().nullsLast().op("text_ops")),
	  check(
		"case_analyses_analysis_type_check",
		sql`(analysis_type)::text = ANY ((ARRAY['soc'::character varying, 'defence'::character varying])::text[])`
	  ),
	  check(
		"case_analyses_analysis_status_check",
		sql`(analysis_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])`
	  ),
	  unique("uniq_case_analysis_per_type").on(table.caseId, table.analysisType),
	]
  );
  
  /* ---------------------------
	 SOC-specific analysis details
	 - one-to-one with a case_analyses row of type 'soc'
	 - name requested: I'll call it `soc_analyses` (you can rename if you prefer)
	 --------------------------- */
  export const socAnalyses = pgTable(
	"soc_analyses",
	{
	  id: uuid("id").defaultRandom().primaryKey().notNull(),
	  caseAnalysisId: uuid("case_analysis_id").notNull(), // references case_analyses.id
	  allFileOcr: text("all_file_ocr"),
	  particularsJson: jsonb("particulars_json"),
	  chronologyJson: jsonb("chronology_json"),
	  writOfSummons: text("writ_of_summons"),
	  statementOfClaim: text("statement_of_claim"),
	  statementOfDamages: text("statement_of_damages"),
	  preActionLetter: text("pre_action_letter"),
	  witnessStatement: text("witness_statement"),
	  witnessStatementChinese: text("witness_statement_chinese"),
	  particularsMarkdown: text("particulars_markdown"),
	  chronologyMarkdown: text("chronology_markdown"),
	  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
	  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
	},
	(table) => [
	  index("idx_soc_analyses_case_analysis_id").using("btree", table.caseAnalysisId.asc().nullsLast().op("uuid_ops")),
	  unique("uniq_soc_by_case_analysis").on(table.caseAnalysisId),
	]
  );
  
  /* ---------------------------
	 Case Evidence Types
	 - Each case has its own copy of evidence types (default + custom)
	 --------------------------- */
  export const caseEvidenceTypes = pgTable(
	"case_evidence_types",
	{
	  id: uuid("id").defaultRandom().primaryKey().notNull(),
	  caseId: uuid("case_id").notNull(),
	  key: varchar("key", { length: 100 }).notNull(),
	  title: text("title").notNull(),
	  description: text("description"),
	  isDefault: boolean("is_default").default(true).notNull(),
	  displayOrder: integer("display_order").notNull(),
	  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
	},
	(table) => [
	  index("idx_case_evidence_types_case_id").using("btree", table.caseId.asc().nullsLast().op("uuid_ops")),
	  index("idx_case_evidence_types_key").using("btree", table.key.asc().nullsLast().op("text_ops")),
	  index("idx_case_evidence_types_display_order").using("btree", table.displayOrder.asc().nullsLast()),
	]
  );

  /* ---------------------------
	 Foreign keys & relations using Drizzle's relations() below
	 (We declare the relational objects that Drizzle can use)
	 --------------------------- */
  
  /* NOTE: Drizzle's pgTable allows foreign keys during migrations; for clarity we'll
	 rely on relations() to declare associations for use in TS queries.
	 If you use migrations (e.g. with drizzle-kit), ensure the migration SQL also includes
	 the FK constraints (I can provide migration SQL if you want). */
  
  /* ---------------------------
	 Relations
	 --------------------------- */
  
  export const casesRelations = relations(cases, ({ many }) => ({
	parties: many(caseParties),
	files: many(files),
	analyses: many(caseAnalyses),
	evidenceTypes: many(caseEvidenceTypes),
  }));
  
  export const casePartiesRelations = relations(caseParties, ({ one }) => ({
	case: one(cases, {
	  fields: [caseParties.caseId],
	  references: [cases.id],
	}),
  }));
  
  export const filesRelations = relations(files, ({ one }) => ({
	case: one(cases, {
	  fields: [files.caseId],
	  references: [cases.id],
	}),
  }));
  
  export const caseAnalysesRelations = relations(caseAnalyses, ({ one, many }) => ({
	case: one(cases, {
	  fields: [caseAnalyses.caseId],
	  references: [cases.id],
	}),
	socDetails: one(socAnalyses, {
	  fields: [caseAnalyses.id],
	  references: [socAnalyses.caseAnalysisId],
	}),
  }));
  
  export const socAnalysesRelations = relations(socAnalyses, ({ one }) => ({
	analysis: one(caseAnalyses, {
	  fields: [socAnalyses.caseAnalysisId],
	  references: [caseAnalyses.id],
	}),
  }));

  export const caseEvidenceTypesRelations = relations(caseEvidenceTypes, ({ one }) => ({
	case: one(cases, {
	  fields: [caseEvidenceTypes.caseId],
	  references: [cases.id],
	}),
  }));
  