import "server-only";
import { google } from "googleapis";
import { Readable } from "stream";

// Integração com o Google Drive.
//
// Configuração (variáveis de ambiente):
//   GOOGLE_SERVICE_ACCOUNT_JSON  -> o JSON da conta de serviço (string), ou
//   GOOGLE_SERVICE_ACCOUNT_B64   -> o mesmo JSON em base64 (mais fácil na Vercel).
//   GDRIVE_ROOT_FOLDER_ID        -> id da pasta raiz onde ficam as pastas dos
//                                   clientes. Compartilhe essa pasta com o
//                                   e-mail da conta de serviço (permissão Editor).
//
// Estrutura criada: /<RAIZ>/<Cliente>/<Mês Ano>/arquivo.png
//
// Enquanto não estiver configurado, isDriveConfigured() retorna false e a arte
// fica só na plataforma (nada quebra).

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function isDriveConfigured(): boolean {
  return Boolean(
    (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_B64) &&
      process.env.GDRIVE_ROOT_FOLDER_ID,
  );
}

function credentials(): { client_email: string; private_key: string } {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_B64
    ? Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_B64, "base64").toString("utf8")
    : process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  const parsed = JSON.parse(raw);
  return { client_email: parsed.client_email, private_key: parsed.private_key };
}

function driveClient() {
  const { client_email, private_key } = credentials();
  const auth = new google.auth.JWT({
    email: client_email,
    key: private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

// Acha (ou cria) uma subpasta com determinado nome dentro de um pai.
async function ensureFolder(
  drive: ReturnType<typeof driveClient>,
  name: string,
  parentId: string,
): Promise<string> {
  const safeName = name.replace(/'/g, "\\'");
  const q = `mimeType='application/vnd.google-apps.folder' and name='${safeName}' and '${parentId}' in parents and trashed=false`;
  const found = await drive.files.list({ q, fields: "files(id)", pageSize: 1 });
  if (found.data.files && found.data.files.length > 0) {
    return found.data.files[0].id as string;
  }
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });
  return created.data.id as string;
}

export type DriveUploadResult = {
  fileId: string;
  url: string;
  clientFolderId: string;
};

/**
 * Sobe uma arte (a partir de uma URL de imagem) para
 * /<RAIZ>/<Cliente>/<Mês Ano>/ no Google Drive.
 *
 * Reaproveita a pasta do cliente quando `clientFolderId` é informado, evitando
 * recriá-la a cada subida.
 */
export async function uploadArtToDrive(opts: {
  clientName: string;
  clientFolderId?: string | null;
  date: Date;
  filename: string;
  imageUrl: string;
}): Promise<DriveUploadResult> {
  if (!isDriveConfigured()) throw new Error("Google Drive não configurado");

  const drive = driveClient();
  const root = process.env.GDRIVE_ROOT_FOLDER_ID as string;

  const clientFolderId = opts.clientFolderId || (await ensureFolder(drive, opts.clientName, root));
  const monthLabel = `${MONTHS_PT[opts.date.getMonth()]} ${opts.date.getFullYear()}`;
  const monthFolderId = await ensureFolder(drive, monthLabel, clientFolderId);

  // Baixa os bytes da imagem.
  const res = await fetch(opts.imageUrl);
  if (!res.ok) throw new Error(`Falha ao baixar a arte (${res.status})`);
  const contentType = res.headers.get("content-type") || "image/png";
  const buffer = Buffer.from(await res.arrayBuffer());

  const created = await drive.files.create({
    requestBody: { name: opts.filename, parents: [monthFolderId] },
    media: { mimeType: contentType, body: Readable.from(buffer) },
    fields: "id, webViewLink",
  });

  return {
    fileId: created.data.id as string,
    url: (created.data.webViewLink as string) || "",
    clientFolderId,
  };
}
