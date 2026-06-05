'use client';
import { useState, useRef } from 'react';
import JSZip from 'jszip';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { ArrowLeft } from 'lucide-react';
import type { ClassificacaoIA } from '@/types';

type BulkStage = 'idle' | 'extracting' | 'previewing' | 'processing' | 'done';
type DupStatus  = 'novo' | 'possivel' | 'duplicado';
type ProcStatus = 'waiting' | 'processing' | 'ok' | 'erro';

interface CatalogEntry {
  sku:       string;
  nome:      string;
  categoria: string;
  tags:      string[];
}

interface BulkItem {
  name:         string;
  relativePath: string;
  file:         File;
  preview:      string;
  hash:         string;
  skuHint:      string;
  nomeHint:     string;
  dupStatus:    DupStatus;
  selected:     boolean;
  procStatus:   ProcStatus;
  error?:       string;
}

interface UploadResponse {
  classificacao: ClassificacaoIA;
  image_url:     string;
  error?:        string;
}

const ACCEPTED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const MIME_MAP: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const DUP_BADGE: Record<DupStatus, { emoji: string; label: string; bg: string; color: string }> = {
  novo:      { emoji: '🟢', label: 'Novo',      bg: '#dcfce7', color: '#166534' },
  possivel:  { emoji: '🟡', label: 'Verificar', bg: '#fef9c3', color: '#854d0e' },
  duplicado: { emoji: '🔴', label: 'Duplicado', bg: '#fee2e2', color: '#991b1b' },
};

const PROC_ICON: Record<ProcStatus, string> = {
  waiting:    '⏳',
  processing: '⚙️',
  ok:         '✅',
  erro:       '❌',
};

function lookupCatalog(hint: string, catalog: CatalogEntry[]): CatalogEntry | undefined {
  if (!hint || !catalog.length) return undefined;
  const h = hint.toUpperCase().replace(/\s+/g, '');
  // Exact or prefix match on SKU
  let match = catalog.find(p => {
    const s = p.sku.toUpperCase();
    return s === h || s.startsWith(h) || h.startsWith(s);
  });
  // Fallback: match words against tags or name
  if (!match) {
    const words = hint.toLowerCase().split(/[\s\-_]+/).filter(w => w.length > 3);
    match = catalog.find(p =>
      words.some(w => p.tags.includes(w) || p.nome.toLowerCase().includes(w) || p.sku.toLowerCase().includes(w))
    );
  }
  return match;
}

function extractSkuHint(relativePath: string, filename: string): string {
  const parts = relativePath.split('/');
  // Folder name → SKU (e.g. LBG100/frontal.jpg → LBG100)
  if (parts.length >= 2 && parts[0].trim()) {
    return parts[0].trim();
  }
  // Filename prefix before first - or _ (e.g. LBG100-frontal.jpg → LBG100)
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  const match = nameWithoutExt.match(/^([A-Za-z0-9]+)/);
  return match ? match[1] : '';
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function BulkUploadPage() {
  const zipRef = useRef<HTMLInputElement>(null);
  const [stage,    setStage]    = useState<BulkStage>('idle');
  const [items,    setItems]    = useState<BulkItem[]>([]);
  const [drag,     setDrag]     = useState(false);
  const [error,    setError]    = useState('');
  const [progress, setProgress] = useState(0);
  const [procIdx,  setProcIdx]  = useState(0);
  const [totalSel, setTotalSel] = useState(0);
  const [summary,  setSummary]  = useState({ novos: 0, pulados: 0, erros: 0 });
  const [hashWarn, setHashWarn] = useState('');

  async function handleZip(zipFile: File) {
    if (!zipFile.name.toLowerCase().endsWith('.zip')) {
      setError('Selecione um arquivo ZIP.');
      return;
    }
    const MAX_ZIP_MB = 200;
    if (zipFile.size > MAX_ZIP_MB * 1024 * 1024) {
      setError(`Arquivo ZIP muito grande (máx ${MAX_ZIP_MB}MB). Divida em lotes menores.`);
      return;
    }
    setError('');
    setStage('extracting');
    setProgress(0);

    try {
      const zip = await JSZip.loadAsync(zipFile);

      type Entry = { entry: JSZip.JSZipObject; filename: string; relativePath: string };
      const entries: Entry[] = [];

      zip.forEach((relativePath, entry) => {
        if (entry.dir) return;
        if (relativePath.includes('__MACOSX')) return;
        const parts    = relativePath.split('/');
        const filename = parts[parts.length - 1];
        if (filename.startsWith('._')) return;
        if (parts.length - 1 > 1) return;
        const ext = filename.split('.').pop()?.toLowerCase() ?? '';
        if (!ACCEPTED_EXTS.has(ext)) return;
        entries.push({ entry, filename, relativePath });
      });

      if (entries.length === 0) {
        setError('Nenhuma imagem encontrada no ZIP (aceitos: JPG, PNG, WEBP).');
        setStage('idle');
        return;
      }

      // Busca paralela: hashes existentes + catálogo SKU
      let existingHashes: Array<{ hash_sha256: string | null; arquivo_original: string | null }> = [];
      let skuCatalog: CatalogEntry[] = [];
      let hashFetchError = '';
      await Promise.all([
        fetch('/api/produtos/hashes')
          .then(async r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .then(d => { existingHashes = d as typeof existingHashes; })
          .catch(e => { hashFetchError = e instanceof Error ? e.message : 'erro desconhecido'; }),
        fetch('/api/sku-catalog').then(r => r.ok ? r.json() : []).then(d => { skuCatalog = d as CatalogEntry[]; }).catch(() => {}),
      ]);

      if (hashFetchError) {
        setHashWarn(`⚠️ Não foi possível carregar os hashes do banco (${hashFetchError}). Verificação de duplicatas desativada. Verifique se a coluna hash_sha256 existe na tabela produtos.`);
      } else {
        setHashWarn('');
      }

      const hashSet      = new Set(existingHashes.map(h => h.hash_sha256).filter((h): h is string => h !== null));
      const nameSet      = new Set(existingHashes.map(h => h.arquivo_original).filter((h): h is string => h !== null));
      const localHashSet = new Set<string>(); // dedup dentro do mesmo ZIP

      const newItems: BulkItem[] = [];

      for (let i = 0; i < entries.length; i++) {
        const { entry, filename, relativePath } = entries[i];
        const ext      = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
        const mime     = MIME_MAP[ext] ?? 'image/jpeg';
        const bytes    = await entry.async('arraybuffer');
        const hash     = await sha256Hex(bytes);
        const file     = new File([bytes], filename, { type: mime });
        const preview  = URL.createObjectURL(new Blob([bytes], { type: mime }));
        const skuHint     = extractSkuHint(relativePath, filename);
        const catalogHit  = lookupCatalog(skuHint, skuCatalog);
        const finalSku    = catalogHit ? catalogHit.sku    : skuHint;
        const nomeHint    = catalogHit ? catalogHit.nome   : '';

        let dupStatus: DupStatus = 'novo';
        if (hashSet.has(hash) || localHashSet.has(hash)) dupStatus = 'duplicado';
        else if (nameSet.has(relativePath))              dupStatus = 'possivel';

        localHashSet.add(hash);
        newItems.push({ name: filename, relativePath, file, preview, hash, skuHint: finalSku, nomeHint, dupStatus, selected: dupStatus !== 'duplicado', procStatus: 'waiting' });
        setProgress(Math.round(((i + 1) / entries.length) * 100));
      }

      setItems(newItems);
      setStage('previewing');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao ler o ZIP.');
      setStage('idle');
    }
  }

  function toggleItem(i: number) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, selected: !it.selected } : it));
  }

  function toggleAll(val: boolean) {
    setItems(prev => prev.map(it => ({ ...it, selected: val })));
  }

  async function startProcessing() {
    const selIndices = items
      .map((it, i) => ({ it, i }))
      .filter(({ it }) => it.selected)
      .map(({ i }) => i);

    if (selIndices.length === 0) return;

    const pulados = items.filter(it => !it.selected).length;
    setStage('processing');
    setTotalSel(selIndices.length);
    setProcIdx(0);
    setProgress(0);

    let novos = 0;
    let erros = 0;

    for (let si = 0; si < selIndices.length; si++) {
      const idx  = selIndices[si];
      const item = items[idx];
      setProcIdx(si + 1);

      setItems(prev => prev.map((it, i) => i === idx ? { ...it, procStatus: 'processing' } : it));

      try {
        const fd = new FormData();
        fd.append('file', item.file);
        if (item.skuHint) fd.append('sku', item.skuHint);
        const upRes  = await fetch('/api/upload', { method: 'POST', body: fd });
        const upData = await upRes.json() as UploadResponse;
        if (!upRes.ok) throw new Error(upData.error ?? 'Erro no upload');

        const produto = {
          ...upData.classificacao,
          image_url:        upData.image_url,
          hash_sha256:      item.hash,
          arquivo_original: item.relativePath,
        };

        const saveRes  = await fetch('/api/produtos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(produto) });
        const saveData = await saveRes.json() as { error?: string };
        if (!saveRes.ok) throw new Error(saveData.error ?? 'Erro ao salvar');

        setItems(prev => prev.map((it, i) => i === idx ? { ...it, procStatus: 'ok' } : it));
        novos++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erro desconhecido';
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, procStatus: 'erro', error: msg } : it));
        erros++;
      }

      setProgress(Math.round(((si + 1) / selIndices.length) * 100));
    }

    setSummary({ novos, pulados, erros });
    setStage('done');
  }

  const selectedCount = items.filter(it => it.selected).length;

  return (
    <AppLayout>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/novo" className="btn btn-ghost btn-sm" style={{ padding: '0.4rem 0.625rem' }}>
            <ArrowLeft size={16} />
          </Link>
          <h1 className="page-title">Importar em Lote</h1>
        </div>
      </div>

      <div className="page-content" style={{ maxWidth: 960 }}>

        {stage === 'idle' && (
          <>
            <div
              className={`upload-zone ${drag ? 'drag-over' : ''}`}
              onClick={() => zipRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleZip(f); }}
              style={{ padding: '4rem 2rem' }}
            >
              <div className="upload-zone-icon">📦</div>
              <p style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: 8 }}>Arraste o arquivo ZIP aqui</p>
              <p className="upload-zone-text">Imagens JPG, PNG ou WEBP · Subpastas de até 1 nível aceitas</p>
              <input
                ref={zipRef}
                type="file"
                accept=".zip"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleZip(f); }}
              />
            </div>
            {error && (
              <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                <span>⚠️</span>{error}
              </div>
            )}
          </>
        )}

        {stage === 'extracting' && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</p>
            <p style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '1.5rem' }}>
              Extraindo e verificando duplicatas...
            </p>
            <ProgressBar value={progress} />
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem' }}>{progress}%</p>
          </div>
        )}

        {stage === 'previewing' && (
          <>
            {hashWarn && (
              <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
                <span>⚠️</span>{hashWarn}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
                  {items.length} imagem{items.length !== 1 ? 's' : ''} encontrada{items.length !== 1 ? 's' : ''}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  {selectedCount} selecionada{selectedCount !== 1 ? 's' : ''} para importar
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleAll(true)}>Selecionar todas</button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleAll(false)}>Limpar seleção</button>
                <button className="btn btn-gold" onClick={startProcessing} disabled={selectedCount === 0}>
                  Importar {selectedCount > 0 ? `${selectedCount} foto${selectedCount !== 1 ? 's' : ''}` : ''}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {(Object.keys(DUP_BADGE) as DupStatus[]).map(k => {
                const b = DUP_BADGE[k];
                const count = items.filter(it => it.dupStatus === k).length;
                if (count === 0) return null;
                return (
                  <span key={k} style={{ fontSize: '0.72rem', padding: '0.2rem 0.625rem', borderRadius: 4, background: b.bg, color: b.color, fontWeight: 500 }}>
                    {b.emoji} {b.label} ({count})
                  </span>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.875rem' }}>
              {items.map((item, i) => {
                const badge = DUP_BADGE[item.dupStatus];
                return (
                  <div
                    key={`${item.name}-${i}`}
                    onClick={() => toggleItem(i)}
                    style={{
                      border:     `2px solid ${item.selected ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 8,
                      overflow:   'hidden',
                      cursor:     'pointer',
                      opacity:    item.selected ? 1 : 0.45,
                      transition: 'all 0.15s',
                      background: 'var(--surface)',
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.preview}
                        alt={item.name}
                        style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
                      />
                      <span style={{ position: 'absolute', top: 5, left: 5, background: badge.bg, color: badge.color, borderRadius: 3, fontSize: '0.6rem', padding: '0.1rem 0.35rem', fontWeight: 600 }}>
                        {badge.emoji} {badge.label}
                      </span>
                      <span style={{
                        position: 'absolute', top: 5, right: 5,
                        width: 18, height: 18, borderRadius: '50%',
                        background: item.selected ? 'var(--accent)' : 'rgba(0,0,0,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '0.65rem', fontWeight: 700,
                      }}>
                        {item.selected ? '✓' : ''}
                      </span>
                    </div>
                    <div style={{ padding: '0.4rem 0.5rem' }}>
                      {item.skuHint && (
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1 }}>
                          {item.skuHint}
                        </p>
                      )}
                      {item.nomeHint && (
                        <p style={{ fontSize: '0.6rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1 }}>
                          {item.nomeHint}
                        </p>
                      )}
                      <p style={{ fontSize: '0.6rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {stage === 'processing' && (
          <div style={{ maxWidth: 640 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>
              Processando {procIdx} de {totalSel}...
            </p>
            <ProgressBar value={progress} />
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
              {progress}% — cada foto passa pelo Claude Vision e é salva no catálogo
            </p>

            <div style={{ border: '1px solid var(--border)', borderRadius: 6, maxHeight: 360, overflowY: 'auto' }}>
              {items.filter(it => it.selected).map((item, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid #f5f5f4' }}
                >
                  <span style={{ flexShrink: 0 }}>{PROC_ICON[item.procStatus]}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  {item.error && (
                    <span style={{ color: '#991b1b', fontSize: '0.7rem', flexShrink: 0, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', paddingTop: '2rem' }}>
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              Importação concluída
            </h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', margin: '1.5rem 0', flexWrap: 'wrap' }}>
              <SummaryCard value={summary.novos}   label="Salvos"  color="#166534" bg="#dcfce7" />
              <SummaryCard value={summary.pulados} label="Pulados" color="#854d0e" bg="#fef9c3" />
              <SummaryCard value={summary.erros}   label="Erros"   color="#991b1b" bg="#fee2e2" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                className="btn btn-outline"
                onClick={() => { items.forEach(it => URL.revokeObjectURL(it.preview)); setStage('idle'); setItems([]); setProgress(0); setError(''); setHashWarn(''); }}
              >
                Nova importação
              </button>
              <Link href="/catalogo" className="btn btn-primary">Ver catálogo</Link>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ background: '#e7e5e4', borderRadius: 4, height: 8, overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 4, background: 'var(--accent)', width: `${value}%`, transition: 'width 0.3s ease' }} />
    </div>
  );
}

function SummaryCard({ value, label, color, bg }: { value: number; label: string; color: string; bg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 8, padding: '1rem 1.5rem', minWidth: 100 }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 600, color, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: '0.8rem', color, marginTop: '0.375rem', fontWeight: 500 }}>{label}</p>
    </div>
  );
}
