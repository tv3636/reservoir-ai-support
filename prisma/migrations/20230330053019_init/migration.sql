-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "embedding" DECIMAL(65,30)[],
    "text" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "author_id" TEXT NOT NULL,
    "thread_id" TEXT,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apis" (
    "id" TEXT NOT NULL,
    "embedding" DECIMAL(65,30)[],
    "name" TEXT NOT NULL,
    "spec" JSONB NOT NULL,
    "version" INTEGER NOT NULL,

    CONSTRAINT "apis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "docs" (
    "id" TEXT NOT NULL,
    "embedding" DECIMAL(65,30)[],
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "docs_pkey" PRIMARY KEY ("id")
);
