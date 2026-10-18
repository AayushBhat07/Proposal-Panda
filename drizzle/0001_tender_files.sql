CREATE TABLE `tender_files` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`data` blob NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `tenders`(`id`) ON UPDATE no action ON DELETE cascade
);
