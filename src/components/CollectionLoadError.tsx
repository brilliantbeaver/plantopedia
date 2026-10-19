import { View } from "react-native";
import { usePreferences } from "../theme/preferences";
import { Action, Card, Copy } from "./ui";

export function CollectionLoadError({
  refreshing,
  hasSavedPlants = false,
  onRetry,
}: {
  refreshing: boolean;
  hasSavedPlants?: boolean;
  onRetry: () => void;
}) {
  const { t } = usePreferences();
  return (
    <Card>
      <View accessibilityLiveRegion="polite">
        <Copy>{t("collectionLoadError")}</Copy>
        <Copy muted>
          {t(hasSavedPlants ? "collectionStale" : "collectionLoadHelp")}
        </Copy>
      </View>
      <Action
        secondary
        title={t("tryAgain")}
        busy={refreshing}
        onPress={onRetry}
      />
    </Card>
  );
}
