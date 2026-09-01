"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useOrg } from "@/lib/useOrg";
import { formatUTCDate } from "@/lib/dateFormat";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  LoadingState,
  Modal,
  PageContainer,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import { Eye, HardHat, Plus, Trash2 } from "lucide-react";

type ToolboxTalk = Doc<"toolboxTalks">;
type Category = ToolboxTalk["category"];

function categoryTone(category: string): "red" | "yellow" | "blue" | "purple" | "orange" | "green" | "gray" {
  switch (category) {
    case "Fire":
      return "red";
    case "Medical":
      return "purple";
    case "Personal Protective Equipment":
      return "blue";
    case "Heavy Equipment":
    case "Power Tools":
    case "Hand Tools":
      return "orange";
    case "Material Handling":
      return "yellow";
    default:
      return "green";
  }
}

export default function ToolboxTalksAuthoringPage() {
  const { organizationId, user, isLoading, hasOrg } = useOrg();

  const categories = useQuery(api.toolboxTalks.listCategories, {});
  const talks = useQuery(
    api.toolboxTalks.list,
    organizationId ? { organizationId } : "skip"
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [viewTalkId, setViewTalkId] = useState<Id<"toolboxTalks"> | null>(null);

  // Group talks by category for display.
  const grouped = useMemo(() => {
    if (!talks) return [];
    const map = new Map<string, ToolboxTalk[]>();
    for (const talk of talks) {
      const list = map.get(talk.category) ?? [];
      list.push(talk);
      map.set(talk.category, list);
    }
    // Order groups by the canonical category list when available.
    const order = categories ?? Array.from(map.keys());
    return order
      .filter((cat: string) => map.has(cat))
      .map((cat: string) => ({ category: cat, talks: map.get(cat)! }));
  }, [talks, categories]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  if (!hasOrg) {
    return (
      <PageContainer>
        <EmptyState
          title="No organization"
          description="You are not a member of an organization yet."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Toolbox Talks"
        subtitle="Author safety training templates your supervisors deliver in the field."
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateOpen(true)}
            data-testid="new-talk-button"
          >
            New Talk
          </Button>
        }
      />

      {talks === undefined || categories === undefined ? (
        <LoadingState label="Loading talks…" />
      ) : talks.length === 0 ? (
        <EmptyState
          icon={<HardHat className="h-10 w-10" />}
          title="No toolbox talks yet"
          description="Create your first safety training template to get started."
          action={
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setCreateOpen(true)}
              data-testid="empty-new-talk-button"
            >
              New Talk
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {grouped.map((group: { category: string; talks: ToolboxTalk[] }) => (
            <section key={group.category}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {group.category}
                </h2>
                <Badge tone={categoryTone(group.category)}>
                  {group.talks.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.talks.map((talk: ToolboxTalk) => (
                  <Card key={talk._id} className="flex flex-col">
                    <CardHeader
                      title={talk.title}
                      subtitle={`${talk.questions.length} question${
                        talk.questions.length === 1 ? "" : "s"
                      } • ${formatUTCDate(talk.createdAt)}`}
                    />
                    <div className="flex flex-1 flex-col justify-between px-5 py-4">
                      <p className="line-clamp-3 text-sm text-gray-600">
                        {talk.readAloud}
                      </p>
                      <div className="mt-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Eye className="h-4 w-4" />}
                          onClick={() => setViewTalkId(talk._id)}
                          data-testid={`view-talk-${talk._id}`}
                        >
                          View details
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {createOpen && user ? (
        <CreateTalkModal
          categories={categories ?? []}
          organizationId={organizationId}
          createdBy={user._id}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}

      {viewTalkId ? (
        <ViewTalkModal
          talkId={viewTalkId}
          onClose={() => setViewTalkId(null)}
        />
      ) : null}
    </PageContainer>
  );
}

/* --------------------------------------------------------------- Create */

function CreateTalkModal({
  categories,
  organizationId,
  createdBy,
  onClose,
}: {
  categories: readonly string[];
  organizationId: string | undefined;
  createdBy: Id<"users">;
  onClose: () => void;
}) {
  const createTalk = useMutation(api.toolboxTalks.create);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(categories[0] ?? "General Safety");
  const [readAloud, setReadAloud] = useState("");
  const [questions, setQuestions] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateQuestion = (index: number, value: string) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? value : q)));
  };
  const addQuestion = () => setQuestions((prev) => [...prev, ""]);
  const removeQuestion = (index: number) =>
    setQuestions((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    setError(null);
    const cleanQuestions = questions
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!readAloud.trim()) {
      setError("Read-aloud content is required.");
      return;
    }

    setSaving(true);
    try {
      await createTalk({
        title: title.trim(),
        readAloud: readAloud.trim(),
        organizationId,
        createdBy,
        questions: cleanQuestions,
        category: category as Category,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create toolbox talk."
      );
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New Toolbox Talk"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={saving}
            data-testid="save-talk-button"
          >
            Create Talk
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Field label="Title" htmlFor="talk-title" required>
          <Input
            id="talk-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Ladder Safety"
            data-testid="talk-title-input"
          />
        </Field>

        <Field label="Category" htmlFor="talk-category" required>
          <Select
            id="talk-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            data-testid="talk-category-select"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Read-aloud content"
          htmlFor="talk-readaloud"
          required
          hint="The script the supervisor reads to the crew."
        >
          <Textarea
            id="talk-readaloud"
            rows={6}
            value={readAloud}
            onChange={(e) => setReadAloud(e.target.value)}
            placeholder="Today we will talk about…"
            data-testid="talk-readaloud-input"
          />
        </Field>

        <Field
          label="Questions"
          hint="Questions the supervisor answers when delivering the talk. Optional."
        >
          <div className="space-y-2">
            {questions.map((q, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={q}
                  onChange={(e) => updateQuestion(index, e.target.value)}
                  placeholder={`Question ${index + 1}`}
                  data-testid={`talk-question-input-${index}`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(index)}
                  disabled={questions.length === 1}
                  aria-label="Remove question"
                  data-testid={`remove-question-${index}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={addQuestion}
              data-testid="add-question-button"
            >
              Add question
            </Button>
          </div>
        </Field>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------------- View */

function ViewTalkModal({
  talkId,
  onClose,
}: {
  talkId: Id<"toolboxTalks">;
  onClose: () => void;
}) {
  const talk = useQuery(api.toolboxTalks.getById, { id: talkId });

  return (
    <Modal open onClose={onClose} title={talk?.title ?? "Toolbox Talk"} size="lg">
      {talk === undefined ? (
        <LoadingState />
      ) : talk === null ? (
        <p className="text-sm text-gray-600">Toolbox talk not found.</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Badge tone={categoryTone(talk.category)}>{talk.category}</Badge>
            <span className="text-xs text-gray-500">
              Created {formatUTCDate(talk.createdAt)}
            </span>
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Read-aloud content
            </h4>
            <p className="whitespace-pre-wrap text-sm text-gray-800">
              {talk.readAloud}
            </p>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Questions ({talk.questions.length})
            </h4>
            {talk.questions.length === 0 ? (
              <p className="text-sm text-gray-500">No questions.</p>
            ) : (
              <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-800">
                {talk.questions.map((q: string, i: number) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
