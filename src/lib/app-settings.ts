import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";

const SINGLETON_ID = "singleton";

export interface DefaultJiraCredentials {
  email: string;
  apiTokenEnc: string;
}

/** Reads the remembered Jira credentials, if any have been saved yet. */
export async function getDefaultJiraCredentials(): Promise<DefaultJiraCredentials | null> {
  const settings = await prisma.appSetting.findUnique({ where: { id: SINGLETON_ID } });
  if (!settings?.defaultJiraEmail || !settings.defaultJiraApiTokenEnc) return null;
  return { email: settings.defaultJiraEmail, apiTokenEnc: settings.defaultJiraApiTokenEnc };
}

/** Remembers Jira credentials so future project registrations don't need to retype them. */
export async function saveDefaultJiraCredentials(email: string, apiToken: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { id: SINGLETON_ID },
    update: { defaultJiraEmail: email, defaultJiraApiTokenEnc: encryptSecret(apiToken) },
    create: {
      id: SINGLETON_ID,
      defaultJiraEmail: email,
      defaultJiraApiTokenEnc: encryptSecret(apiToken),
    },
  });
}
