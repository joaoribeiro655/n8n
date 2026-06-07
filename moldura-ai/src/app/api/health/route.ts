import { NextResponse } from "next/server";

// Lightweight diagnostic: shows whether the database and Blob storage are
// configured in the running deployment (booleans only — never the secrets).
export async function GET() {
  const hasDb = Boolean(
    process.env.DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL_UNPOOLED,
  );
  const hasBlob = Object.keys(process.env).some((k) =>
    k.endsWith("BLOB_READ_WRITE_TOKEN"),
  );
  const hasAuthSecret = Boolean(process.env.AUTH_SECRET);

  return NextResponse.json({
    ok: hasDb && hasBlob && hasAuthSecret,
    database: hasDb,
    blobStorage: hasBlob,
    authSecret: hasAuthSecret,
    onVercel: Boolean(process.env.VERCEL),
  });
}
