import "dotenv/config";

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Variável de ambiente obrigatória não definida: ${name}`);
  }

  return value;
}

function getPositiveNumberEnvironmentVariable(
  name: string,
  defaultValue: number
): number {
  const rawValue = process.env[name];

  if (!rawValue) {
    return defaultValue;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(
      `A variável ${name} deve possuir um número positivo. Valor recebido: ${rawValue}`
    );
  }

  return parsedValue;
}

export const env = {
  wiki: {
    repositoryUrl: getRequiredEnvironmentVariable("WIKI_REPOSITORY_URL"),
    localPath: getRequiredEnvironmentVariable("WIKI_LOCAL_PATH"),
    branch: process.env.WIKI_BRANCH ?? "main",
    syncIntervalMs: getPositiveNumberEnvironmentVariable(
      "WIKI_SYNC_INTERVAL_MS",
      3_600_000
    )
  }
};
