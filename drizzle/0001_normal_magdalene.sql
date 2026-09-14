CREATE TABLE `payout_disbursements` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`buyerId` text,
	`teamId` text,
	`amount` integer NOT NULL,
	`occurredAt` text NOT NULL,
	`method` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`actor` text NOT NULL,
	`createdAt` text NOT NULL,
	`reversalOf` text,
	FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`buyerId`) REFERENCES `buyers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "payout_amount" CHECK("payout_disbursements"."amount" != 0),
	CONSTRAINT "one_payee" CHECK(("payout_disbursements"."buyerId" IS NOT NULL AND "payout_disbursements"."teamId" IS NULL) OR ("payout_disbursements"."buyerId" IS NULL AND "payout_disbursements"."teamId" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `idx_disbursements_event` ON `payout_disbursements` (`eventId`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_disbursement_reversal` ON `payout_disbursements` (`reversalOf`);--> statement-breakpoint
CREATE TABLE `settlement_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`buyerId` text NOT NULL,
	`amount` integer NOT NULL,
	`occurredAt` text NOT NULL,
	`method` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`actor` text NOT NULL,
	`createdAt` text NOT NULL,
	`reversalOf` text,
	FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`buyerId`) REFERENCES `buyers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "payment_amount" CHECK("settlement_payments"."amount" != 0)
);
--> statement-breakpoint
CREATE INDEX `idx_payments_event_buyer` ON `settlement_payments` (`eventId`,`buyerId`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_payment_reversal` ON `settlement_payments` (`reversalOf`);