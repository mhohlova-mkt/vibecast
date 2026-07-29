-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Home" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'home',
    "heroArticleId" TEXT,
    "heroMediaSrc" TEXT,
    "heroMediaKind" TEXT,
    "bannerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bannerHtml" TEXT NOT NULL DEFAULT '',
    "bannerImg" TEXT,
    "bannerLink" TEXT NOT NULL DEFAULT '',
    "promoKind" TEXT NOT NULL DEFAULT 'broadcast',
    "promoMediaSrc" TEXT,
    "promoMediaKind" TEXT,
    "promoLink" TEXT NOT NULL DEFAULT '',
    "learnPinOn" BOOLEAN NOT NULL DEFAULT false,
    "learnPinImg" TEXT,
    "learnPinTitle" TEXT NOT NULL DEFAULT '',
    "learnPinDesc" TEXT NOT NULL DEFAULT '',
    "learnPinLink" TEXT NOT NULL DEFAULT '',
    "homePromoId" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Home" ("bannerEnabled", "bannerHtml", "bannerImg", "bannerLink", "heroArticleId", "heroMediaKind", "heroMediaSrc", "homePromoId", "id", "learnPinDesc", "learnPinImg", "learnPinLink", "learnPinOn", "learnPinTitle", "updatedAt") SELECT "bannerEnabled", "bannerHtml", "bannerImg", "bannerLink", "heroArticleId", "heroMediaKind", "heroMediaSrc", "homePromoId", "id", "learnPinDesc", "learnPinImg", "learnPinLink", "learnPinOn", "learnPinTitle", "updatedAt" FROM "Home";
DROP TABLE "Home";
ALTER TABLE "new_Home" RENAME TO "Home";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
