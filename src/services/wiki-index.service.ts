import { WikiService } from "./wiki.service.js";

export interface IndexedDocument {
  path: string;
  content: string;
  normalizedContent: string;
  lines: string[];
}

export interface ContentSearchResult {
  document: string;
  score: number;
  matches: string[];
}

export class WikiIndexService {
  private readonly wikiService: WikiService;

  private documents = new Map<string, IndexedDocument>();

  private isBuilding = false;

  public constructor(wikiService = new WikiService()) {
    this.wikiService = wikiService;
  }

  public async rebuild(): Promise<void> {
    if (this.isBuilding) {
      console.warn(
        "[WikiIndexService] A reconstrução do índice já está em andamento."
      );

      return;
    }

    this.isBuilding = true;

    try {
      console.error(
        "[WikiIndexService] Construindo índice da Wiki..."
      );

      const documentPaths =
        await this.wikiService.listDocuments();

      const nextIndex =
        new Map<string, IndexedDocument>();

      for (const documentPath of documentPaths) {
        const content =
          await this.wikiService.readDocument(documentPath);

        nextIndex.set(documentPath, {
          path: documentPath,
          content,
          normalizedContent: content.toLowerCase(),
          lines: content.split(/\r?\n/),
        });
      }

      this.documents = nextIndex;

      console.error(
        `[WikiIndexService] Índice construído com ${this.documents.size} documentos.`
      );
    } finally {
      this.isBuilding = false;
    }
  }

  public size(): number {
    return this.documents.size;
  }

  public getDocument(
    documentPath: string
  ): IndexedDocument | undefined {
    return this.documents.get(documentPath);
  }

  public listDocuments(): string[] {
    return Array.from(this.documents.keys()).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
  }

  public searchContent(
    query: string,
    maximumResults = 10,
    maximumMatchesPerDocument = 5
  ): ContentSearchResult[] {
    const terms = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (terms.length === 0) {
      return [];
    }

    const results: ContentSearchResult[] = [];

    for (const document of this.documents.values()) {
      const matchedTerms = terms.filter((term) =>
        document.normalizedContent.includes(term)
      );

      if (matchedTerms.length === 0) {
        continue;
      }

      const matches = document.lines
        .map((line) => line.trim())
        .filter((line) => {
          if (line.length === 0) {
            return false;
          }

          const normalizedLine = line.toLowerCase();

          return terms.some((term) =>
            normalizedLine.includes(term)
          );
        })
        .slice(0, maximumMatchesPerDocument);

      results.push({
        document: document.path,
        score: matchedTerms.length,
        matches,
      });
    }

    return results
      .sort((first, second) => {
        if (second.score !== first.score) {
          return second.score - first.score;
        }

        return first.document.localeCompare(
          second.document,
          "pt-BR"
        );
      })
      .slice(0, maximumResults);
  }
}