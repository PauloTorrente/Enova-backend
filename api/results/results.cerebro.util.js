// Loads "el cerebro de Enova" — Pepe's house doctrine for how the AI
// should read data and talk — from cerebro-enova/ at the repo root, and
// hands it to the ask-ai endpoint as extra system-prompt context. Source
// of truth for the content itself is Enova-Pulse's repo (that's where
// Pepe edits it); this is a plain copy kept here because Enova-backend
// is the only one of the two that's actually running at request time —
// Enova-Pulse is a static SPA with no server, so it can't be read from
// at runtime, let alone from Enova-backend's separate deploy on Render.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CEREBRO_ROOT = path.join(__dirname, '../../cerebro-enova');

// Each doc opens with a YAML frontmatter block (id/capa/producto/dueno/
// cargar_si/...) that's metadata for picking which docs to load, not
// content for the model to read — stripped before it goes in the prompt.
const stripFrontmatter = (md) => md.replace(/^---[\s\S]*?---\n/, '').trim();

const readDoc = (relPath) => {
  try {
    return stripFrontmatter(fs.readFileSync(path.join(CEREBRO_ROOT, relPath), 'utf8'));
  } catch (err) {
    console.error(`[results.cerebro] missing doc ${relPath}:`, err.message);
    return '';
  }
};

// Read once at module load (these are static files shipped with the
// deploy, not something that changes per-request). nucleo/* has
// cargar_si: siempre — always relevant. modulos/consumer/lectura-
// resultados.md has cargar_si: "la consulta trata de resultados de
// encuestas..." — exactly what askAIAboutSurvey is. The estudios/*
// submodules are each conditional on a specific tipo de estudio (1B, 7,
// 8, 9) that Enova Pulse doesn't tag surveys with yet, so there's no
// reliable signal here to pick the right one — left out rather than
// loading all four regardless of fit.
export const CEREBRO_CONTEXT = [
  readDoc('nucleo/principios.md'),
  readDoc('nucleo/formato-salida.md'),
  readDoc('modulos/consumer/lectura-resultados.md'),
].filter(Boolean).join('\n\n---\n\n');
