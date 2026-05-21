CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

INSERT INTO "Category" ("id", "name", "sortOrder", "createdAt", "updatedAt")
SELECT
    'cat_' || md5(category_name),
    category_name,
    ROW_NUMBER() OVER (ORDER BY category_name) - 1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT COALESCE(NULLIF(TRIM("category"), ''), 'Lainnya') AS category_name
    FROM "Product"
) AS existing_categories;

INSERT INTO "Category" ("id", "name", "sortOrder", "createdAt", "updatedAt")
SELECT 'cat_' || md5(name), name, sort_order, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
    VALUES
        ('Makanan', 1),
        ('Minuman', 2),
        ('Snack', 3),
        ('Paket', 4)
) AS defaults(name, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM "Category" WHERE "Category"."name" = defaults.name
);

ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;

UPDATE "Product"
SET "categoryId" = "Category"."id"
FROM "Category"
WHERE "Category"."name" = COALESCE(NULLIF(TRIM("Product"."category"), ''), 'Lainnya');

ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;

ALTER TABLE "Product" DROP COLUMN "category";

ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
