"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from "@afenda/ui";
import {
  createAnnouncement,
  fetchAnnouncementAudienceOptions,
  type AnnouncementAudienceOptions,
} from "@/lib/api-client";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [selectedAudienceIds, setSelectedAudienceIds] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [audienceOptions, setAudienceOptions] = useState<AnnouncementAudienceOptions>({
    teams: [],
    roles: [],
  });
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    audienceType: "org",
    scheduledAt: "",
  });

  useEffect(() => {
    let disposed = false;

    async function loadAudienceOptions() {
      setIsLoadingOptions(true);
      try {
        const result = await fetchAnnouncementAudienceOptions();
        if (!disposed) {
          setAudienceOptions(result.data);
        }
      } catch {
        if (!disposed) {
          setAudienceOptions({ teams: [], roles: [] });
        }
      } finally {
        if (!disposed) {
          setIsLoadingOptions(false);
        }
      }
    }

    void loadAudienceOptions();
    return () => {
      disposed = true;
    };
  }, []);

  const selectableTargets = useMemo(() => {
    return formData.audienceType === "team" ? audienceOptions.teams : audienceOptions.roles;
  }, [audienceOptions.roles, audienceOptions.teams, formData.audienceType]);

  function toggleAudienceId(id: string, checked: boolean) {
    setSelectedAudienceIds((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((currentId) => currentId !== id);
    });
  }

  function setAudienceType(value: string) {
    setFormData({ ...formData, audienceType: value });
    if (value === "org") {
      setSelectedAudienceIds([]);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (formData.audienceType !== "org" && selectedAudienceIds.length === 0) {
      setSubmitError("Select at least one audience target for team/role announcements.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createAnnouncement({
        title: formData.title,
        body: formData.body,
        audienceType: formData.audienceType,
        audienceIds: formData.audienceType === "org" ? [] : selectedAudienceIds,
        scheduledAt: formData.scheduledAt
          ? new Date(formData.scheduledAt).toISOString()
          : undefined,
      });

      router.push(`/comm/announcements/${result.data.id}`);
    } catch (err) {
      setSubmitError(`Failed to create announcement: ${String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Create Announcement</h1>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>New Announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Announcement title"
              />
            </div>

            <div>
              <Label htmlFor="body">Body *</Label>
              <Textarea
                id="body"
                required
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Announcement content"
                rows={6}
              />
            </div>

            <div>
              <Label htmlFor="audienceType">Audience *</Label>
              <Select value={formData.audienceType} onValueChange={setAudienceType}>
                <SelectTrigger id="audienceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org">Organization-wide</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="role">By role</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.audienceType !== "org" ? (
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>
                    {formData.audienceType === "team" ? "Select teams" : "Select roles"}
                  </Label>
                  <Badge variant="outline">{selectedAudienceIds.length} selected</Badge>
                </div>

                {isLoadingOptions ? (
                  <p className="text-sm text-muted-foreground">Loading audience options...</p>
                ) : selectableTargets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No selectable targets found for this audience type.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-auto">
                    {selectableTargets.map((option) => {
                      const checked = selectedAudienceIds.includes(option.id);
                      return (
                        <div key={option.id} className="flex items-start gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => toggleAudienceId(option.id, value === true)}
                          />
                          <Label>{option.label}</Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            <div>
              <Label htmlFor="scheduledAt">Schedule publish (optional)</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Leave empty to save as draft</p>
            </div>

            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/comm/announcements")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
