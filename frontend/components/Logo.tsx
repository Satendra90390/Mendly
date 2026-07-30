import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/components/ThemeProvider";
import { FontSize, Spacing } from "@/constants/theme";

const SIZES = { sm: 28, md: 36, lg: 48 } as const;

interface LogoProps {
  size?: keyof typeof SIZES;
  showText?: boolean;
}

export default function Logo({ size = "md", showText = true }: LogoProps) {
  const { colors } = useTheme();
  const px = SIZES[size];
  const textSize = size === "lg" ? FontSize.xl : size === "md" ? FontSize.lg : FontSize.sm;

  return (
    <View style={[styles.container, { gap: Spacing.sm }]}>
      <View style={[styles.icon, { width: px, height: px, borderRadius: px * 0.3, backgroundColor: colors.primary }]}>
        <View style={[styles.innerRing, { width: px * 0.5, height: px * 0.5, borderRadius: px * 0.25, borderColor: "rgba(255,255,255,0.3)" }]} />
        <View style={styles.cross}>
          <View style={[styles.crossBar, { width: px * 0.3, height: px * 0.08, backgroundColor: "#fff", top: px * 0.3 }]} />
          <View style={[styles.crossBar, { width: px * 0.08, height: px * 0.3, backgroundColor: "#fff", left: px * 0.3 }]} />
        </View>
      </View>
      {showText && (
        <Text style={[styles.text, { fontSize: textSize, color: colors.foreground }]}>Mendly</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center" },
  icon: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  innerRing: { position: "absolute", borderWidth: 1.5 },
  cross: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  crossBar: { position: "absolute" },
  text: { fontFamily: "serif", fontWeight: "600", letterSpacing: -0.5 },
});
