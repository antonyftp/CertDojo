import "server-only";

import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import {
  certificationMetaSchema,
  findCrossFileIssues,
  questionsFileSchema,
  type CertificationMeta,
  type Question,
} from "@/lib/content/schema";

// Server-only, read-only access to the question banks under /content
// (SPECIFICATIONS.md §4.3). Content is validated with the Zod schemas on
// first read and cached in memory: works identically in Local mode and on
// Vercel since it never writes.

function getContentRoot(): string {
  return path.join(process.cwd(), "content");
}

function readJsonFile(filePath: string): unknown {
  let raw: string;

  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    throw new Error(`Content file not found or unreadable: ${filePath}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${String(error)}`);
  }
}

function loadCertifications(): Map<string, CertificationMeta> {
  const root = getContentRoot();
  const certifications = new Map<string, CertificationMeta>();

  if (!fs.existsSync(root)) {
    return certifications;
  }

  const providerDirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  for (const providerDir of providerDirs) {
    const providerPath = path.join(root, providerDir.name);
    const certDirs = fs
      .readdirSync(providerPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory());

    for (const certDir of certDirs) {
      const metaPath = path.join(providerPath, certDir.name, "meta.json");
      const parsed = certificationMetaSchema.safeParse(readJsonFile(metaPath));

      if (!parsed.success) {
        throw new Error(
          `Invalid ${metaPath}:\n${z.prettifyError(parsed.error)}`,
        );
      }

      const meta = parsed.data;

      if (meta.slug !== certDir.name || meta.provider !== providerDir.name) {
        throw new Error(
          `${metaPath}: slug/provider ("${meta.provider}/${meta.slug}") must match the directory path ("${providerDir.name}/${certDir.name}")`,
        );
      }

      // Slugs are the global key user data references (certification_slug),
      // so they must be unique across providers, not just within one.
      if (certifications.has(meta.slug)) {
        throw new Error(
          `Duplicate certification slug "${meta.slug}": slugs must be unique across all providers`,
        );
      }

      certifications.set(meta.slug, meta);
    }
  }

  return certifications;
}

function loadQuestions(meta: CertificationMeta): Question[] {
  const questionsPath = path.join(
    getContentRoot(),
    meta.provider,
    meta.slug,
    "questions.json",
  );
  const parsed = questionsFileSchema.safeParse(readJsonFile(questionsPath));

  if (!parsed.success) {
    throw new Error(
      `Invalid ${questionsPath}:\n${z.prettifyError(parsed.error)}`,
    );
  }

  const issues = findCrossFileIssues(meta, parsed.data);

  if (issues.length > 0) {
    throw new Error(`Invalid ${questionsPath}:\n${issues.join("\n")}`);
  }

  return parsed.data;
}

// In-memory caches: content is immutable at runtime, so the first read wins
// for the lifetime of the process (module state resets on dev reload).
let certificationsCache: Map<string, CertificationMeta> | null = null;
const questionsCache = new Map<string, Question[]>();

function getCertifications(): Map<string, CertificationMeta> {
  certificationsCache ??= loadCertifications();

  return certificationsCache;
}

export function getAllCertifications(): CertificationMeta[] {
  return [...getCertifications().values()].sort(
    (a, b) =>
      a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name),
  );
}

export function getCertificationBySlug(
  slug: string,
): CertificationMeta | undefined {
  return getCertifications().get(slug);
}

export function getQuestions(slug: string): Question[] {
  const cached = questionsCache.get(slug);

  if (cached) {
    return cached;
  }

  const meta = getCertifications().get(slug);

  if (!meta) {
    throw new Error(`Unknown certification slug "${slug}"`);
  }

  const questions = loadQuestions(meta);
  questionsCache.set(slug, questions);

  return questions;
}
