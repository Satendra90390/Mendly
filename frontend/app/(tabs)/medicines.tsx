import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@/components/ThemeProvider";
import { API_BASE } from "@/lib/config";
import { Spacing, FontSize, Radius, Shadow } from "@/constants/theme";

export default function Medicines() {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/medicines/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data.results || data.medicines || []);
    } catch { setResults([]); }
    setLoading(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search medicines..."
          placeholderTextColor={colors.mutedForeground}
          onSubmitEditing={search}
          style={[styles.searchInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        />
        <TouchableOpacity onPress={search} style={[styles.searchBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={{ padding: Spacing.lg }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.name, { color: colors.foreground }]}>{item.name || item.brand_name || "Unknown"}</Text>
              {item.manufacturer_name && <Text style={[styles.manufacturer, { color: colors.mutedForeground }]}>{item.manufacturer_name}</Text>}
              {item.active_ingredients && <Text style={[styles.ingredients, { color: colors.mutedForeground }]}>Ingredients: {item.active_ingredients}</Text>}
            </View>
          )}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.mutedForeground }]}>Search for a medicine to see results</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: { flexDirection: "row", padding: Spacing.lg, gap: Spacing.sm },
  searchInput: { flex: 1, borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md },
  searchBtn: { paddingHorizontal: Spacing.lg, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
  searchBtnText: { color: "#fff", fontWeight: "600" },
  card: { padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.sm, ...Shadow.sm },
  name: { fontSize: FontSize.md, fontWeight: "600", marginBottom: Spacing.xs },
  manufacturer: { fontSize: FontSize.sm, marginBottom: Spacing.xs },
  ingredients: { fontSize: FontSize.sm },
  empty: { textAlign: "center", marginTop: Spacing.xl, fontSize: FontSize.md },
});
