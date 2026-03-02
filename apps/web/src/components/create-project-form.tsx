import { useState } from "react";
import { api } from "../api-client.ts";

export function CreateProjectForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [providerType, setProviderType] = useState<"local" | "codespace">("local");
  const [workDir, setWorkDir] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [repo, setRepo] = useState("");
  const [machine, setMachine] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      const provider =
        providerType === "local"
          ? {
              type: "local" as const,
              workDir: workDir.trim(),
              repoUrl: repoUrl.trim() || undefined,
            }
          : { type: "codespace" as const, repo: repo.trim(), machine: machine.trim() || undefined };
      await api.createProject({ name: name.trim(), provider });
      setName("");
      setWorkDir("");
      setRepoUrl("");
      setRepo("");
      setMachine("");
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500"
          disabled={submitting}
        />
        <select
          value={providerType}
          onChange={(e) => setProviderType(e.target.value as "local" | "codespace")}
          className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-gray-500"
          disabled={submitting}
        >
          <option value="local">Local</option>
          <option value="codespace">Codespace</option>
        </select>
      </div>

      {providerType === "local" ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={workDir}
            onChange={(e) => setWorkDir(e.target.value)}
            placeholder="Work directory..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500"
            disabled={submitting}
          />
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="Repo URL (optional)..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500"
            disabled={submitting}
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500"
            disabled={submitting}
          />
          <input
            type="text"
            value={machine}
            onChange={(e) => setMachine(e.target.value)}
            placeholder="Machine type (optional)..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500"
            disabled={submitting}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={
          submitting || !name.trim() || (providerType === "local" ? !workDir.trim() : !repo.trim())
        }
        className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm px-4 py-2 rounded"
      >
        {submitting ? "Creating..." : "Create Project"}
      </button>
    </form>
  );
}
