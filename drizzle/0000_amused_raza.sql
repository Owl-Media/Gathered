CREATE TYPE "public"."actor_type" AS ENUM('guest', 'organiser', 'superadmin', 'system');--> statement-breakpoint
CREATE TYPE "public"."response_source" AS ENUM('not_responded', 'guest_submitted', 'organiser_edited');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('not_responded', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('organiser', 'superadmin');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" uuid,
	"event_type" text NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"metadata" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organiser_id" uuid NOT NULL,
	"public_slug" text NOT NULL,
	"name" text NOT NULL,
	"event_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"timezone" text NOT NULL,
	"location_name" text NOT NULL,
	"location_address" text NOT NULL,
	"description" text,
	"rsvp_deadline_at" timestamp with time zone NOT NULL,
	"header_image_id" uuid,
	"profile_image_id" uuid,
	"placeholder_theme" text DEFAULT 'clouds' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"forename" text NOT NULL,
	"surname" text NOT NULL,
	"email" text NOT NULL,
	"rsvp_token_lookup" text NOT NULL,
	"rsvp_token_sealed" text NOT NULL,
	"rsvp_status" "rsvp_status" DEFAULT 'not_responded' NOT NULL,
	"response_source" "response_source" DEFAULT 'not_responded' NOT NULL,
	"dietary_requirements" text,
	"guest_message" text,
	"organiser_note" text,
	"last_response_at" timestamp with time zone,
	"last_edited_by_user_id" uuid,
	"removed_at" timestamp with time zone,
	"invitation_sent_at" timestamp with time zone,
	"invitation_last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"dietary_label" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"course_name_snapshot" text NOT NULL,
	"option_name_snapshot" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"storage_driver" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'organiser' NOT NULL,
	"disabled_at" timestamp with time zone,
	"disabled_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organiser_id_users_id_fk" FOREIGN KEY ("organiser_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_header_image_id_uploads_id_fk" FOREIGN KEY ("header_image_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_profile_image_id_uploads_id_fk" FOREIGN KEY ("profile_image_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_last_edited_by_user_id_users_id_fk" FOREIGN KEY ("last_edited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_courses" ADD CONSTRAINT "menu_courses_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_options" ADD CONSTRAINT "menu_options_course_id_menu_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."menu_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_selections" ADD CONSTRAINT "menu_selections_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_selections" ADD CONSTRAINT "menu_selections_course_id_menu_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."menu_courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_selections" ADD CONSTRAINT "menu_selections_option_id_menu_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."menu_options"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_occurred_idx" ON "audit_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_public_slug_unique" ON "events" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "events_organiser_idx" ON "events" USING btree ("organiser_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guests_rsvp_token_lookup_unique" ON "guests" USING btree ("rsvp_token_lookup");--> statement-breakpoint
CREATE UNIQUE INDEX "guests_event_email_active_unique" ON "guests" USING btree ("event_id","email") WHERE "guests"."removed_at" is null;--> statement-breakpoint
CREATE INDEX "guests_event_idx" ON "guests" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "menu_courses_event_idx" ON "menu_courses" USING btree ("event_id","display_order");--> statement-breakpoint
CREATE INDEX "menu_options_course_idx" ON "menu_options" USING btree ("course_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_selections_guest_course_unique" ON "menu_selections" USING btree ("guest_id","course_id");--> statement-breakpoint
CREATE INDEX "menu_selections_option_idx" ON "menu_selections" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "password_reset_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "uploads_owner_idx" ON "uploads" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");