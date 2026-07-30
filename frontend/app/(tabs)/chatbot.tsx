import { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@/components/ThemeProvider";
import { API_BASE } from "@/lib/config";
import { useAuth } from "@/lib/AuthContext";
import { Spacing, FontSize, Radius } from "@/constants/theme";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Chatbot() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm Elix, your AI health companion. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatRef = useRef<FlatList>(null);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const history = messages.concat(userMsg).slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message: userMsg.content, history }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response || data.message || "I'm not sure how to respond to that." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." }]);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        onContentSizeChange={() => flatRef.current?.scrollToEnd()}
        contentContainerStyle={{ padding: Spacing.lg }}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.botBubble, { backgroundColor: item.role === "user" ? colors.primary : colors.card, borderColor: colors.border }]}>
            <Text style={[styles.bubbleText, { color: item.role === "user" ? "#fff" : colors.foreground }]}>{item.content}</Text>
          </View>
        )}
        ListFooterComponent={loading ? <View style={[styles.bubble, styles.botBubble, { backgroundColor: colors.card, borderColor: colors.border }]}><ActivityIndicator color={colors.primary} /></View> : null}
      />
      <View style={[styles.inputRow, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about symptoms, medicines..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          multiline
        />
        <TouchableOpacity onPress={send} disabled={loading} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bubble: { maxWidth: "80%", padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.sm },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  botBubble: { alignSelf: "flex-start", borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: FontSize.md, lineHeight: FontSize.md * 1.5 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", padding: Spacing.md, borderTopWidth: 1, gap: Spacing.sm },
  input: { flex: 1, borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  sendIcon: { color: "#fff", fontSize: 16 },
});
