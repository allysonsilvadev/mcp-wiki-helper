import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { env } from "../config/env.js";

export class WikiService {
  private readonly wikiPath: string;

  constructor() {
    this.wikiPath = path.resolve(env.wiki.localPath);
  }

  public async listDocuments(): Promise<string[]> {
    return this.listMarkdownFiles(this.wikiPath);
  }

  public async readDocument(documentPath: string): Promise<string> {
    const safePath = this.resolveSafePath(documentPath);

    if (!safePath.toLowerCase().endsWith(".md")) {
      throw new Error("Apenas arquivos Markdown podem ser lidos.");
    }

    try {
      return await readFile(safePath, "utf-8");
    } catch {
      throw new Error(`Documento não encontrado: ${documentPath}`);
    }
  }

  private async listMarkdownFiles(
    directoryPath: string,
    relativeDirectory = ""
  ): Promise<string[]> {
    const entries = await readdir(directoryPath, {
      withFileTypes: true
    });

    const documents: string[] = [];

    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") {
        continue;
      }

      const absolutePath = path.join(directoryPath, entry.name);
      const relativePath = path.join(relativeDirectory, entry.name);

      if (entry.isDirectory()) {
        const nestedDocuments = await this.listMarkdownFiles(
          absolutePath,
          relativePath
        );

        documents.push(...nestedDocuments);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        documents.push(relativePath.replaceAll("\\", "/"));
      }
    }

    return documents.sort((first, second) =>
      first.localeCompare(second, "pt-BR")
    );
  }

  private resolveSafePath(documentPath: string): string {
    const normalizedDocumentPath = documentPath.replaceAll("\\", "/");

    const absoluteDocumentPath = path.resolve(
      this.wikiPath,
      normalizedDocumentPath
    );

    const relativePath = path.relative(
      this.wikiPath,
      absoluteDocumentPath
    );

    const isOutsideWiki =
      relativePath.startsWith("..") ||
      path.isAbsolute(relativePath);

    if (isOutsideWiki) {
      throw new Error("Caminho de documento inválido.");
    }

    return absoluteDocumentPath;
  }

  public async searchDocuments(query: string): Promise<string[]> {
    const documents = await this.listDocuments();

    const terms = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (terms.length === 0) {
      return [];
    }

    const rankedDocuments = documents
      .map((document) => {
        const normalizedDocument = document.toLowerCase();

        let score = 0;

        for (const term of terms) {
          if (normalizedDocument.includes(term)) {
            score++;
          }
        }

        return {
          document,
          score,
        };
      })
      .filter((item) => item.score > 0)
      .sort((first, second) => {
        if (second.score !== first.score) {
          return second.score - first.score;
        }

        return first.document.localeCompare(second.document, "pt-BR");
      });

    return rankedDocuments.map((item) => item.document);
  }

};