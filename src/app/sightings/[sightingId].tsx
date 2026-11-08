import { RequireSignIn } from "../../features/auth/RequireSignIn";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../components/PageHeader";
import { Screen, Copy, Card, Feedback } from "../../components/ui";
import { usePreferences } from "../../theme/preferences";
import { useSessionApi } from "../../services/session";
import { local } from "../../services/local";
import { BugDraft, BugResult } from "../../features/pollinators/BugDraft";
import { gardenData } from "../../services/garden-data";
export default function Sighting() {
  const { sightingId } = useLocalSearchParams<{ sightingId: string }>();
  return (
    <RequireSignIn returnTo={`/sightings/${sightingId}`}>
      <SignedInSighting />
    </RequireSignIn>
  );
}
function SignedInSighting() {
  const { sightingId } = useLocalSearchParams<{ sightingId: string }>();
  const { owner, api } = useSessionApi();
  const { t } = usePreferences();
  const router = useRouter();
  const query = useQueryClient();
  const key = [owner, "sighting-draft", sightingId];
  const data = useQuery({
    queryKey: key,
    queryFn: async () =>
      (await local.drafts(owner)).find(
        (d) => d.id === sightingId && d.mode === "bug",
      ) ?? null,
  });
  const saved = useQuery({
    queryKey: [owner, "garden-metadata"],
    queryFn: () => gardenData.read(owner, api),
  });
  const sighting = saved.data?.sightings.find((item) => item.id === sightingId);
  return (
    <Screen>
      <PageHeader title={t("spotted")} back />
      <Feedback
        loading={data.isPending || saved.isPending}
        error={data.error ?? saved.error}
      />
      {data.data ? (
        <BugDraft
          draft={data.data}
          onChange={(draft) => query.setQueryData(key, draft)}
          onClose={() => router.back()}
          onRetake={() => router.push("/scan")}
        />
      ) : sighting ? (
        <Card>
          {sighting.identification ? (
            <BugResult result={sighting.identification} />
          ) : (
            <Copy>{t("uncertainVerdict")}</Copy>
          )}
          <Copy muted>{t("originalLocal")}</Copy>
        </Card>
      ) : data.isSuccess && saved.isSuccess ? (
        <Copy>{t("noSightings")}</Copy>
      ) : null}
    </Screen>
  );
}
