import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { testProviderLiveConnection } from "@/lib/services/providerStore";
import { decryptApiKey } from "@/lib/security/crypto";
import { prisma } from "@/lib/prisma";
import { checkDatabaseConnection } from "@/lib/services/store";
import { AIProvider } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    let providerType: AIProvider = body.providerType;
    let apiKey: string = body.apiKey;
    let model: string = body.model;
    const configId: string | undefined = body.configId;

    // If testing an existing saved configuration by id, decrypt its key server-side
    if (configId) {
      const dbConnected = await checkDatabaseConnection();
      let foundEncrypted: {
        providerType: string;
        model: string;
        encryptedApiKey: string;
        iv: string;
        authTag: string;
      } | null = null;

      if (dbConnected) {
        foundEncrypted = await prisma.aIProviderConfig.findFirst({
          where: { id: configId, userId: user.id },
          select: {
            providerType: true,
            model: true,
            encryptedApiKey: true,
            iv: true,
            authTag: true,
          },
        });
      }

      if (foundEncrypted) {
        providerType = foundEncrypted.providerType as AIProvider;
        model = model || foundEncrypted.model;
        apiKey = decryptApiKey(
          foundEncrypted.encryptedApiKey,
          foundEncrypted.iv,
          foundEncrypted.authTag
        );
      }
    }

    if (!providerType || !apiKey) {
      return NextResponse.json(
        { success: false, error: "Provider type and API key are required for connection test." },
        { status: 400 }
      );
    }

    // Perform REAL provider live test
    const testResult = await testProviderLiveConnection(providerType, apiKey, model);

    // If this was an existing saved config, update its test status in the database
    if (configId) {
      const dbConnected = await checkDatabaseConnection();
      if (dbConnected) {
        try {
          await prisma.aIProviderConfig.updateMany({
            where: { id: configId, userId: user.id },
            data: {
              lastTestedAt: new Date(),
              testStatus: testResult.success ? "verified" : "failed",
            },
          });
        } catch {
          // Ignore
        }
      }
    }

    return NextResponse.json(testResult);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Connection test failed.";
    return NextResponse.json(
      { success: false, latencyMs: 0, error: message },
      { status: 500 }
    );
  }
}
