import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import {
  certificationMetaSchema,
  findCrossFileIssues,
  questionsFileSchema,
} from "@/lib/content/schema";

// Validates every certification under /content (SPECIFICATIONS.md §4.3).
// Unlike the runtime loader, which throws on the first problem, this script
// collects and reports every error so contributors can fix a PR in one pass.
// Exits non-zero if anything is invalid.

const CONTENT_ROOT = path.join(process.cwd(), "content");

const errors: string[] = [];
let certificationCount = 0;
let questionCount = 0;

function relative(filePath: string): string {
  return path.relative(process.cwd(), filePath);
}

function readJson(filePath: string): unknown | undefined {
  let raw: string;

  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    errors.push(`${relative(filePath)}: file is missing or unreadable`);

    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    errors.push(`${relative(filePath)}: invalid JSON — ${String(error)}`);

    return undefined;
  }
}

function validateCertification(
  providerName: string,
  certPath: string,
  slugsSeen: Map<string, string>,
): void {
  const certName = path.basename(certPath);

  const unexpected = fs
    .readdirSync(certPath, { withFileTypes: true })
    .filter(
      (entry) =>
        !entry.isFile() ||
        !["meta.json", "questions.json"].includes(entry.name),
    );

  for (const entry of unexpected) {
    errors.push(
      `${relative(path.join(certPath, entry.name))}: unexpected entry — a certification directory must contain only meta.json and questions.json`,
    );
  }

  const metaPath = path.join(certPath, "meta.json");
  const metaJson = readJson(metaPath);

  if (metaJson === undefined) {
    return;
  }

  const metaResult = certificationMetaSchema.safeParse(metaJson);

  if (!metaResult.success) {
    errors.push(`${relative(metaPath)}:\n${z.prettifyError(metaResult.error)}`);

    return;
  }

  const meta = metaResult.data;
  certificationCount += 1;

  if (meta.slug !== certName || meta.provider !== providerName) {
    errors.push(
      `${relative(metaPath)}: slug/provider ("${meta.provider}/${meta.slug}") must match the directory path ("${providerName}/${certName}")`,
    );
  }

  // certification_slug is the global key user data references, so slugs must
  // be unique across all providers.
  const existing = slugsSeen.get(meta.slug);

  if (existing) {
    errors.push(
      `${relative(metaPath)}: duplicate slug "${meta.slug}" (already used by ${existing})`,
    );
  } else {
    slugsSeen.set(meta.slug, relative(metaPath));
  }

  const questionsPath = path.join(certPath, "questions.json");
  const questionsJson = readJson(questionsPath);

  if (questionsJson === undefined) {
    return;
  }

  const questionsResult = questionsFileSchema.safeParse(questionsJson);

  if (!questionsResult.success) {
    errors.push(
      `${relative(questionsPath)}:\n${z.prettifyError(questionsResult.error)}`,
    );

    return;
  }

  questionCount += questionsResult.data.length;

  for (const issue of findCrossFileIssues(meta, questionsResult.data)) {
    errors.push(`${relative(questionsPath)}: ${issue}`);
  }
}

function main(): void {
  if (!fs.existsSync(CONTENT_ROOT)) {
    console.error("No /content directory found — nothing to validate.");
    process.exit(1);
  }

  const slugsSeen = new Map<string, string>();

  for (const providerEntry of fs.readdirSync(CONTENT_ROOT, {
    withFileTypes: true,
  })) {
    if (!providerEntry.isDirectory()) {
      errors.push(
        `${relative(path.join(CONTENT_ROOT, providerEntry.name))}: unexpected entry — /content must contain only provider directories`,
      );
      continue;
    }

    const providerPath = path.join(CONTENT_ROOT, providerEntry.name);

    for (const certEntry of fs.readdirSync(providerPath, {
      withFileTypes: true,
    })) {
      if (!certEntry.isDirectory()) {
        errors.push(
          `${relative(path.join(providerPath, certEntry.name))}: unexpected entry — a provider directory must contain only certification directories`,
        );
        continue;
      }

      validateCertification(
        providerEntry.name,
        path.join(providerPath, certEntry.name),
        slugsSeen,
      );
    }
  }

  if (errors.length > 0) {
    console.error(`Content validation failed (${errors.length} error(s)):\n`);

    for (const error of errors) {
      console.error(`- ${error}\n`);
    }

    process.exit(1);
  }

  console.log(
    `Content OK: ${certificationCount} certification(s), ${questionCount} question(s) validated.`,
  );
}

main();
