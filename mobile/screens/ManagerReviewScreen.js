import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Modal, TextInput, Alert, Dimensions,
} from "react-native";
import { colors, severityColor } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { inspectionApi } from "../services/api";

const screenWidth = Dimensions.get("window").width;

export default function ManagerReviewScreen({ route, navigation }) {
  const { user } = useAuth();
  const { inspection } = route.params;
  
  const [fullInspection, setFullInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [decisionModalVisible, setDecisionModalVisible] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [reason, setReason] = useState("");
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [auditTrail, setAuditTrail] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);

  const loadInspection = useCallback(async () => {
    try {
      const res = await inspectionApi.getOne(inspection.id);
      setFullInspection(res.data);
    } catch (e) {
      Alert.alert("Error", "Failed to load inspection details");
    } finally {
      setLoading(false);
    }
  }, [inspection.id]);

  const loadAuditTrail = useCallback(async () => {
    try {
      const res = await inspectionApi.getAuditTrail(inspection.id);
      setAuditTrail(res.data.audit_trail || []);
    } catch (e) {
      console.error("Failed to load audit trail:", e);
    }
  }, [inspection.id]);

  const loadComparison = useCallback(async () => {
    try {
      const res = await inspectionApi.getComparison(inspection.id);
      setComparisonData(res.data);
    } catch (e) {
      console.error("Failed to load comparison:", e);
    }
  }, [inspection.id]);

  useEffect(() => {
    loadInspection();
  }, [inspection.id, loadInspection]);

  const handleDecisionSubmit = async () => {
    if (!selectedDecision) {
      Alert.alert("Error", "Please select a decision");
      return;
    }
    if (!reason.trim()) {
      Alert.alert("Error", "Please provide a decision reason");
      return;
    }

    setSubmitting(true);
    try {
      await inspectionApi.submitDecision(inspection.id, selectedDecision, reason);
      Alert.alert("Success", `Inspection marked as: ${selectedDecision}`);
      setDecisionModalVisible(false);
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.detail || "Failed to submit decision");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!fullInspection) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Could not load inspection</Text>
      </View>
    );
  }

  const defects = fullInspection.defects || [];
  const severity = fullInspection.overall_severity || "unknown";
  const recommendation = fullInspection.ai_recommendation || "unknown";
  const affectedArea = fullInspection.affected_area || 0;
  const avgConfidence = fullInspection.avg_confidence || 0;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inspection Review</Text>
        <Text style={styles.inspectionId}>ID: {inspection.id.slice(0, 8)}</Text>
      </View>

      {/* Inspection Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Inspector</Text>
            <Text style={styles.value}>{fullInspection.inspector_name || "Unknown"}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{new Date(fullInspection.created_at).toLocaleDateString()}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Status</Text>
            <Text style={[styles.value, { color: colors.primary }]}>{fullInspection.status}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Defects Found</Text>
            <Text style={styles.value}>{defects.length}</Text>
          </View>
        </View>
      </View>

      {/* Fabric Image */}
      {fullInspection.image_url && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fabric Image</Text>
          <Image
            source={{ uri: fullInspection.image_url }}
            style={styles.fabricImage}
          />
        </View>
      )}

      {/* AI Analysis */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Analysis</Text>
        <View style={styles.analysisCard}>
          <View style={styles.analysisRow}>
            <Text style={styles.analysisLabel}>Severity:</Text>
            <Text style={[styles.analysisValue, { color: severityColor(severity) }]}>
              {severity.toUpperCase()}
            </Text>
          </View>
          <View style={styles.analysisRow}>
            <Text style={styles.analysisLabel}>Defect Count:</Text>
            <Text style={styles.analysisValue}>{defects.length}</Text>
          </View>
          <View style={styles.analysisRow}>
            <Text style={styles.analysisLabel}>Affected Area:</Text>
            <Text style={styles.analysisValue}>{affectedArea}%</Text>
          </View>
          <View style={styles.analysisRow}>
            <Text style={styles.analysisLabel}>Confidence:</Text>
            <Text style={styles.analysisValue}>{(avgConfidence * 100).toFixed(1)}%</Text>
          </View>
          <View style={[styles.analysisRow, { marginTop: 10 }]}>
            <Text style={styles.analysisLabel}>AI Recommendation:</Text>
            <Text style={[styles.aiRecommendation, { color: _getRecommendationColor(recommendation) }]}>
              {recommendation.toUpperCase()}
            </Text>
          </View>
          {fullInspection.ai_explanation && (
            <Text style={styles.explanation}>{fullInspection.ai_explanation}</Text>
          )}
        </View>
      </View>

      {/* Defects List */}
      {defects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detected Defects</Text>
          {defects.map((defect, idx) => (
            <View key={idx} style={styles.defectCard}>
              <View style={styles.defectHeader}>
                <Text style={styles.defectType}>{defect.defect_type}</Text>
                <Text style={[styles.defectSeverity, { color: severityColor(defect.severity) }]}>
                  {defect.severity}
                </Text>
              </View>
              <View style={styles.defectDetail}>
                <Text style={styles.detailText}>Confidence: {(defect.confidence * 100).toFixed(1)}%</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Comparison (if reinspection) */}
      {fullInspection.parent_inspection_id && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.comparisonButton}
            onPress={() => {
              setShowComparison(true);
              loadComparison();
            }}
          >
            <Text style={styles.comparisonButtonText}>View Before/After Comparison</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Audit Trail */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.auditButton}
          onPress={() => {
            setShowAuditTrail(true);
            loadAuditTrail();
          }}
        >
          <Text style={styles.auditButtonText}>View Audit Trail</Text>
        </TouchableOpacity>
      </View>

      {/* Decision Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manager Decision</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setDecisionModalVisible(true)}
        >
          <Text style={styles.primaryButtonText}>Make Decision</Text>
        </TouchableOpacity>
      </View>

      {/* Decision Modal */}
      <Modal visible={decisionModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Submit Decision</Text>

            <View style={styles.decisionOptions}>
              {["approved", "rework", "rejected"].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.decisionOption,
                    selectedDecision === option && styles.decisionOptionSelected,
                  ]}
                  onPress={() => setSelectedDecision(option)}
                >
                  <Text
                    style={[
                      styles.decisionOptionText,
                      selectedDecision === option && styles.decisionOptionTextSelected,
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.reasonLabel}>Decision Reason</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Explain your decision..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              value={reason}
              onChangeText={setReason}
              maxLength={500}
            />
            <Text style={styles.charCount}>{reason.length}/500</Text>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDecisionModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleDecisionSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Comparison Modal */}
      <Modal visible={showComparison} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Before / After Comparison</Text>
            {comparisonData && comparisonData.has_parent ? (
              <ScrollView style={{ maxHeight: 400 }}>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>Before Rework</Text>
                  <Text style={styles.comparisonData}>
                    Severity: {comparisonData.parent.severity}
                  </Text>
                  <Text style={styles.comparisonData}>
                    Defects: {comparisonData.parent.defect_count}
                  </Text>
                  <Text style={styles.comparisonData}>
                    Affected Area: {comparisonData.parent.affected_area}%
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>After Rework</Text>
                  <Text style={styles.comparisonData}>
                    Severity: {comparisonData.current.severity}
                  </Text>
                  <Text style={styles.comparisonData}>
                    Defects: {comparisonData.current.defect_count}
                  </Text>
                  <Text style={styles.comparisonData}>
                    Affected Area: {comparisonData.current.affected_area}%
                  </Text>
                </View>
              </ScrollView>
            ) : (
              <Text style={styles.noComparisonText}>No comparison data available</Text>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowComparison(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Audit Trail Modal */}
      <Modal visible={showAuditTrail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Audit Trail</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {auditTrail.length === 0 ? (
                <Text style={styles.noAuditText}>No audit trail entries</Text>
              ) : (
                auditTrail.map((entry, idx) => (
                  <View key={idx} style={styles.auditEntry}>
                    <Text style={styles.auditAction}>{entry.action}</Text>
                    <Text style={styles.auditMeta}>
                      {entry.user_name} ({entry.user_role})
                    </Text>
                    <Text style={styles.auditTime}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </Text>
                    {entry.note && (
                      <Text style={styles.auditNote}>{entry.note}</Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAuditTrail(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function _getRecommendationColor(recommendation) {
  switch (recommendation) {
    case "approve":
      return colors.success;
    case "rework":
      return colors.warning;
    case "reject":
      return colors.danger;
    default:
      return colors.primary;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingBottom: 20,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  inspectionId: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  section: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
  },
  summaryGrid: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  summaryItem: {
    width: "48%",
    backgroundColor: "#f5f7fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  fabricImage: {
    width: "100%",
    height: 300,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  analysisCard: {
    backgroundColor: "#f5f7fa",
    borderRadius: 8,
    padding: 16,
  },
  analysisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  analysisLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  analysisValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  aiRecommendation: {
    fontSize: 14,
    fontWeight: "700",
  },
  explanation: {
    marginTop: 12,
    fontSize: 13,
    color: colors.text,
    fontStyle: "italic",
    lineHeight: 18,
  },
  defectCard: {
    backgroundColor: "#fff",
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  defectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  defectType: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  defectSeverity: {
    fontSize: 12,
    fontWeight: "600",
  },
  defectDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  comparisonButton: {
    backgroundColor: colors.info,
    borderRadius: 8,
    padding: 14,
  },
  comparisonButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 14,
  },
  auditButton: {
    backgroundColor: colors.secondary,
    borderRadius: 8,
    padding: 14,
  },
  auditButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
  },
  primaryButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },
  decisionOptions: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 10,
  },
  decisionOption: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  decisionOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(37, 99, 235, 0.1)",
  },
  decisionOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  decisionOptionTextSelected: {
    color: colors.primary,
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    fontSize: 13,
    textAlignVertical: "top",
    marginBottom: 6,
  },
  charCount: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: "right",
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  comparisonItem: {
    marginBottom: 16,
    backgroundColor: "#f5f7fa",
    padding: 12,
    borderRadius: 8,
  },
  comparisonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  comparisonData: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 12,
  },
  noComparisonText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginVertical: 20,
  },
  auditEntry: {
    backgroundColor: "#f5f7fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  auditAction: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  auditMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  auditTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  auditNote: {
    fontSize: 12,
    color: colors.text,
    marginTop: 6,
    fontStyle: "italic",
  },
  noAuditText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginVertical: 20,
  },
  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 16,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  errorText: {
    color: colors.danger,
    textAlign: "center",
    fontSize: 14,
    marginTop: 40,
  },
});
