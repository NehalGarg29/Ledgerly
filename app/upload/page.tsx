"use client";

import { useEffect, useState } from "react";
import { useRole } from "../../lib/useRole";
import StatCard, { StatCardGrid } from "../../components/StatCard";
import { CheckCircleIcon, ListIcon } from "../../components/icons";

type DataType = "bank" | "gl";
type Format = "auto" | "csv" | "json" | "bai2";
type Stage = "idle" | "reviewing" | "done";

type BankPreviewRow = {
  accountId: string;
  date: string;
  amountCents: number;
  memo: string;
  sourceFormat: string;
};

type GlPreviewRow = {
  fundId: string;
  accountCode: string;
  amountCents: number;
  date: string;
  description: string;
};

type CommitResult = { ingested: number; exactMatches: number; fuzzyMatches: number };

type UploadBatchSummary = {
  id: string;
  source: string;
  filename: string;
  rowCount: number;
  createdAt: string;
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export default function UploadPage() {
  const role = useRole();
  const canUpload = role !== "viewer";

  const [dataType, setDataType] = useState<DataType>("bank");
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<Format>("auto");

  const [stage, setStage] = useState<Stage>("idle");
  const [previewRows, setPreviewRows] = useState<(BankPreviewRow | GlPreviewRow)[]>([]);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [batches, setBatches] = useState<UploadBatchSummary[]>([]);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidError, setVoidError] = useState("");

  function loadBatches() {
    fetch("/api/upload-batches")
      .then((r) => r.json())
      .then((d) => setBatches(d.batches ?? []))
      .catch(() => {});
  }

  useEffect(() => {
    loadBatches();
  }, []);

  async function handleVoid(batchId: string, filename: string) {
    if (
      !window.confirm(
        `Void the upload "${filename}"? This deletes every transaction/GL entry it created and any matches tied to them. This can't be undone.`
      )
    ) {
      return;
    }
    setVoidingId(batchId);
    setVoidError("");
    try {
      const res = await fetch(`/api/upload-batches/${batchId}/void`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }
      loadBatches();
    } catch (err) {
      setVoidError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setVoidingId(null);
    }
  }

  function reset() {
    setFile(null);
    setStage("idle");
    setPreviewRows([]);
    setCommitResult(null);
    setError(null);
  }

  function buildFormData(mode: "preview" | "commit") {
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    if (dataType === "bank" && format !== "auto") formData.append("format", format);
    return formData;
  }

  async function handlePreview() {
    const formData = buildFormData("preview");
    if (!formData) return;

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = dataType === "bank" ? "/api/ingest" : "/api/ingest-gl";
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `Request failed: ${res.status}`);
        return;
      }

      setPreviewRows(data.preview);
      setStage("reviewing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirm() {
    const formData = buildFormData("commit");
    if (!formData) return;

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = dataType === "bank" ? "/api/ingest" : "/api/ingest-gl";
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `Request failed: ${res.status}`);
        return;
      }

      setCommitResult(data);
      setStage("done");
      loadBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <p className="text-sm text-zinc-500">
        Upload your own bank transaction or GL entry file. It gets parsed into the canonical shape
        and shown to you before anything is saved.
      </p>

      {!canUpload && (
        <p className="mt-4 rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
          Viewing as Viewer — you can preview files, but need an analyst or admin account to actually ingest them.
        </p>
      )}

      {batches.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Recent uploads</h2>
            <span className="text-xs text-zinc-400">{batches.length} batch{batches.length === 1 ? "" : "es"}</span>
          </div>
          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">File</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium text-right">Rows</th>
                  <th className="px-4 py-2 font-medium">Uploaded</th>
                  {canUpload && <th className="px-4 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900">{b.filename}</td>
                    <td className="px-4 py-2">
                      <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                        {b.source}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-600">{b.rowCount}</td>
                    <td className="px-4 py-2 text-xs text-zinc-500">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                    {canUpload && (
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleVoid(b.id, b.filename)}
                          disabled={voidingId !== null}
                          className="rounded-md border border-red-600 px-2.5 py-1 text-xs font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {voidingId === b.id ? "Voiding…" : "Void"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {voidError && <p className="mt-2 text-xs text-red-600">{voidError}</p>}
        </div>
      )}

      {stage === "idle" && (
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Upload a file</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Choose what kind of data this is, pick a file, and preview it before anything is saved.
          </p>

          <label className="mt-6 block text-sm font-medium text-zinc-900">Data type</label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setDataType("bank")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                dataType === "bank"
                  ? "bg-teal-700 text-white"
                  : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              Bank Transactions
            </button>
            <button
              type="button"
              onClick={() => setDataType("gl")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                dataType === "gl"
                  ? "bg-teal-700 text-white"
                  : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              GL Entries
            </button>
          </div>

          <label className="mt-5 block text-sm font-medium text-zinc-900">File</label>
          <input
            type="file"
            accept={dataType === "bank" ? ".csv,.json,.txt,.bai2" : ".csv"}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-2 block w-full text-sm text-zinc-700 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100"
          />

          {dataType === "bank" && (
            <>
              <label className="mt-5 block text-sm font-medium text-zinc-900">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as Format)}
                className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm text-zinc-900 focus:border-teal-400 focus:outline-none"
              >
                <option value="auto">Auto-detect from filename</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="bai2">BAI2</option>
              </select>
            </>
          )}

          {dataType === "gl" && (
            <p className="mt-2 text-xs text-zinc-500">
              GL entries are expected as CSV with columns: fundId, accountCode, amount, date, description.
            </p>
          )}

          <button
            type="button"
            onClick={handlePreview}
            disabled={!file || isLoading}
            className="mt-6 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? "Parsing…" : "Preview"}
          </button>

          {error && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>
      )}

      {stage === "reviewing" && (
        <div className="mt-8">
          <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-800">
              Parsed {previewRows.length} row{previewRows.length === 1 ? "" : "s"} into the
              canonical shape. Nothing has been saved yet — review below, then confirm.
            </p>
            <button
              type="button"
              onClick={reset}
              className="shrink-0 text-sm font-medium text-amber-700 hover:text-amber-900"
            >
              Cancel
            </button>
          </div>

          <div className="mt-4 max-h-96 overflow-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                {dataType === "bank" ? (
                  <tr>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Account</th>
                    <th className="px-4 py-2 font-medium">Memo</th>
                    <th className="px-4 py-2 font-medium">Source</th>
                    <th className="px-4 py-2 font-medium text-right">Amount</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Fund</th>
                    <th className="px-4 py-2 font-medium">Account Code</th>
                    <th className="px-4 py-2 font-medium">Description</th>
                    <th className="px-4 py-2 font-medium text-right">Amount</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {dataType === "bank"
                  ? (previewRows as BankPreviewRow[]).map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-zinc-900">{row.date}</td>
                        <td className="px-4 py-2 text-zinc-900">{row.accountId}</td>
                        <td className="px-4 py-2 text-zinc-500">{row.memo}</td>
                        <td className="px-4 py-2 text-xs uppercase text-zinc-500">
                          {row.sourceFormat}
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-medium ${
                            row.amountCents < 0 ? "text-red-600" : "text-zinc-900"
                          }`}
                        >
                          {formatCents(row.amountCents)}
                        </td>
                      </tr>
                    ))
                  : (previewRows as GlPreviewRow[]).map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-zinc-900">{row.date}</td>
                        <td className="px-4 py-2 text-zinc-900">{row.fundId}</td>
                        <td className="px-4 py-2 text-zinc-900">{row.accountCode}</td>
                        <td className="px-4 py-2 text-zinc-500">{row.description}</td>
                        <td
                          className={`px-4 py-2 text-right font-medium ${
                            row.amountCents < 0 ? "text-red-600" : "text-zinc-900"
                          }`}
                        >
                          {formatCents(row.amountCents)}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canUpload || isLoading}
            title={canUpload ? undefined : "Viewers cannot ingest data"}
            className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? "Ingesting…" : `Confirm & Ingest ${previewRows.length} Rows`}
          </button>

          {error && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>
      )}

      {stage === "done" && commitResult && (
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              {CheckCircleIcon}
            </span>
            <p className="text-sm font-medium text-zinc-900">Upload complete</p>
          </div>

          <div className="mt-4">
            <StatCardGrid>
              <StatCard
                label="Records Ingested"
                value={commitResult.ingested.toString()}
                icon={ListIcon}
                iconBg="bg-zinc-100 text-zinc-600"
              />
              <StatCard
                label="Exact Matches"
                value={commitResult.exactMatches.toString()}
                icon={CheckCircleIcon}
                accent="text-emerald-600"
                iconBg="bg-emerald-50 text-emerald-600"
              />
              <StatCard
                label="Fuzzy Matches"
                value={commitResult.fuzzyMatches.toString()}
                icon={CheckCircleIcon}
                accent="text-amber-600"
                iconBg="bg-amber-50 text-amber-600"
              />
            </StatCardGrid>
          </div>

          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Upload Another File
          </button>
        </div>
      )}
    </main>
  );
}