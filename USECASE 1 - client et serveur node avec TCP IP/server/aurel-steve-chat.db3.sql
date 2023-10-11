BEGIN TRANSACTION;
DROP TABLE IF EXISTS "users";
CREATE TABLE IF NOT EXISTS "users" (
	"id"	INTEGER NOT NULL,
	"username"	TEXT NOT NULL UNIQUE,
	"password"	TEXT NOT NULL DEFAULT '',
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "groups";
CREATE TABLE IF NOT EXISTS "groups" (
	"id"	INTEGER NOT NULL,
	"groupname"	TEXT NOT NULL UNIQUE,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "sentMessages";
CREATE TABLE IF NOT EXISTS "sentMessages" (
	"id"	INTEGER NOT NULL,
	"from"	TEXT,
	"to"	TEXT,
	"dest"	TEXT,
	"group"	TEXT,
	"msg"	TEXT,
	"action"	TEXT,
	"reason"	TEXT,
	"time"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "groups_users";
CREATE TABLE IF NOT EXISTS "groups_users" (
	"id"	INTEGER NOT NULL,
	"groupname"	TEXT NOT NULL,
	"username"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT),
	CONSTRAINT "fk_groupname" FOREIGN KEY("groupname") REFERENCES "groups"("groupname"),
	CONSTRAINT "fk_username" FOREIGN KEY("username") REFERENCES "users"("username"),
	UNIQUE("groupname","username")
);
DROP TABLE IF EXISTS "bans";
CREATE TABLE IF NOT EXISTS "bans" (
	"id"	INTEGER NOT NULL,
	"groupname"	TEXT NOT NULL,
	"username"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT),
	CONSTRAINT "fk_groupname" FOREIGN KEY("groupname") REFERENCES "groups"("groupname"),
	CONSTRAINT "fk_username" FOREIGN KEY("username") REFERENCES "users"("username"),
	UNIQUE("groupname","username")
);
INSERT INTO "users" VALUES (1,'Aurel','');
INSERT INTO "users" VALUES (2,'Sigala','');
INSERT INTO "users" VALUES (3,'Alfred','');
INSERT INTO "users" VALUES (4,'Bertrand','');
INSERT INTO "users" VALUES (6,'Boris','$2b$10$PPG4Wg4vuENJ4VrkYa3X5.hbYBuGP0MyInsWqG/DXcTVFovILyqdG');
INSERT INTO "users" VALUES (7,'XYZ','$2b$10$js0Bp5gU3YAIh4JeT6ZP.eTUg8vemOwhQciEF3c0C9Y7R.eRtYx9a');
INSERT INTO "users" VALUES (8,'Robert','$2b$10$Xl94CO54m1Qh2mDfop89EOyD8ZcF7nveFxj7kTGAPXPf/0LbnMpgy');
INSERT INTO "users" VALUES (9,'David','$2b$10$2IZPfVfbLL9iO/1W0tnrUeJOGY9BxrqPM7liFS2CllPw3Qp58qtTS');
INSERT INTO "groups" VALUES (1,'reseau');
INSERT INTO "groups" VALUES (2,'maison1');
INSERT INTO "groups" VALUES (3,'aurel');
INSERT INTO "groups" VALUES (4,'maiosn');
INSERT INTO "groups" VALUES (5,'maison');
INSERT INTO "groups" VALUES (6,'Fans de foot');
INSERT INTO "groups" VALUES (7,'GGA');
INSERT INTO "sentMessages" VALUES (1,'Aurel','','','','Bonjour à tous!','server-broadcast','',NULL);
INSERT INTO "sentMessages" VALUES (2,'Alfred','Aurel','','','Salut M. Aurel','server-send','',NULL);
INSERT INTO "sentMessages" VALUES (3,'Aurel','Alfred','','','Bonjour jeune homme','server-send','',NULL);
INSERT INTO "sentMessages" VALUES (4,'Aurel','','','reseau','Bonjour le groupe!','gbroadcast','',NULL);
INSERT INTO "sentMessages" VALUES (5,'Sigala','','','reseau','Bonjour ici.','gbroadcast','',NULL);
INSERT INTO "sentMessages" VALUES (6,'Aurel','Sigala','','','Bonjour Scammer!','server-send','','2022-11-16 09:27:10');
INSERT INTO "sentMessages" VALUES (7,'Aurel','','','reseau','Bonjour ldsjdj/dqkfh','gbroadcast','','2022-11-16 11:29:59');
INSERT INTO "sentMessages" VALUES (8,'Aurel','','','reseau','Hi','gbroadcast','','2022-11-16 12:07:43');
INSERT INTO "sentMessages" VALUES (9,'Aurel','','','maison','Bonjour dans le groupe!','gbroadcast','','2022-11-16 12:14:44');
INSERT INTO "sentMessages" VALUES (10,'Alfred','','','maison','Salut à toi boss;','gbroadcast','','2022-11-16 12:14:55');
INSERT INTO "sentMessages" VALUES (12,'Aurel','','','reseau','Bonjour dans le groupe réseau','gbroadcast','','2022-11-16 12:48:17');
INSERT INTO "sentMessages" VALUES (13,'Aurel','','','reseau','ça va ici?','gbroadcast','','2022-11-16 12:48:25');
INSERT INTO "sentMessages" VALUES (17,'Aurel','','Alfred','reseau','','kick','Pour rien','2022-11-16 12:50:37');
INSERT INTO "sentMessages" VALUES (19,'Bertrand','','','reseau','','join','','2022-11-16 12:51:08');
INSERT INTO "sentMessages" VALUES (22,'Bertrand','','','reseau','Salut Je viens d''arriver','gbroadcast','','2022-11-16 12:58:00');
INSERT INTO "sentMessages" VALUES (23,'Bertrand','','','reseau','Je m''appelle Bertrand','gbroadcast','','2022-11-16 12:58:10');
INSERT INTO "sentMessages" VALUES (24,'Robert','','','reseau','','join','','2022-11-16 12:58:31');
INSERT INTO "sentMessages" VALUES (25,'Robert','','','maison','','join','','2022-11-16 17:02:29');
INSERT INTO "sentMessages" VALUES (26,'Aurel','','Alfred','reseau','','invite','','2022-11-16 17:23:16');
INSERT INTO "sentMessages" VALUES (27,'Alfred','','','reseau','Bonjour et merci pour l''ajout.','gbroadcast','','2022-11-16 17:23:36');
INSERT INTO "sentMessages" VALUES (28,'Aurel','','','reseau','Je t''en prie','gbroadcast','','2022-11-16 17:23:55');
INSERT INTO "sentMessages" VALUES (29,'Aurel','','','Fans de foot','','cgroup','','2022-11-20 16:41:35');
INSERT INTO "sentMessages" VALUES (30,'Aurel','','Robert','Fans de foot','','invite','','2022-11-20 16:43:48');
INSERT INTO "sentMessages" VALUES (31,'Aurel','','','Fans de foot','Bonjour ici.','gbroadcast','','2022-11-20 16:48:11');
INSERT INTO "sentMessages" VALUES (32,'Aurel','','','Fans de foot','Ceci est un groupe pour les fans de football.','gbroadcast','','2022-11-20 16:48:32');
INSERT INTO "sentMessages" VALUES (33,'Sigala','','','Fans de foot','','join','','2022-11-20 16:49:43');
INSERT INTO "sentMessages" VALUES (34,'Sigala','','','GGA','','cgroup','','2023-01-07 02:22:14');
INSERT INTO "sentMessages" VALUES (35,'Sigala','','Aurel','GGA','','invite','','2023-01-07 02:22:42');
INSERT INTO "sentMessages" VALUES (36,'Sigala','','Alfred','GGA','','invite','','2023-01-07 02:22:59');
INSERT INTO "sentMessages" VALUES (37,'Alfred','','Sigala','GGA','','ban','essai ban 1','2023-01-07 02:23:23');
INSERT INTO "sentMessages" VALUES (38,'Alfred','','Aurel','GGA','','kick','kick numéro 1','2023-01-07 02:24:52');
INSERT INTO "sentMessages" VALUES (39,'Aurel','','','GGA','','join','','2023-01-07 02:25:20');
INSERT INTO "sentMessages" VALUES (40,'Alfred','','Sigala','GGA','','unban','','2023-01-07 02:27:21');
INSERT INTO "sentMessages" VALUES (41,'Sigala','','','GGA','','join','','2023-01-07 02:29:58');
INSERT INTO "sentMessages" VALUES (42,'Sigala','','Aurel','GGA','','ban','ban 2','2023-01-07 02:30:31');
INSERT INTO "sentMessages" VALUES (43,'Alfred','','Aurel','GGA','','unban','','2023-01-07 02:33:01');
INSERT INTO "sentMessages" VALUES (44,'Sigala','','Aurel','GGA','','invite','','2023-01-07 02:33:45');
INSERT INTO "groups_users" VALUES (4,'reseau','Aurel');
INSERT INTO "groups_users" VALUES (6,'maiosn','Alfred');
INSERT INTO "groups_users" VALUES (7,'maison','Alfred');
INSERT INTO "groups_users" VALUES (8,'maison','Aurel');
INSERT INTO "groups_users" VALUES (9,'maison','Bertrand');
INSERT INTO "groups_users" VALUES (10,'reseau','Bertrand');
INSERT INTO "groups_users" VALUES (11,'reseau','Robert');
INSERT INTO "groups_users" VALUES (12,'maison','Robert');
INSERT INTO "groups_users" VALUES (13,'reseau','Alfred');
INSERT INTO "groups_users" VALUES (14,'Fans de foot','Aurel');
INSERT INTO "groups_users" VALUES (15,'Fans de foot','Robert');
INSERT INTO "groups_users" VALUES (16,'Fans de foot','Sigala');
INSERT INTO "groups_users" VALUES (19,'GGA','Alfred');
INSERT INTO "groups_users" VALUES (21,'GGA','Sigala');
INSERT INTO "groups_users" VALUES (22,'GGA','Aurel');
COMMIT;
