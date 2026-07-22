import { GitSyncService } from "../services/git-sync.service.js";

async function main(): Promise<void> {
  const gitSyncService = new GitSyncService();

  await gitSyncService.synchronize();

  console.error(
    `[Teste] Wiki disponível em: ${gitSyncService.getLocalPath()}`
  );
}

main().catch((error: unknown) => {
  console.error("[Teste] Falha ao sincronizar a Wiki:", error);
  process.exitCode = 1;
});