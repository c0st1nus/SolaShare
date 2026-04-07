ALTER TABLE "assets" ADD COLUMN "is_publicly_visible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "assets_is_publicly_visible_idx" ON "assets" USING btree ("is_publicly_visible");
