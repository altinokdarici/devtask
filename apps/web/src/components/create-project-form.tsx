import { useState } from "react";
import { api } from "../api-client.ts";
import { Input } from "./ui/input.tsx";
import { Button } from "./ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select.tsx";

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
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name..."
          disabled={submitting}
          className="flex-1"
        />
        <Select
          value={providerType}
          onValueChange={(value) => setProviderType(value as "local" | "codespace")}
          disabled={submitting}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="local">Local</SelectItem>
            <SelectItem value="codespace">Codespace</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {providerType === "local" ? (
        <div className="flex gap-2">
          <Input
            value={workDir}
            onChange={(e) => setWorkDir(e.target.value)}
            placeholder="Work directory..."
            disabled={submitting}
            className="flex-1"
          />
          <Input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="Repo URL (optional)..."
            disabled={submitting}
            className="flex-1"
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo..."
            disabled={submitting}
            className="flex-1"
          />
          <Input
            value={machine}
            onChange={(e) => setMachine(e.target.value)}
            placeholder="Machine type (optional)..."
            disabled={submitting}
            className="flex-1"
          />
        </div>
      )}

      <Button
        type="submit"
        variant="secondary"
        disabled={
          submitting || !name.trim() || (providerType === "local" ? !workDir.trim() : !repo.trim())
        }
      >
        {submitting ? "Creating..." : "Create Project"}
      </Button>
    </form>
  );
}
