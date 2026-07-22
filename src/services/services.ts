import { GitSyncService } from "./git-sync.service.js";
import { WikiIndexService } from "./wiki-index.service.js";
import { WikiService } from "./wiki.service.js";

export const wikiService = new WikiService();

export const wikiIndexService =
  new WikiIndexService(wikiService);

export const gitSyncService =
  new GitSyncService();