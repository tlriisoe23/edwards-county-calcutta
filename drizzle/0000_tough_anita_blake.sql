CREATE TABLE `auction_state` (
	`eventId` text PRIMARY KEY NOT NULL,
	`teamId` text,
	`bid` integer DEFAULT 0 NOT NULL,
	`buyerId` text,
	`startedAt` text,
	`paused` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`buyerId`) REFERENCES `buyers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "bid_nonnegative" CHECK("auction_state"."bid" >= 0)
);
--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`recordId` text,
	`before` text,
	`after` text,
	`createdAt` text NOT NULL,
	`undone` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_audit_event_time` ON `audit` (`eventId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `buyers` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`name` text NOT NULL,
	`group` text DEFAULT '' NOT NULL,
	`contact` text DEFAULT '' NOT NULL,
	`privateNotes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_buyer_event_name` ON `buyers` (`eventId`,`name`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`calcuttaName` text NOT NULL,
	`course` text NOT NULL,
	`dates` text DEFAULT '' NOT NULL,
	`auctionAt` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'SETUP' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`rules` text DEFAULT '' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`settings` text NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`boardRevision` integer DEFAULT 0 NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `flights` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`name` text NOT NULL,
	`order` integer NOT NULL,
	`color` text DEFAULT '#b69b60' NOT NULL,
	`ownPool` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_flights_event` ON `flights` (`eventId`);--> statement-breakpoint
CREATE TABLE `mutation_guards` (
	`id` text PRIMARY KEY NOT NULL,
	`ok` integer NOT NULL,
	CONSTRAINT "revision_must_match" CHECK("mutation_guards"."ok"=1)
);
--> statement-breakpoint
CREATE TABLE `operators` (
	`email` text PRIMARY KEY NOT NULL,
	`addedBy` text NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ownership` (
	`id` text PRIMARY KEY NOT NULL,
	`saleId` text NOT NULL,
	`party` text NOT NULL,
	`percent` integer NOT NULL,
	`consideration` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`kind` text NOT NULL,
	FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ownership_range" CHECK("ownership"."percent" between 0 and 10000)
);
--> statement-breakpoint
CREATE INDEX `idx_ownership_sale` ON `ownership` (`saleId`);--> statement-breakpoint
CREATE TABLE `payout_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`poolId` text NOT NULL,
	`place` integer NOT NULL,
	`percent` integer NOT NULL,
	FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payout_pool_place` ON `payout_rules` (`eventId`,`poolId`,`place`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`name` text NOT NULL,
	`order` integer NOT NULL,
	FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_players_team` ON `players` (`teamId`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`teamId` text NOT NULL,
	`buyerId` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`createdAt` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`buyerId`) REFERENCES `buyers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sale_amount_positive" CHECK("sales"."amount">0)
);
--> statement-breakpoint
CREATE INDEX `idx_sales_event_status` ON `sales` (`eventId`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_sale_per_team` ON `sales` (`teamId`) WHERE "sales"."status" = 'ACTIVE';--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`flightId` text NOT NULL,
	`name` text NOT NULL,
	`handicap` real,
	`seed` integer,
	`notes` text DEFAULT '' NOT NULL,
	`privateNotes` text DEFAULT '' NOT NULL,
	`order` integer NOT NULL,
	`status` text DEFAULT 'UPCOMING' NOT NULL,
	`finish` integer,
	FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`flightId`) REFERENCES `flights`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "team_status" CHECK("teams"."status" in ('UPCOMING','ON_BLOCK','SOLD','UNSOLD','WITHDRAWN'))
);
--> statement-breakpoint
CREATE INDEX `idx_teams_event_order` ON `teams` (`eventId`,`order`);