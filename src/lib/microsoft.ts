type MicrosoftTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

type MicrosoftMeResponse = {
  mail?: string | null;
  userPrincipalName?: string | null;
};

type MicrosoftDriveResponse = {
  id: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function isMicrosoftConfigured() {
  return Boolean(
    process.env.MICROSOFT_CLIENT_ID &&
      process.env.MICROSOFT_CLIENT_SECRET &&
      process.env.MICROSOFT_REDIRECT_URI
  );
}

export function getMicrosoftConfig() {
  return {
    clientId: getRequiredEnv("MICROSOFT_CLIENT_ID"),
    clientSecret: getRequiredEnv("MICROSOFT_CLIENT_SECRET"),
    tenantId: process.env.MICROSOFT_TENANT_ID || "common",
    redirectUri: getRequiredEnv("MICROSOFT_REDIRECT_URI"),
  };
}

export function getMicrosoftScopes() {
  return ["offline_access", "openid", "profile", "User.Read", "Files.ReadWrite.All"];
}

export function buildMicrosoftAuthUrl(state: string) {
  const config = getMicrosoftConfig();
  const url = new URL(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", getMicrosoftScopes().join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeMicrosoftCodeForToken(code: string) {
  const config = getMicrosoftConfig();
  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error("Unable to exchange Microsoft authorization code");
  }

  return (await response.json()) as MicrosoftTokenResponse;
}

export async function fetchMicrosoftProfile(accessToken: string) {
  const [meResponse, driveResponse] = await Promise.all([
    fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch("https://graph.microsoft.com/v1.0/me/drive", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ]);

  if (!meResponse.ok || !driveResponse.ok) {
    throw new Error("Unable to load Microsoft profile");
  }

  const me = (await meResponse.json()) as MicrosoftMeResponse;
  const drive = (await driveResponse.json()) as MicrosoftDriveResponse;

  return {
    email: me.mail || me.userPrincipalName || null,
    driveId: drive.id,
  };
}
