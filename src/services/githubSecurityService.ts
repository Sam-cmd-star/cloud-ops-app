/**
 * githubSecurityService.ts
 * Analizador real de repositorios: GitHub API + escáneres deterministas + capa de IA.
 *
 * Principios:
 *  - Nada de resultados "armados": cada hallazgo sale de evidencia leída del repositorio.
 *  - El PUNTAJE lo calculan solo los escáneres (verificable). La IA complementa con hallazgos de
 *    arquitectura/código, pero no modifica el puntaje.
 *  - Lo que no se puede comprobar se marca "unverified" y se excluye del puntaje (no cuenta como aprobado).
 */

// ───────────────────────── Tipos ─────────────────────────
export type CheckStatus = 'passed' | 'warning' | 'failed' | 'unverified' | 'na';
export type Category = 'secrets' | 'dependencies' | 'devops' | 'hygiene' | 'structure';

export interface AuditCheckDetail {
  title: string;
  status: CheckStatus;
  description: string;
  source: 'scanner' | 'ai';
  category?: Category;
  severity?: 'low' | 'medium' | 'high';
  evidence?: string[];
  remediationSnippet?: string;
}

export interface ScoreItem {
  category: Category;
  label: string;
  weight: number;
  score: number | null; // null = no verificable (no entra al promedio)
  note: string;
}

export interface AiClaim { text: string; file?: string }
export interface BestPractice { area: string; title: string; why: string; how: string; priority: 'alta' | 'media' | 'baja'; file?: string }
export interface AwsRecommendation { service: string; reason: string; when: 'ahora' | 'futuro' }

export interface ProjectProfile {
  name: string;
  description: string;
  primaryLanguage: string;
  languagesWithPercentages: { name: string; percentage: number }[];
  detectedFiles: string[];
  projectType: string;
  purpose: string;
  aiAnalysisSummary: string;
  frameworks: string[];
  topFolders: { name: string; files: number }[];
  architecture?: { style: string; summary: string; strengths: AiClaim[]; risks: AiClaim[] };
  awsRecommendations: AwsRecommendation[];
  bestPractices: BestPractice[];
}

export interface Methodology {
  filesInTree: number;
  filesScanned: number;
  filesCandidates: number;
  treeTruncated: boolean;
  scanners: string[];
  aiUsed: boolean;
  aiModel?: string;
  aiNote?: string;
  limitations: string[];
}

export interface RepoAuditResult {
  repoName: string;
  isPrivate: boolean;
  securityScore: number | null;
  scoreBreakdown: ScoreItem[];
  profile: ProjectProfile;
  methodology: Methodology;
  checks: {
    secretsFound: number | null;
    secretsCoverage: { scanned: number; total: number };
    branchProtected: boolean | null;
    hasSecurityPolicy: boolean;
    hasLicense: boolean;
    hasCiCd: boolean;
  };
  auditDetails: AuditCheckDetail[];
}

// ───────────────────────── Constantes ─────────────────────────
const GH = 'https://api.github.com';
const ANALYZE_URL: string = (import.meta as any).env?.VITE_ANALYZE_URL ?? '/api/analyze';
const MAX_SCAN_FILES = 200;
const MAX_FILE_BYTES = 80_000;
const MAX_AI_FILES = 14;
const MAX_AI_CHARS_PER_FILE = 3_000;
const MAX_AI_TOTAL_CHARS = 40_000;

const SKIP_PATH = /(^|\/)(node_modules|dist|build|out|\.next|vendor|coverage|\.git|__pycache__|\.venv)\//;
const BINARY = /\.(png|jpe?g|gif|webp|ico|svg|pdf|zip|gz|woff2?|ttf|eot|mp[34]|map|lock)$|(^|\/)package-lock\.json$|\.min\.(js|css)$/i;
const SOURCE_EXT = /\.(tsx?|jsx?|py|java|go|rb|php|cs|rs|kt|swift)$/i;

interface SecretPattern { kind: string; re: RegExp; weak?: boolean }
const SECRET_PATTERNS: SecretPattern[] = [
  { kind: 'AWS Access Key ID', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: 'Token de GitHub', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
  { kind: 'Clave privada', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  { kind: 'Token de Slack', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { kind: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  {
    kind: 'Credencial asignada en código',
    re: /(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"][^'"\s]{8,}['"]/gi,
    weak: true,
  },
];
const PLACEHOLDER = /(example|your|xxx|changeme|placeholder|<|\*\*\*|process\.env|import\.meta|localhost)/i;

const FRAMEWORKS: Record<string, string> = {
  react: 'React', vue: 'Vue', next: 'Next.js', '@angular/core': 'Angular', svelte: 'Svelte',
  express: 'Express', '@nestjs/core': 'NestJS', fastify: 'Fastify', vite: 'Vite',
  tailwindcss: 'Tailwind CSS', '@supabase/supabase-js': 'Supabase', prisma: 'Prisma',
  mongoose: 'MongoDB (Mongoose)', 'aws-sdk': 'AWS SDK v2',
};

const WEIGHTS: Record<Category, { label: string; weight: number }> = {
  secrets: { label: 'Secretos y credenciales', weight: 30 },
  dependencies: { label: 'Dependencias vulnerables', weight: 20 },
  devops: { label: 'DevOps (CI/CD, pruebas, automatización)', weight: 20 },
  hygiene: { label: 'Higiene y gobernanza del repo', weight: 15 },
  structure: { label: 'Tamaño y organización del código', weight: 15 },
};

interface TreeItem { path: string; type: 'blob' | 'tree' | 'commit'; size?: number }
interface ScanResult { category: Category; score: number | null; note: string; details: AuditCheckDetail[] }

// ───────────────────────── Utilidades ─────────────────────────
const encodePath = (p: string) => p.split('/').map(encodeURIComponent).join('/');
const lineOf = (text: string, index: number) => text.slice(0, index).split('\n').length;

async function ghJson<T>(path: string, headers: HeadersInit, soft = false): Promise<T | null> {
  const res = await fetch(`${GH}${path}`, { headers });
  if (res.status === 204) return null;
  if (res.ok) return (await res.json()) as T;
  if (soft) return null;
  if (res.status === 404) throw new Error('Repositorio no encontrado. Si es privado, agrega un token con permiso de lectura.');
  if (res.status === 401) throw new Error('El token de GitHub no es válido o expiró.');
  if (res.status === 403) throw new Error('GitHub rechazó la solicitud (límite de uso o permisos). Agrega un token o espera unos minutos.');
  throw new Error(`GitHub respondió con el código ${res.status}.`);
}

async function readFile(o: string, r: string, branch: string, path: string, token?: string): Promise<string | null> {
  try {
    // Sin token usamos raw.githubusercontent (no consume el límite de la API de GitHub).
    const url = token
      ? `${GH}/repos/${o}/${r}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`
      : `https://raw.githubusercontent.com/${o}/${r}/${encodeURI(branch)}/${encodePath(path)}`;
    const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json' } } : undefined);
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

async function mapPool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

/** Suma puntos solo de lo verificable. */
function points(items: { pts: number; ok: boolean | null }[]): number | null {
  const known = items.filter((i) => i.ok !== null);
  const total = known.reduce((a, i) => a + i.pts, 0);
  if (total === 0) return null;
  return Math.round((known.filter((i) => i.ok).reduce((a, i) => a + i.pts, 0) / total) * 100);
}

function redact(text: string): string {
  return SECRET_PATTERNS.reduce((t, p) => t.replace(new RegExp(p.re.source, p.re.flags), '[REDACTADO]'), text);
}

// ───────────────────────── Selección de archivos ─────────────────────────
function pickFilesToScan(tree: TreeItem[]): { paths: string[]; candidates: number } {
  const candidates = tree.filter(
    (t) => t.type === 'blob' && !SKIP_PATH.test(t.path) && !BINARY.test(t.path) && (t.size ?? 0) <= MAX_FILE_BYTES
  );
  const rank = (p: string) =>
    /(^|\/)\.env/.test(p) ? 0
    : /(^|\/)readme\.md$/i.test(p) || /\.(ya?ml|json|toml|ini|cfg|conf|tf|properties)$|dockerfile$/i.test(p) ? 1
    : SOURCE_EXT.test(p) ? 2
    : 3;
  const sorted = [...candidates].sort(
    (a, b) => rank(a.path) - rank(b.path) || a.path.split('/').length - b.path.split('/').length
  );
  return { paths: sorted.slice(0, MAX_SCAN_FILES).map((t) => t.path), candidates: candidates.length };
}

// ───────────────────────── Escáneres ─────────────────────────
function secretsSnippet(lang: string): string {
  const rotate = '# 1) Revoca y rota la credencial expuesta (ya quedó en el historial de git)\n# 2) Léela en runtime desde AWS Secrets Manager:\n';
  if (/python/i.test(lang))
    return `${rotate}import boto3\nsecret = boto3.client('secretsmanager').get_secret_value(SecretId='mi-app/prod')['SecretString']`;
  if (/typescript|javascript/i.test(lang))
    return `${rotate.replace(/#/g, '//')}// (en el backend, nunca en el navegador)\nimport { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';\nconst { SecretString } = await new SecretsManagerClient({}).send(new GetSecretValueCommand({ SecretId: 'mi-app/prod' }));`;
  return `${rotate}# o en variables de entorno del servidor, nunca dentro del repositorio.`;
}

function scanSecrets(files: Map<string, string>, tree: TreeItem[], candidates: number, lang: string): ScanResult {
  const high: string[] = [];
  const weak: string[] = [];

  for (const [path, text] of files) {
    for (const p of SECRET_PATTERNS) {
      for (const m of text.matchAll(p.re)) {
        if (p.weak && PLACEHOLDER.test(m[0])) continue;
        const where = `${path}:${lineOf(text, m.index ?? 0)} · ${p.kind}`;
        (p.weak ? weak : high).push(p.weak ? where : `${where} (${m[0].slice(0, 4)}…oculto)`);
      }
    }
  }

  const envFiles = tree
    .filter((t) => t.type === 'blob' && /(^|\/)\.env(\.[^/]+)?$/.test(t.path) && !/\.(example|sample|template)$/i.test(t.path))
    .map((t) => t.path);
  const keyFiles = tree.filter((t) => t.type === 'blob' && /(^|\/)(id_rsa|id_ed25519|.*\.pem|.*\.p12|.*\.pfx)$/i.test(t.path)).map((t) => t.path);

  const details: AuditCheckDetail[] = [];
  if (high.length)
    details.push({
      title: 'Credenciales expuestas en el código', status: 'failed', severity: 'high', source: 'scanner', category: 'secrets',
      description: `Se encontraron ${high.length} patrón(es) de credenciales reales. Aunque se borren, siguen en el historial de git: hay que rotarlas.`,
      evidence: high.slice(0, 8), remediationSnippet: secretsSnippet(lang),
    });
  if (envFiles.length || keyFiles.length)
    details.push({
      title: 'Archivos sensibles dentro del repositorio', status: 'failed', severity: 'high', source: 'scanner', category: 'secrets',
      description: 'Hay archivos .env o claves privadas versionados. Estos archivos no deben subirse a git.',
      evidence: [...envFiles, ...keyFiles].slice(0, 8),
      remediationSnippet: `git rm --cached ${[...envFiles, ...keyFiles][0]}\necho ".env*\\n!.env.example" >> .gitignore\n# y rota cualquier valor que haya contenido`,
    });
  if (weak.length)
    details.push({
      title: 'Posibles credenciales asignadas en el código', status: 'warning', severity: 'medium', source: 'scanner', category: 'secrets',
      description: 'Hay asignaciones del tipo password/api_key/token con un valor literal. Revisa si son reales o datos de ejemplo.',
      evidence: weak.slice(0, 6), remediationSnippet: secretsSnippet(lang),
    });
  if (!details.length)
    details.push({
      title: 'Búsqueda de credenciales', status: 'passed', source: 'scanner', category: 'secrets',
      description: `${files.size < candidates ? `Revisión PARCIAL: se leyeron ${files.size} de ${candidates} archivos de texto` : `Se revisaron los ${files.size} archivos de texto`} y no se hallaron patrones de credenciales conocidos. No equivale a un escaneo del historial completo (ej. gitleaks).`,
    });

  const score = high.length ? 0 : envFiles.length || keyFiles.length ? 20 : weak.length ? 60 : 100;
  return {
    category: 'secrets', score, details,
    note: `${files.size}/${candidates} archivos revisados · ${high.length} confirmados, ${weak.length} dudosos`,
  };
}

function lockVersions(lockText: string): Map<string, string> | null {
  try {
    const lock = JSON.parse(lockText);
    const out = new Map<string, string>();
    if (lock.packages) {
      for (const [k, v] of Object.entries<any>(lock.packages)) {
        const name = k.startsWith('node_modules/') ? k.slice('node_modules/'.length) : '';
        if (name && !name.includes('node_modules/') && v?.version) out.set(name, v.version);
      }
    } else if (lock.dependencies) {
      for (const [k, v] of Object.entries<any>(lock.dependencies)) if (v?.version) out.set(k, v.version);
    }
    return out.size ? out : null;
  } catch {
    return null;
  }
}

async function scanDependencies(pkgText: string | null, tree: TreeItem[], lockText: string | null): Promise<ScanResult> {
  const unverified = (note: string): ScanResult => ({
    category: 'dependencies', score: null, note,
    details: [{ title: 'Dependencias vulnerables', status: 'unverified', source: 'scanner', category: 'dependencies', description: note }],
  });
  if (!pkgText) return unverified('Sin package.json en la raíz: por ahora solo se auditan dependencias npm.');

  let pkg: any;
  try { pkg = JSON.parse(pkgText); } catch { return unverified('package.json no es un JSON válido.'); }

  const prod: Record<string, string> = pkg.dependencies ?? {};
  const dev: Record<string, string> = pkg.devDependencies ?? {};
  const lock = lockText ? lockVersions(lockText) : null;
  const entries = Object.entries({ ...dev, ...prod })
    .map(([name, range]) => {
      const version = lock?.get(name) ?? /(\d+\.\d+\.\d+)/.exec(String(range))?.[1];
      return version ? { name, version, dev: !(name in prod) } : null;
    })
    .filter((x): x is { name: string; version: string; dev: boolean } => !!x)
    .slice(0, 300);
  if (!entries.length) return unverified('package.json no declara dependencias con versión reconocible.');

  try {
    // Sin cabecera Content-Type para evitar el preflight CORS; OSV lee el cuerpo JSON igualmente.
    const res = await fetch('https://api.osv.dev/v1/querybatch', {
      method: 'POST',
      body: JSON.stringify({ queries: entries.map((e) => ({ package: { name: e.name, ecosystem: 'npm' }, version: e.version })) }),
    });
    if (!res.ok) throw new Error(`OSV respondió ${res.status}`);
    const data = await res.json();
    const vulnerable = entries
      .map((e, i) => ({ ...e, ids: ((data.results?.[i]?.vulns ?? []) as any[]).map((v) => v.id as string) }))
      .filter((x) => x.ids.length);
    const vProd = vulnerable.filter((v) => !v.dev);
    const vDev = vulnerable.filter((v) => v.dev);
    const source = lock ? 'versiones instaladas según package-lock.json' : 'versión mínima declarada en package.json (sin lockfile legible)';

    const hasLock = tree.some((t) => /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb)$/.test(t.path));
    const details: AuditCheckDetail[] = [];
    if (vulnerable.length)
      details.push({
        title: `${vulnerable.length} dependencia(s) con vulnerabilidades conocidas (${vProd.length} de producción, ${vDev.length} de desarrollo)`,
        status: vProd.length > 2 ? 'failed' : 'warning', severity: vProd.length ? (vProd.length > 2 ? 'high' : 'medium') : 'low',
        source: 'scanner', category: 'dependencies',
        description: `Cruce contra OSV.dev usando ${source}. ${vProd.length ? '' : 'Todas son de desarrollo: no viajan al código de producción, pero pueden afectar a quien desarrolla o al proceso de build. '}Solo se auditan dependencias directas.`,
        evidence: vulnerable.slice(0, 8).map((v) => `${v.name}@${v.version}${v.dev ? ' (dev)' : ''} → ${v.ids.slice(0, 3).join(', ')}`),
        remediationSnippet: 'npm audit\nnpm audit fix\n# para cambios mayores: npm install <paquete>@latest',
      });
    else
      details.push({
        title: 'Dependencias vulnerables', status: 'passed', source: 'scanner', category: 'dependencies',
        description: `${entries.length} dependencias directas consultadas en OSV.dev (${source}) sin vulnerabilidades conocidas.`,
      });
    if (!hasLock)
      details.push({
        title: 'Sin archivo lock de dependencias', status: 'warning', severity: 'low', source: 'scanner', category: 'dependencies',
        description: 'Sin lockfile las instalaciones no son reproducibles y no se sabe qué versión exacta corre en producción.',
        remediationSnippet: 'npm install   # genera package-lock.json; súbelo al repositorio',
      });
    return {
      category: 'dependencies', details,
      score: Math.max(0, 100 - vProd.length * 12 - vDev.length * 4 - (hasLock ? 0 : 10)),
      note: `${entries.length} paquetes · ${vProd.length} prod / ${vDev.length} dev con CVE`,
    };
  } catch (e: any) {
    return unverified(`No se pudo consultar OSV.dev (${e?.message ?? 'error de red'}).`);
  }
}

function scanDevOps(tree: TreeItem[], staticFrontend: boolean): ScanResult {
  const has = (re: RegExp) => tree.some((t) => t.type === 'blob' && re.test(t.path));
  const workflows = tree.filter((t) => /^\.github\/workflows\/.+\.ya?ml$/.test(t.path)).map((t) => t.path);
  const tests = tree.filter((t) => t.type === 'blob' && /(\.(test|spec)\.[jt]sx?$|(^|\/)(__tests__|tests?)\/|test_.*\.py$|_test\.go$)/.test(t.path));
  const dependabot = has(/(^|\/)(\.github\/dependabot\.ya?ml|renovate\.json)$/);
  const container = has(/(^|\/)(Dockerfile|docker-compose\.ya?ml|template\.ya?ml|cdk\.json|serverless\.ya?ml|.*\.tf)$/);
  const containerOk: boolean | 'na' = container ? true : staticFrontend ? 'na' : false;

  const mk = (title: string, ok: boolean | 'na', okDesc: string, badDesc: string, o: { snippet?: string; evidence?: string[]; naReason?: string } = {}): AuditCheckDetail => ({
    title, source: 'scanner', category: 'devops',
    status: ok === 'na' ? 'na' : ok ? 'passed' : 'warning',
    severity: ok === false ? 'medium' : undefined,
    description: ok === 'na' ? o.naReason ?? '' : ok ? okDesc : badDesc,
    evidence: ok === true ? o.evidence : undefined,
    remediationSnippet: ok === false ? o.snippet : undefined,
  });

  const details = [
    mk('Pipeline CI/CD (GitHub Actions)', workflows.length > 0, `Se encontraron ${workflows.length} workflow(s).`,
      'No hay workflows en .github/workflows: nada valida ni despliega el código automáticamente.',
      { evidence: workflows.slice(0, 5), snippet: `# .github/workflows/ci.yml\nname: CI\non: [push, pull_request]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with: { node-version: 20 }\n      - run: npm ci && npm run build && npm test --if-present` }),
    mk('Pruebas automatizadas', tests.length > 0, `Se detectaron ${tests.length} archivo(s) de prueba.`,
      'No se detectaron archivos de prueba (*.test.*, *.spec.*, carpeta tests/).', { evidence: tests.slice(0, 4).map((t) => t.path) }),
    mk('Actualización automática de dependencias', dependabot, 'Dependabot/Renovate configurado.',
      'Sin Dependabot ni Renovate: las dependencias vulnerables no se avisan solas.',
      { snippet: `# .github/dependabot.yml\nversion: 2\nupdates:\n  - package-ecosystem: npm\n    directory: "/"\n    schedule: { interval: weekly }` }),
    mk('Contenedores / infraestructura como código', containerOk, 'Se encontró Dockerfile o definición de infraestructura.',
      'Sin Dockerfile ni IaC (Terraform/CDK/SAM): el despliegue no es reproducible.',
      { naReason: 'Frontend sin servidor propio: suele publicarse en una plataforma gestionada (Vercel, Amplify, S3 + CloudFront) y no necesita Docker. Se excluye del puntaje.' }),
  ];
  const score = points([
    { pts: 45, ok: workflows.length > 0 }, { pts: 30, ok: tests.length > 0 },
    { pts: 15, ok: dependabot }, { pts: 10, ok: containerOk === 'na' ? null : containerOk },
  ]);
  return { category: 'devops', score, details, note: `${workflows.length} workflows · ${tests.length} pruebas${containerOk === 'na' ? ' · contenedores no aplica' : ''}` };
}

function scanHygiene(tree: TreeItem[], licenseFromApi: boolean, branchProtected: boolean | null, soloRepo: boolean): ScanResult {
  const has = (re: RegExp) => tree.some((t) => t.type === 'blob' && re.test(t.path));
  const gitignore = has(/^\.gitignore$/);
  const security = has(/^(\.github\/|docs\/)?SECURITY\.md$/i);
  const license = licenseFromApi || has(/^LICENSE(\.[a-z]+)?$/i);
  const readme = has(/^README(\.[a-z]+)?$/i);
  const owners: boolean | 'na' = has(/^(\.github\/|docs\/)?CODEOWNERS$/) ? true : soloRepo ? 'na' : false;

  const mk = (title: string, ok: boolean | 'na' | null, okDesc: string, badDesc: string, snippet?: string, sev: 'low' | 'medium' = 'medium', naReason = ''): AuditCheckDetail => ({
    title, source: 'scanner', category: 'hygiene',
    status: ok === 'na' ? 'na' : ok === null ? 'unverified' : ok ? 'passed' : 'warning',
    severity: ok === false ? sev : undefined,
    description: ok === 'na' ? naReason : ok === true ? okDesc : badDesc,
    remediationSnippet: ok === false ? snippet : undefined,
  });

  const details = [
    mk('.gitignore', gitignore, 'Presente en la raíz.', 'Falta .gitignore: aumenta el riesgo de subir .env o node_modules.', 'node_modules/\ndist/\n.env\n.env.*\n!.env.example'),
    mk('Política de seguridad (SECURITY.md)', security, 'Existe SECURITY.md con canal de reporte.', 'No hay SECURITY.md: no hay canal privado para reportar vulnerabilidades.', '# SECURITY.md\n## Reportar una vulnerabilidad\nEscribe a seguridad@tu-dominio.com. No abras un issue público.', 'low'),
    mk('Protección de la rama principal', branchProtected, 'La rama por defecto está protegida.',
      branchProtected === null ? 'No se pudo verificar (GitHub no lo expone sin permisos).' : 'La rama por defecto no tiene protección: cualquiera con acceso puede subir directo o reescribir el historial.',
      'Settings → Branches → Add rule: requerir pull request y checks de CI, y bloquear force-push.'),
    mk('Licencia', license, 'Licencia declarada.', 'Sin licencia: legalmente nadie más puede reutilizar el código.', 'Añade un archivo LICENSE (ej. MIT) desde GitHub → Add file → Create new file → LICENSE.', 'low'),
    mk('README', readme, 'Existe README.', 'Sin README: nadie sabe qué hace ni cómo ejecutar el proyecto.', undefined, 'low'),
    mk('CODEOWNERS', owners, 'Hay responsables de revisión definidos.', 'Sin CODEOWNERS: no hay revisores obligatorios por área.', '# .github/CODEOWNERS\n* @tu-usuario', 'low',
      'Repositorio con un solo colaborador: no hay a quién asignar revisiones. Se excluye del puntaje.'),
  ];
  const score = points([
    { pts: 25, ok: gitignore }, { pts: 20, ok: security }, { pts: 15, ok: license },
    { pts: 15, ok: readme }, { pts: 10, ok: owners === 'na' ? null : owners }, { pts: 15, ok: branchProtected },
  ]);
  const applicable = details.filter((d) => d.status !== 'na' && d.status !== 'unverified').length;
  return { category: 'hygiene', score, details, note: `${applicable} controles aplicables${owners === 'na' ? ' (CODEOWNERS no aplica)' : ''}${branchProtected === null ? ' · rama no verificable' : ''}` };
}

function scanStructure(tree: TreeItem[], pkg: any | null): { result: ScanResult; frameworks: string[]; folders: { name: string; files: number }[] } {
  const blobs = tree.filter((t) => t.type === 'blob' && !SKIP_PATH.test(t.path));
  const counts = new Map<string, number>();
  for (const b of blobs) {
    const top = b.path.includes('/') ? b.path.split('/')[0] : '(raíz)';
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  const folders = [...counts.entries()].map(([name, files]) => ({ name, files })).sort((a, b) => b.files - a.files).slice(0, 8);
  const rootFiles = counts.get('(raíz)') ?? 0;
  const big = blobs.filter((b) => SOURCE_EXT.test(b.path) && (b.size ?? 0) > 40_000).sort((a, b) => (b.size ?? 0) - (a.size ?? 0));

  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) } as Record<string, string>;
  const frameworks = Object.entries(FRAMEWORKS).filter(([k]) => k in deps).map(([, v]) => v);

  const details: AuditCheckDetail[] = [];
  details.push(
    big.length
      ? { title: 'Archivos de código muy grandes', status: 'warning', severity: 'medium', source: 'scanner', category: 'structure',
          description: 'Archivos de más de 40 KB suelen mezclar responsabilidades y dificultan mantener y escalar el sistema.',
          evidence: big.slice(0, 5).map((b) => `${b.path} (${Math.round((b.size ?? 0) / 1024)} KB)`),
          remediationSnippet: '// Divide por responsabilidad: componentes, hooks/servicios, tipos y utilidades en archivos separados.' }
      : { title: 'Tamaño de los archivos de código', status: 'passed', source: 'scanner', category: 'structure', description: 'No hay archivos de código con tamaño excesivo.' }
  );
  details.push(
    rootFiles > 20
      ? { title: 'Raíz del repositorio saturada', status: 'warning', severity: 'low', source: 'scanner', category: 'structure',
          description: `Hay ${rootFiles} archivos sueltos en la raíz; conviene agruparlos en carpetas por módulo o función.` }
      : { title: 'Organización de carpetas', status: 'passed', source: 'scanner', category: 'structure',
          description: `Carpetas principales: ${folders.filter((f) => f.name !== '(raíz)').slice(0, 5).map((f) => f.name).join(', ') || 'ninguna (todo en la raíz)'}.` }
  );
  const score = Math.max(0, 100 - Math.min(45, big.length * 15) - (rootFiles > 20 ? 15 : 0));
  return { result: { category: 'structure', score, details, note: `${blobs.length} archivos · ${big.length} muy grandes` }, frameworks, folders };
}

// ───────────────────────── Capa de IA (vía /api/analyze) ─────────────────────────
interface AiAnalysis {
  projectType: string; purpose: string; summary: string;
  architecture: { style: string; summary: string; strengths: unknown[]; risks: unknown[] };
  findings: { title: string; status: string; severity?: string; description: string; file?: string; remediation?: string }[];
  awsRecommendations: { service: string; reason: string; when?: string }[];
  bestPractices?: { area?: string; title: string; why?: string; how?: string; priority?: string; file?: string }[];
}

function pickFilesForAi(files: Map<string, string>): { path: string; content: string }[] {
  const rank = (p: string) =>
    /(^|\/)(package\.json|requirements\.txt|pom\.xml|go\.mod|Dockerfile|readme\.md)$/i.test(p) || /^\.github\/workflows\//.test(p) ? 0
    : /(^|\/)(main|index|app|server|handler|routes?|auth|api|middleware|config)\.[a-z]+$/i.test(p) ? 1
    : SOURCE_EXT.test(p) ? 2 : 3;
  const ordered = [...files.keys()].filter((p) => !/(^|\/)\.env/.test(p)).sort((a, b) => rank(a) - rank(b) || a.split('/').length - b.split('/').length);
  const out: { path: string; content: string }[] = [];
  let total = 0;
  for (const path of ordered) {
    if (out.length >= MAX_AI_FILES || total >= MAX_AI_TOTAL_CHARS) break;
    const content = redact(files.get(path)!).slice(0, MAX_AI_CHARS_PER_FILE);
    total += content.length;
    out.push({ path, content });
  }
  return out;
}

async function callAi(payload: unknown): Promise<{ ok: true; analysis: AiAnalysis; model?: string; missing: string[] } | { ok: false; note: string }> {
  try {
    const res = await fetch(ANALYZE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 404) return { ok: false, note: 'No se encontró /api/analyze en este servidor (usa la URL desplegada o configura el proxy de Vite)' };
    if (res.status === 401) return { ok: false, note: 'El despliegue exige autenticación (Deployment Protection de Vercel); usa el dominio de producción del proyecto' };
    if (res.status === 504) return { ok: false, note: data?.error ?? 'La IA tardó demasiado en responder (tiempo límite del servidor); vuelve a intentarlo' };
    if (!res.ok || !data?.analysis) return { ok: false, note: data?.error ?? `El servicio de IA respondió ${res.status}.` };
    return { ok: true, analysis: data.analysis as AiAnalysis, model: typeof data.model === 'string' ? data.model : undefined, missing: Array.isArray(data.missing) ? data.missing.filter((m: unknown) => typeof m === 'string') : [] };
  } catch {
    return { ok: false, note: 'El servicio de IA no está disponible (¿falta desplegar /api/analyze?).' };
  }
}

const asStr = (v: unknown, max = 600) => (typeof v === 'string' ? v.slice(0, max) : '');
/** Fortalezas/riesgos: se acepta texto suelto u objeto {text, file}; el archivo solo cuenta si existe en el árbol. */
const asClaims = (v: unknown, treeSet: Set<string>): AiClaim[] =>
  (Array.isArray(v) ? v : [])
    .slice(0, 6)
    .map((x: any) => {
      const text = asStr(typeof x === 'string' ? x : x?.text, 300);
      const file = x && typeof x === 'object' ? asStr(x.file, 300) : '';
      return { text, file: file && treeSet.has(file) ? file : undefined };
    })
    .filter((c) => c.text);
const PRIORITY_ORDER = { alta: 0, media: 1, baja: 2 } as const;

// ───────────────────────── Función principal ─────────────────────────
export async function auditRepository(owner: string, repo: string, token?: string): Promise<RepoAuditResult> {
  const o = owner.trim();
  const r = repo.trim().replace(/\.git$/, '');
  if (!o || !r) throw new Error('Escribe el owner y el nombre del repositorio.');
  const tk = token?.trim() || undefined;
  const headers: HeadersInit = { Accept: 'application/vnd.github+json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) };

  // 1) Datos reales del repo (si falla, se informa: no se inventa nada)
  const repoData = await ghJson<any>(`/repos/${o}/${r}`, headers);
  const branch: string = repoData.default_branch || 'main';
  const [langData, treeData, branchData, contributors] = await Promise.all([
    ghJson<Record<string, number>>(`/repos/${o}/${r}/languages`, headers, true),
    ghJson<{ tree: TreeItem[]; truncated: boolean }>(`/repos/${o}/${r}/git/trees/${encodeURIComponent(branch)}?recursive=1`, headers, true),
    ghJson<any>(`/repos/${o}/${r}/branches/${encodeURIComponent(branch)}`, headers, true),
    ghJson<any[]>(`/repos/${o}/${r}/contributors?per_page=3`, headers, true),
  ]);
  const soloRepo = Array.isArray(contributors) && contributors.length <= 1;
  if (!treeData) throw new Error('No se pudo leer el árbol de archivos del repositorio.');
  const tree = treeData.tree;
  const branchProtected: boolean | null = typeof branchData?.protected === 'boolean' ? branchData.protected : null;

  const total = Object.values(langData ?? {}).reduce((a, b) => a + b, 0);
  const languages = total
    ? Object.entries(langData!).map(([name, bytes]) => ({ name, percentage: Number(((bytes / total) * 100).toFixed(1)) })).sort((a, b) => b.percentage - a.percentage)
    : [];
  const primaryLanguage: string = repoData.language || languages[0]?.name || 'Desconocido';

  // 2) Leer el contenido de los archivos relevantes
  const { paths, candidates } = pickFilesToScan(tree);
  const contents = await mapPool(paths, 6, (p) => readFile(o, r, branch, p, tk));
  const files = new Map<string, string>();
  paths.forEach((p, i) => { if (contents[i] !== null) files.set(p, contents[i]!); });

  let pkg: any = null;
  const pkgText = files.get('package.json') ?? null;
  if (pkgText) { try { pkg = JSON.parse(pkgText); } catch { /* se reporta en el escáner */ } }

  const lockText = tree.some((t) => t.path === 'package-lock.json') ? await readFile(o, r, branch, 'package-lock.json', tk) : null;

  // 3) Escáneres deterministas
  const structure = scanStructure(tree, pkg);
  const WEB_LANGS = ['TypeScript', 'JavaScript', 'CSS', 'SCSS', 'HTML', 'Vue', 'Svelte'];
  const staticFrontend =
    structure.frameworks.some((f) => ['React', 'Vue', 'Angular', 'Svelte', 'Vite'].includes(f)) &&
    !structure.frameworks.some((f) => ['Express', 'NestJS', 'Fastify', 'Next.js', 'Prisma', 'MongoDB (Mongoose)'].includes(f)) &&
    languages.every((l) => WEB_LANGS.includes(l.name) || l.percentage < 5);
  const scans: ScanResult[] = [
    scanSecrets(files, tree, candidates, primaryLanguage),
    await scanDependencies(pkgText, tree, lockText),
    scanDevOps(tree, staticFrontend),
    scanHygiene(tree, !!repoData.license, branchProtected, soloRepo),
    structure.result,
  ];

  // 4) Puntaje: promedio ponderado SOLO de lo verificable
  const scoreBreakdown: ScoreItem[] = scans.map((s) => ({ category: s.category, ...WEIGHTS[s.category], score: s.score, note: s.note }));
  const verifiable = scoreBreakdown.filter((s) => s.score !== null);
  const wSum = verifiable.reduce((a, s) => a + s.weight, 0);
  const securityScore = wSum ? Math.round(verifiable.reduce((a, s) => a + s.weight * (s.score as number), 0) / wSum) : null;

  const auditDetails: AuditCheckDetail[] = scans.flatMap((s) => s.details);

  // 5) IA: analiza arquitectura y código con la evidencia ya recolectada
  const treeSet = new Set(tree.map((t) => t.path));
  const ai = await callAi({
    repo: { name: `${o}/${r}`, description: repoData.description, primaryLanguage, languages, branch, frameworks: structure.frameworks },
    tree: tree.filter((t) => t.type === 'blob' && !SKIP_PATH.test(t.path)).map((t) => t.path).slice(0, 300),
    files: pickFilesForAi(files),
    scannerFindings: auditDetails.map((d) => ({ title: d.title, status: d.status, evidence: d.evidence?.slice(0, 3) })),
  });

  let aiProfile: Partial<ProjectProfile> = {};
  if (ai.ok) {
    const a = ai.analysis;
    aiProfile = {
      projectType: asStr(a.projectType, 120), purpose: asStr(a.purpose), aiAnalysisSummary: asStr(a.summary, 900),
      architecture: { style: asStr(a.architecture?.style, 120), summary: asStr(a.architecture?.summary), strengths: asClaims(a.architecture?.strengths, treeSet), risks: asClaims(a.architecture?.risks, treeSet) },
      awsRecommendations: (Array.isArray(a.awsRecommendations) ? a.awsRecommendations : []).slice(0, 5)
        .map((x): AwsRecommendation => ({ service: asStr(x?.service, 80), reason: asStr(x?.reason, 240), when: x?.when === 'futuro' ? 'futuro' : 'ahora' }))
        .filter((x) => x.service),
      bestPractices: (Array.isArray(a.bestPractices) ? a.bestPractices : []).slice(0, 8)
        .map((x): BestPractice => {
          const file = asStr(x?.file, 300);
          return {
            area: asStr(x?.area, 40) || 'General', title: asStr(x?.title, 140), why: asStr(x?.why, 400), how: asStr(x?.how, 900),
            priority: (['alta', 'media', 'baja'] as const).find((q) => q === x?.priority) ?? 'media',
            file: file && treeSet.has(file) ? file : undefined,
          };
        })
        .filter((x) => x.title && x.how)
        .sort((x, y) => PRIORITY_ORDER[x.priority] - PRIORITY_ORDER[y.priority]),
    };
    const statuses: CheckStatus[] = ['passed', 'warning', 'failed'];
    for (const f of (Array.isArray(a.findings) ? a.findings : []).slice(0, 8)) {
      const file = asStr(f?.file, 300);
      if (file && !treeSet.has(file)) continue; // descarta citas a archivos que no existen
      auditDetails.push({
        title: asStr(f?.title, 140), status: statuses.includes(f?.status as CheckStatus) ? (f.status as CheckStatus) : 'warning',
        severity: (['low', 'medium', 'high'] as const).find((s) => s === f?.severity), source: 'ai',
        description: asStr(f?.description), evidence: file ? [file] : undefined, remediationSnippet: asStr(f?.remediation, 900) || undefined,
      });
    }
  }

  const order: Record<CheckStatus, number> = { failed: 0, warning: 1, unverified: 2, na: 3, passed: 4 };
  auditDetails.sort((a, b) => order[a.status] - order[b.status]);

  const limitations = [
    'Solo se analiza la rama por defecto, no el historial de commits.',
    lockText ? 'Dependencias: solo npm y solo las directas (las transitivas no se auditan); versiones tomadas de package-lock.json.' : 'Dependencias: solo npm y solo las directas; sin package-lock.json se usa la versión mínima declarada.',
    `Se leyeron ${files.size} de ${candidates} archivos de texto (tope de ${MAX_SCAN_FILES}).`,
    ...(treeData.truncated ? ['El árbol del repositorio es muy grande y GitHub lo devolvió incompleto.'] : []),
    ...(!ai.ok ? [] : ['La IA solo recibió fragmentos de los archivos clave, con credenciales redactadas.', 'Las observaciones y buenas prácticas de la IA son estimaciones: verifícalas en el archivo citado antes de darlas por ciertas.', ...(ai.missing.length ? [`La IA no alcanzó a completar: ${ai.missing.join(' y ')}. Vuelve a analizar para obtenerlo.`] : [])]),
  ];

  return {
    repoName: `${o}/${r}`,
    isPrivate: !!repoData.private,
    securityScore,
    scoreBreakdown,
    profile: {
      name: `${o}/${r}`,
      description: repoData.description || 'Sin descripción en GitHub.',
      primaryLanguage,
      languagesWithPercentages: languages,
      detectedFiles: [...new Set(tree.map((t) => (t.path.includes('/') ? t.path.split('/')[0] + '/' : t.path)))].slice(0, 30),
      projectType: aiProfile.projectType || (structure.frameworks.slice(0, 3).join(' + ') || primaryLanguage),
      purpose: aiProfile.purpose || repoData.description || 'Sin descripción en GitHub.',
      aiAnalysisSummary: aiProfile.aiAnalysisSummary || 'Análisis con IA no disponible: se muestran solo los resultados de los escáneres.',
      frameworks: structure.frameworks,
      topFolders: structure.folders,
      architecture: aiProfile.architecture,
      awsRecommendations: aiProfile.awsRecommendations ?? [],
      bestPractices: aiProfile.bestPractices ?? [],
    },
    methodology: {
      filesInTree: tree.filter((t) => t.type === 'blob').length,
      filesScanned: files.size,
      filesCandidates: candidates,
      treeTruncated: !!treeData.truncated,
      scanners: ['Secretos (regex)', 'Dependencias (OSV.dev)', 'DevOps', 'Higiene del repo', 'Estructura', ...(ai.ok ? [`Revisión de arquitectura con IA${ai.model ? ` (${ai.model})` : ''}`] : [])],
      aiUsed: ai.ok,
      aiModel: ai.ok ? ai.model : undefined,
      aiNote: ai.ok ? undefined : ai.note,
      limitations,
    },
    checks: {
      secretsCoverage: { scanned: files.size, total: candidates },
      secretsFound: scans[0].details.some((d) => d.category === 'secrets' && d.status === 'passed')
        ? 0
        : scans[0].details.filter((d) => d.status !== 'passed').reduce((n, d) => n + (d.evidence?.length ?? 0), 0),
      branchProtected,
      hasSecurityPolicy: scans[3].details.find((d) => d.title.startsWith('Política'))?.status === 'passed',
      hasLicense: scans[3].details.find((d) => d.title === 'Licencia')?.status === 'passed',
      hasCiCd: scans[2].details.find((d) => d.title.startsWith('Pipeline'))?.status === 'passed',
    },
    auditDetails,
  };
}
