import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

const ROLES = [
  { key: "inspector", title: "Quality Inspector", desc: "Capture & inspect fabric for defects" },
  { key: "manager", title: "Production Manager", desc: "Monitor lines, defects & reports" },
];

export default function RoleSelectScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>I am a...</Text>
      <Text style={styles.helper}>Choose your role to create an account</Text>

      {ROLES.map((r) => (
        <TouchableOpacity
          key={r.key}
          style={styles.card}
          onPress={() => navigation.navigate("Register", { role: r.key })}
        >
          <Text style={styles.cardTitle}>{r.title}</Text>
          <Text style={styles.cardDesc}>{r.desc}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.linkWrap}>
        <Text style={styles.link}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgLight, padding: 28, justifyContent: "center" },
  heading: { fontSize: 26, fontWeight: "800", color: colors.textPrimary },
  helper: { color: colors.textSecondary, marginTop: 6, marginBottom: 28, fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  cardDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  linkWrap: { marginTop: 16, alignItems: "center" },
  link: { color: colors.primary, fontWeight: "600", fontSize: 13 },
});
