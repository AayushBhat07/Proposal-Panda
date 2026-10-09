'use client';

/**
 * The document vault: GSTIN, PAN and company certificates, encrypted with a passphrase and kept in this
 * browser only. Admins and Bid Writers can open it; the proxy keeps everyone else off this page.
 */

import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, FileText, Lock, ShieldCheck, Trash2, Upload } from 'lucide-react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useAuthStore } from '@/state/authStore';
import { useOnboarding } from '@/lib/context/OnboardingContext';
import { MIN_PASSPHRASE, useVaultStore } from '@/lib/vault/vaultStore';
import { mask } from '@/lib/vault/bidVault';
import { ALLOWED_TYPES, DOCUMENT_KINDS, MAX_FILE_BYTES, type AccessEntry, type DocumentKind, type VaultDocument } from '@/lib/vault/vault';

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;

const field = 'min-h-11 w-full border border-rule-strong bg-paper px-3 text-ink';
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function VaultPage() {
  const { user } = useAuthStore();
  const { companyProfile, setCompanyProfile } = useOnboarding();
  const vault = useVaultStore();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { check, status, session, identifiers, refresh } = vault;
  useEffect(() => {
    check();
  }, [check]);

  // Profiles saved before the vault existed hold GSTIN and PAN in the clear: move them in, then drop them.
  useEffect(() => {
    if (status !== 'unlocked' || !session || !companyProfile) return;
    const { gstin, panNumber, ...rest } = companyProfile;
    if (!gstin && !panNumber) return;
    (async () => {
      if (!identifiers) await session.saveIdentifiers({ gstin: gstin ?? '', pan: panNumber ?? '' });
      setCompanyProfile(rest);
      await refresh();
    })();
  }, [status, session, identifiers, refresh, companyProfile, setCompanyProfile]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 pt-8 pb-16 sm:px-8 lg:px-14">
      <div className="flex flex-col gap-3">
        <span className="font-mono text-xs tracking-widest text-muted">DOCUMENT VAULT · THIS COMPUTER ONLY</span>
        <h1 className="font-serif text-4xl leading-tight text-ink">Company documents</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
          GSTIN, PAN and certificates are encrypted with your vault passphrase and stored in this browser. They are
          never uploaded or sent to the AI model. The vault locks after 15 minutes without activity and when you sign
          out.
        </p>
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-seal bg-seal-tint px-4 py-3 text-sm text-seal">
          {error}
        </p>
      )}

      {vault.status === 'checking' && <Spinner size="lg" className="text-forest" />}
      {vault.status === 'none' && <SetUp busy={busy} onSubmit={p => run(() => vault.setUp(p, user!.email))} />}
      {vault.status === 'locked' && (
        <Unlock
          busy={busy}
          onSubmit={p => run(() => vault.unlock(p, user!.email))}
          onErase={() => run(vault.erase)}
        />
      )}
      {vault.status === 'unlocked' && <Unlocked run={run} busy={busy} />}
    </div>
  );
}

function SetUp({ busy, onSubmit }: { busy: boolean; onSubmit: (passphrase: string) => void }) {
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm.length > 0 && confirm !== passphrase;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (passphrase.length >= MIN_PASSPHRASE && !mismatch) onSubmit(passphrase);
  };
  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-4 border border-rule-strong bg-sheet p-6">
      <h2 className="font-serif text-2xl text-ink">Set up the vault</h2>
      <p className="text-sm leading-relaxed text-ink-soft">
        Choose a passphrase of at least {MIN_PASSPHRASE} characters, such as four unrelated words. Share it only with
        the people who prepare bids. If it is forgotten, the vault cannot be opened and documents must be added again.
      </p>
      <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
        Passphrase
        <input type="password" autoComplete="new-password" value={passphrase} onChange={e => setPassphrase(e.target.value)} className={field} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
        Type it again
        <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className={field} />
      </label>
      {mismatch && <p className="text-sm text-seal">The two passphrases don&apos;t match.</p>}
      <div>
        <Button type="submit" isLoading={busy} disabled={busy || passphrase.length < MIN_PASSPHRASE || confirm !== passphrase}>
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Create the vault
        </Button>
      </div>
    </form>
  );
}

function Unlock({ busy, onSubmit, onErase }: { busy: boolean; onSubmit: (p: string) => void; onErase: () => void }) {
  const [passphrase, setPassphrase] = useState('');
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <form
        onSubmit={e => {
          e.preventDefault();
          onSubmit(passphrase);
        }}
        className="flex flex-col gap-4 border border-rule-strong bg-sheet p-6"
      >
        <h2 className="flex items-center gap-2 font-serif text-2xl text-ink">
          <Lock className="h-5 w-5" aria-hidden /> The vault is locked
        </h2>
        <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
          Vault passphrase
          <input type="password" autoComplete="current-password" value={passphrase} onChange={e => setPassphrase(e.target.value)} className={field} />
        </label>
        <div>
          <Button type="submit" isLoading={busy} disabled={busy || !passphrase}>
            Unlock
          </Button>
        </div>
      </form>
      <button
        type="button"
        className="self-start text-sm text-muted underline hover:text-seal"
        onClick={() => {
          if (window.confirm('Erase the vault? Every document and number in it is deleted from this computer for good.')) onErase();
        }}
      >
        Forgot the passphrase? Erase the vault and start again
      </button>
    </div>
  );
}

function Unlocked({ run, busy }: { run: (action: () => Promise<void>) => Promise<void>; busy: boolean }) {
  const vault = useVaultStore();
  const session = vault.session!;
  const [log, setLog] = useState<AccessEntry[]>([]);

  useEffect(() => {
    session.readLog().then(setLog);
  }, [session, vault.documents, vault.identifiers]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-forest bg-forest-tint px-4 py-3">
        <p className="flex items-center gap-2 text-sm text-ink">
          <ShieldCheck className="h-4 w-4 text-forest" aria-hidden /> Unlocked on this computer.
        </p>
        <Button variant="outline" size="sm" onClick={vault.lock}>
          <Lock className="h-4 w-4" aria-hidden /> Lock now
        </Button>
      </div>
      <IdentifiersForm key={vault.identifiers ? 'saved' : 'empty'} run={run} busy={busy} />
      <Documents run={run} busy={busy} />
      <section aria-labelledby="access-log" className="flex flex-col gap-3">
        <h2 id="access-log" className="border-b border-ink pb-2 font-serif text-2xl text-ink">
          Access log
        </h2>
        <ol className="flex flex-col">
          {log.slice(0, 20).map((entry, i) => (
            <li key={i} className="flex flex-wrap gap-x-4 border-b border-dotted border-rule-strong py-2 text-sm">
              <span className="w-44 font-mono text-xs text-muted">{when(entry.at)}</span>
              <span className="text-ink">{entry.by}</span>
              <span className="text-ink-soft">
                {entry.action}
                {entry.detail ? `: ${entry.detail}` : ''}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function IdentifiersForm({ run, busy }: { run: (action: () => Promise<void>) => Promise<void>; busy: boolean }) {
  const vault = useVaultStore();
  const [editing, setEditing] = useState(!vault.identifiers);
  const [reveal, setReveal] = useState(false);
  const [gstin, setGstin] = useState(vault.identifiers?.gstin ?? '');
  const [pan, setPan] = useState(vault.identifiers?.pan ?? '');
  const problem =
    gstin && !GSTIN.test(gstin)
      ? 'GSTIN should be 15 characters, like 07ABCDE1234F1Z5.'
      : pan && !PAN.test(pan)
        ? 'PAN should be 10 characters, like ABCDE1234F.'
        : gstin && pan && gstin.slice(2, 12) !== pan
          ? 'The PAN inside the GSTIN (characters 3 to 12) does not match this PAN.'
          : null;

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (problem) return;
    run(async () => {
      await vault.session!.saveIdentifiers({ gstin, pan });
      await vault.refresh();
      setEditing(false);
    });
  };

  return (
    <section aria-labelledby="identifiers" className="flex flex-col gap-4 border border-rule-strong bg-sheet p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="identifiers" className="font-serif text-2xl text-ink">
          GSTIN and PAN
        </h2>
        {!editing && vault.identifiers && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setReveal(!reveal)} aria-pressed={reveal}>
              {reveal ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              {reveal ? 'Hide' : 'Show'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Change
            </Button>
          </div>
        )}
      </div>
      {editing ? (
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
            GSTIN
            <input value={gstin} onChange={e => setGstin(e.target.value.toUpperCase().trim())} autoComplete="off" className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
            PAN
            <input value={pan} onChange={e => setPan(e.target.value.toUpperCase().trim())} autoComplete="off" className={field} />
          </label>
          {problem && <p className="text-sm text-seal sm:col-span-2">{problem}</p>}
          <div>
            <Button type="submit" isLoading={busy} disabled={busy || !gstin || !pan || !!problem}>
              Save
            </Button>
          </div>
        </form>
      ) : (
        <dl className="grid gap-2 font-mono text-sm sm:grid-cols-[120px_1fr]">
          <dt className="text-muted">GSTIN</dt>
          <dd className="text-ink">{reveal ? vault.identifiers!.gstin : mask(vault.identifiers!.gstin)}</dd>
          <dt className="text-muted">PAN</dt>
          <dd className="text-ink">{reveal ? vault.identifiers!.pan : mask(vault.identifiers!.pan)}</dd>
        </dl>
      )}
      <p className="text-xs text-muted">
        Bids are drafted without these numbers. They go into the Word files only when you download them with the vault
        unlocked.
      </p>
    </section>
  );
}

function Documents({ run, busy }: { run: (action: () => Promise<void>) => Promise<void>; busy: boolean }) {
  const vault = useVaultStore();
  const [kind, setKind] = useState<DocumentKind>('gst');
  const [file, setFile] = useState<File | null>(null);

  const upload = (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    run(async () => {
      if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Only PDF, PNG and JPEG files can go in the vault.');
      if (file.size > MAX_FILE_BYTES) throw new Error('Files over 10 MB cannot go in the vault.');
      await vault.session!.addDocument(kind, file.name, file.type, new Uint8Array(await file.arrayBuffer()));
      await vault.refresh();
      setFile(null);
      (e.target as HTMLFormElement).reset();
    });
  };

  const openDoc = (doc: VaultDocument) =>
    run(async () => {
      const bytes = await vault.session!.openDocument(doc);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: doc.type }));
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });

  const remove = (doc: VaultDocument) => {
    if (!window.confirm(`Delete ${doc.name} from the vault for good?`)) return;
    run(async () => {
      await vault.session!.deleteDocument(doc);
      await vault.refresh();
    });
  };

  return (
    <section aria-labelledby="documents" className="flex flex-col gap-4">
      <h2 id="documents" className="border-b border-ink pb-2 font-serif text-2xl text-ink">
        Certificates
      </h2>
      <form onSubmit={upload} className="flex flex-wrap items-end gap-3 border border-rule-strong bg-sheet p-5">
        <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-sm text-ink-soft">
          What it is
          <select value={kind} onChange={e => setKind(e.target.value as DocumentKind)} className={field}>
            {Object.entries(DOCUMENT_KINDS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-sm text-ink-soft">
          File (PDF, PNG or JPEG, up to 10 MB)
          <input
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="min-h-11 text-sm text-ink file:mr-3 file:min-h-9 file:border file:border-rule-strong file:bg-paper file:px-3 file:text-ink"
          />
        </label>
        <Button type="submit" isLoading={busy} disabled={busy || !file}>
          <Upload className="h-4 w-4" aria-hidden /> Add to vault
        </Button>
      </form>
      {vault.documents.length === 0 ? (
        <p className="text-sm text-muted">No certificates yet.</p>
      ) : (
        <ul className="flex flex-col">
          {vault.documents.map(doc => (
            <li key={doc.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-dotted border-rule-strong py-3">
              <FileText className="h-4 w-4 text-muted" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-ink">{doc.name}</span>
                <span className="text-xs text-muted">
                  {DOCUMENT_KINDS[doc.kind]} · {(doc.size / 1024).toFixed(0)} KB · added {when(doc.uploadedAt)} by {doc.uploadedBy}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => openDoc(doc)}>
                Open
              </Button>
              <Button variant="ghost" size="sm" onClick={() => remove(doc)} aria-label={`Delete ${doc.name}`}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
