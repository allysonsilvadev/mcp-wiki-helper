import { GitSyncService } from "./git-sync.service.js";
import { WikiChangesService } from "./wiki-changes.service.js";
import { WikiIndexService } from "./wiki-index.service.js";
import { WikiService } from "./wiki.service.js";
import { env } from "../config/env.js";

export const wikiService = new WikiService();

export const wikiIndexService =
  new WikiIndexService(wikiService);

export const wikiChangesService =
  new WikiChangesService(env.wiki.localPath, env.wiki.branch);

export const gitSyncService =
  new GitSyncService(wikiChangesService);
