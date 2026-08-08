"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { BlogPost } from "@/db/schema";
import { deleteBlogPostAction } from "../actions/delete-blog-post.action";
import { generateBlogDraftAction } from "../actions/generate-blog-draft.action";
import { saveBlogPostAction } from "../actions/save-blog-post.action";

interface PostFormState {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  isPublished: boolean;
}

const EMPTY_FORM: PostFormState = { title: "", slug: "", excerpt: "", content: "", coverImageUrl: "", isPublished: false };

export function BlogManager({ initialPosts }: { initialPosts: BlogPost[] }) {
  const t = useTranslations("website.blog");
  const tCommon = useTranslations("common");
  const [posts, setPosts] = useState(initialPosts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PostFormState>(EMPTY_FORM);
  const [newForm, setNewForm] = useState<PostFormState>(EMPTY_FORM);
  const [topic, setTopic] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  function startEdit(post: BlogPost) {
    setEditingId(post.id);
    setEditForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      content: post.content,
      coverImageUrl: post.coverImageUrl ?? "",
      isPublished: post.isPublished,
    });
  }

  async function saveEdit(id: string) {
    setIsSaving(true);
    const result = await saveBlogPostAction({ id, ...editForm });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setPosts((current) => current.map((post) => (post.id === id ? result.data : post)));
    setEditingId(null);
    toast.success(tCommon("saved"));
  }

  async function handleDelete(id: string) {
    if (!window.confirm(tCommon("confirmDelete"))) return;

    const result = await deleteBlogPostAction({ id });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setPosts((current) => current.filter((post) => post.id !== id));
  }

  async function handleAdd() {
    if (!newForm.title.trim() || !newForm.content.trim()) return;

    setIsSaving(true);
    const result = await saveBlogPostAction(newForm);
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setPosts((current) => [result.data, ...current]);
    setNewForm(EMPTY_FORM);
    setTopic("");
  }

  async function handleGenerate() {
    if (!topic.trim()) return;

    setIsGenerating(true);
    const result = await generateBlogDraftAction({ topic });
    setIsGenerating(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setNewForm((form) => ({ ...form, title: result.data.title, excerpt: result.data.excerpt, content: result.data.content }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("heading")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {posts.length === 0 && <p className="text-sm text-muted-foreground">{t("noPosts")}</p>}
        {posts.map((post) =>
          editingId === post.id ? (
            <div key={post.id} className="space-y-2 rounded-lg border border-input p-2">
              <Input
                value={editForm.title}
                onChange={(event) => setEditForm((form) => ({ ...form, title: event.target.value }))}
                placeholder={t("titlePlaceholder")}
              />
              <Input
                value={editForm.slug}
                onChange={(event) => setEditForm((form) => ({ ...form, slug: event.target.value }))}
                placeholder={t("slugPlaceholder")}
              />
              <Input
                value={editForm.excerpt}
                onChange={(event) => setEditForm((form) => ({ ...form, excerpt: event.target.value }))}
                placeholder={t("excerptPlaceholder")}
              />
              <Input
                value={editForm.coverImageUrl}
                onChange={(event) => setEditForm((form) => ({ ...form, coverImageUrl: event.target.value }))}
                placeholder={t("coverImagePlaceholder")}
              />
              <Textarea
                value={editForm.content}
                onChange={(event) => setEditForm((form) => ({ ...form, content: event.target.value }))}
                placeholder={t("contentPlaceholder")}
                rows={6}
              />
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={editForm.isPublished}
                  onCheckedChange={(checked) => setEditForm((form) => ({ ...form, isPublished: checked }))}
                />
                {t("publishedLabel")}
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                  {tCommon("cancel")}
                </Button>
                <Button type="button" size="sm" disabled={isSaving} onClick={() => saveEdit(post.id)}>
                  {tCommon("save")}
                </Button>
              </div>
            </div>
          ) : (
            <div key={post.id} className="flex items-start justify-between gap-2 rounded-lg border border-input p-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{post.title}</p>
                  {!post.isPublished && <span className="text-xs text-muted-foreground">{t("draftLabel")}</span>}
                </div>
                <p className="text-sm text-muted-foreground">{post.excerpt || post.content.slice(0, 120)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(post)}>
                  {tCommon("edit")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(post.id)}>
                  {tCommon("delete")}
                </Button>
              </div>
            </div>
          ),
        )}

        <div className="space-y-2 rounded-lg border border-dashed border-input p-2">
          <div className="flex gap-2">
            <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder={t("topicPlaceholder")} />
            <Button type="button" variant="outline" size="sm" disabled={isGenerating} onClick={handleGenerate}>
              {isGenerating ? t("generating") : t("generateWithAi")}
            </Button>
          </div>
          <Input
            value={newForm.title}
            onChange={(event) => setNewForm((form) => ({ ...form, title: event.target.value }))}
            placeholder={t("titlePlaceholder")}
          />
          <Input
            value={newForm.slug}
            onChange={(event) => setNewForm((form) => ({ ...form, slug: event.target.value }))}
            placeholder={t("slugPlaceholder")}
          />
          <Input
            value={newForm.excerpt}
            onChange={(event) => setNewForm((form) => ({ ...form, excerpt: event.target.value }))}
            placeholder={t("excerptPlaceholder")}
          />
          <Input
            value={newForm.coverImageUrl}
            onChange={(event) => setNewForm((form) => ({ ...form, coverImageUrl: event.target.value }))}
            placeholder={t("coverImagePlaceholder")}
          />
          <Textarea
            value={newForm.content}
            onChange={(event) => setNewForm((form) => ({ ...form, content: event.target.value }))}
            placeholder={t("contentPlaceholder")}
            rows={6}
          />
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={newForm.isPublished}
              onCheckedChange={(checked) => setNewForm((form) => ({ ...form, isPublished: checked }))}
            />
            {t("publishedLabel")}
          </label>
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={handleAdd}>
              {t("addPost")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
