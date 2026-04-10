-- CreateTable
CREATE TABLE "Account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatar" TEXT,
    "biography" TEXT,
    "phone_number" TEXT,
    "postal_address" TEXT,
    "resetToken" TEXT,
    "resetExpiryDate" DATETIME,
    "resetUsed" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "RegularAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "birthday" TEXT NOT NULL DEFAULT '1970-01-01',
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "lastActive" DATETIME,
    "resume" TEXT,
    CONSTRAINT "RegularAccount_id_fkey" FOREIGN KEY ("id") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BusinessAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "business_name" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "locationLong" REAL NOT NULL,
    "locationLat" REAL NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "BusinessAccount_id_fkey" FOREIGN KEY ("id") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    CONSTRAINT "AdminAccount_id_fkey" FOREIGN KEY ("id") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PositionType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "note" TEXT NOT NULL DEFAULT '',
    "document" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "user_id" INTEGER NOT NULL,
    "position_type_id" INTEGER NOT NULL,
    CONSTRAINT "Qualification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "RegularAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Qualification_position_type_id_fkey" FOREIGN KEY ("position_type_id") REFERENCES "PositionType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Job" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "salary_min" REAL NOT NULL,
    "salary_max" REAL NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "business_id" INTEGER NOT NULL,
    "position_type_id" INTEGER NOT NULL,
    "worker_id" INTEGER,
    CONSTRAINT "Job_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "BusinessAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Job_position_type_id_fkey" FOREIGN KEY ("position_type_id") REFERENCES "PositionType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "RegularAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobId" INTEGER NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "candidateInterested" BOOLEAN,
    "businessInterested" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Interest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Interest_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "RegularAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Negotiation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "interestId" INTEGER NOT NULL,
    "jobId" INTEGER NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "business_id" INTEGER NOT NULL,
    "candidateDecision" TEXT,
    "businessDecision" TEXT,
    CONSTRAINT "Negotiation_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Negotiation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Negotiation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "RegularAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Negotiation_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "BusinessAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_resetToken_key" ON "Account"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX "PositionType_name_key" ON "PositionType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_jobId_candidateId_key" ON "Interest"("jobId", "candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "Negotiation_interestId_key" ON "Negotiation"("interestId");

-- CreateIndex
CREATE UNIQUE INDEX "Negotiation_jobId_key" ON "Negotiation"("jobId");
