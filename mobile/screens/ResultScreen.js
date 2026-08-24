import React, { useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";

import {
  colors,
  severityColor,
} from "../theme/colors";

import DefectBadge from "../components/DefectBadge";
import AuthenticityBadge from "../components/AuthenticityBadge";

import {
  API_BASE_URL,
  inspectionApi,
} from "../services/api";

export default function ResultScreen({
  navigation,
  route,
}) {
  const prediction = route?.params?.prediction;
  const inspection = route?.params?.inspection;

  const data = prediction || inspection;

  const [submitting, setSubmitting] =
    useState(false);

  if (!data) {
    return (
      <View style={styles.center}>
        <Text>No result data available.</Text>
      </View>
    );
  }

  const imageUrl =
    data.image_url?.startsWith("http")
      ? data.image_url
      : `${API_BASE_URL}${data.image_url}`;

  const defects = data.defects || [];

  const uniqueDefects = defects.reduce(
    (acc, item) => {
      const type = String(
        item.defect_type ||
        item.type ||
        "unknown"
      ).toLowerCase();

      if (
        !acc.some(
          (existing) =>
            String(
              existing.defect_type ||
              existing.type ||
              "unknown"
            ).toLowerCase() === type
        )
      ) {
        acc.push(item);
      }

      return acc;
    },
    []
  );

  const uniqueColors =
    (data.dominant_colors || []).reduce(
      (acc, item) => {
        const name = String(
          item.name || "unknown"
        ).toLowerCase();

        if (
          !acc.some(
            (existing) =>
              String(
                existing.name || "unknown"
              ).toLowerCase() === name
          )
        ) {
          acc.push(item);
        }

        return acc;
      },
      []
    );

  const defectFree =
    data.defect_free ??
    defects.length === 0;

  const severity =
    data.overall_severity || "low";

  const inspectionId =
    data.inspection_id ||
    inspection?.id;

  const currentStatus =
    data.status ||
    inspection?.status ||
    "inspector_review";

  const colorQuality =
    data.quality?.verdict ||
    "Good Quality — Passed";

  // ==========================================
  // SEND TO PROJECT MANAGER
  // ==========================================

  const handleSubmitForReview = async () => {
    if (!inspectionId) {
      Alert.alert(
        "Error",
        "Inspection ID not found."
      );
      return;
    }

    if (submitting) return;

    setSubmitting(true);

    try {
      const response =
        await inspectionApi.submit(
          inspectionId
        );

      console.log(
        "Manager submission:",
        response?.data
      );

      Alert.alert(
        "Submitted Successfully",
        "This fabric inspection has been sent to the Project Manager for review.",
        [
          {
            text: "OK",
            onPress: () =>
              navigation.navigate(
                "InspectorDashboard"
              ),
          },
        ]
      );
    } catch (error) {
      console.log(
        "Submit review error:",
        error
      );

      const message =
        error?.response?.data?.detail ||
        error?.message ||
        "Failed to submit inspection.";

      Alert.alert(
        "Submission Failed",
        message
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.contentContainer
      }
    >
      {/* IMAGE */}

      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
      />

      <View style={styles.body}>

        {/* AUTHENTICITY */}

        <AuthenticityBadge
          status={data.image_status}
        />

        {/* STATUS */}

        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: defectFree
                ? colors.success + "20"
                : severityColor(
                    severity
                  ) + "20",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: defectFree
                  ? colors.success
                  : severityColor(
                      severity
                    ),
              },
            ]}
          >
            {defectFree
              ? "✓ No Defects Detected"
              : `${defects.length} Defect(s) Found · ${severity.toUpperCase()} Severity`}
          </Text>
        </View>

        {/* PROCESSING TIME */}

        {data.processing_time_ms != null && (
          <Text style={styles.meta}>
            Analyzed in{" "}
            {data.processing_time_ms}ms
          </Text>
        )}

        {/* DEFECTS */}

        {uniqueDefects.length > 0 && (
          <>
            <Text
              style={styles.sectionTitle}
            >
              Detected Defects
            </Text>

            {uniqueDefects.map(
              (defect, index) => (
                <DefectBadge
                  key={index}
                  defect={defect}
                />
              )
            )}
          </>
        )}

        {/* DEFECT FREE */}

        {defectFree && (
          <Text style={styles.okMessage}>
            This fabric sample passed AI
            quality inspection with no
            detectable defects.
          </Text>
        )}

        {/* QUALITY */}

        {data.quality && (
          <View
            style={[
              styles.qualityCard,
              {
                borderColor:
                  severityColor(
                    data.quality.color ===
                      "success"
                      ? "low"
                      : data.quality.color
                  ),
              },
            ]}
          >
            <Text
              style={styles.sectionTitle}
            >
              Quality Verdict
            </Text>

            <Text
              style={[
                styles.qualityVerdict,
                {
                  color:
                    severityColor(
                      data.quality.color ===
                        "success"
                        ? "low"
                        : data.quality.color
                    ),
                },
              ]}
            >
              {data.quality.verdict}
            </Text>

            <Text
              style={styles.qualityGrade}
            >
              Grade:{" "}
              {data.quality.grade}
            </Text>
          </View>
        )}

        {/* COLORS */}

        {uniqueColors.length > 0 && (
          <>
            <Text
              style={styles.sectionTitle}
            >
              Color Quality
            </Text>

            <View
              style={
                styles.colorQualityCard
              }
            >
              <Text
                style={
                  styles.colorQualityText
                }
              >
                {colorQuality}
              </Text>

              <Text
                style={styles.colorSummary}
              >
                Present colors:{" "}
                {uniqueColors
                  .map(
                    (color) =>
                      color.name
                  )
                  .join(", ")}
              </Text>
            </View>

            <Text
              style={styles.sectionTitle}
            >
              Dominant Colors
            </Text>

            <View
              style={styles.colorRow}
            >
              {uniqueColors.map(
                (color, index) => (
                  <View
                    key={index}
                    style={styles.colorItem}
                  >
                    <View
                      style={[
                        styles.colorSwatch,
                        {
                          backgroundColor:
                            color.hex,
                        },
                      ]}
                    />

                    <Text
                      style={
                        styles.colorName
                      }
                    >
                      {color.name}
                    </Text>

                    <Text
                      style={
                        styles.colorPct
                      }
                    >
                      {color.percentage}%
                    </Text>
                  </View>
                )
              )}
            </View>
          </>
        )}

        {/* FABRIC PATTERN */}

        {data.fabric_pattern && (
          <>
            <Text
              style={styles.sectionTitle}
            >
              Fabric Pattern
            </Text>

            <View
              style={styles.patternCard}
            >
              <Text
                style={styles.patternType}
              >
                {
                  data.fabric_pattern
                    .pattern_type
                }
              </Text>

              <Text
                style={styles.patternNote}
              >
                {
                  data.fabric_pattern.note
                }
              </Text>
            </View>
          </>
        )}

        {/* RECOMMENDATIONS */}

        {data.recommendations?.length >
          0 && (
          <>
            <Text
              style={styles.sectionTitle}
            >
              Recommended Actions
            </Text>

            {data.recommendations.map(
              (recommendation, index) => (
                <View
                  key={index}
                  style={styles.recCard}
                >
                  <View
                    style={
                      styles.recHeader
                    }
                  >
                    <Text
                      style={
                        styles.recPriority
                      }
                    >
                      #
                      {
                        recommendation.priority
                      }
                    </Text>

                    <Text
                      style={styles.recType}
                    >
                      {recommendation.defect_type.replace(
                        "_",
                        " "
                      )}
                    </Text>
                  </View>

                  <Text
                    style={styles.recAction}
                  >
                    {
                      recommendation.action
                    }
                  </Text>
                </View>
              )
            )}
          </>
        )}

        {/* =====================================
            SEND TO PROJECT MANAGER
        ====================================== */}

        {currentStatus ===
          "inspector_review" && (
          <View
            style={
              styles.managerSubmitSection
            }
          >
            <Text
              style={
                styles.managerSubmitTitle
              }
            >
              Quality Inspection Complete
            </Text>

            <Text
              style={
                styles.managerSubmitDescription
              }
            >
              Review the AI analysis above,
              then send this inspection to
              the Project Manager for the
              final decision.
            </Text>

            <TouchableOpacity
              style={
                styles.submitButton
              }
              onPress={
                handleSubmitForReview
              }
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <ActivityIndicator
                    color="#fff"
                  />

                  <Text
                    style={
                      styles.submitButtonText
                    }
                  >
                    Sending...
                  </Text>
                </>
              ) : (
                <Text
                  style={
                    styles.submitButtonText
                  }
                >
                  Send to Project Manager
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ALREADY SENT */}

        {currentStatus ===
          "pending_manager_review" && (
          <View
            style={
              styles.pendingBanner
            }
          >
            <Text
              style={
                styles.pendingTitle
              }
            >
              ✓ Sent to Project Manager
            </Text>

            <Text
              style={
                styles.pendingText
              }
            >
              This inspection is waiting
              for the Project Manager's
              decision.
            </Text>
          </View>
        )}

        {/* ANOTHER INSPECTION */}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            navigation.navigate(
              "CameraUpload"
            )
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Inspect Another Fabric
          </Text>
        </TouchableOpacity>

        {/* DASHBOARD */}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() =>
            navigation.navigate(
              "InspectorDashboard"
            )
          }
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            Back to Dashboard
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgLight,
  },

  contentContainer: {
    paddingBottom: 30,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  image: {
    width: "100%",
    height: 260,
    backgroundColor: "#000",
  },

  body: {
    padding: 20,
  },

  statusBanner: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },

  statusText: {
    fontWeight: "800",
    fontSize: 14,
    textAlign: "center",
  },

  meta: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 10,
    marginTop: 6,
  },

  okMessage: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    marginBottom: 10,
  },

  qualityCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginTop: 6,
    marginBottom: 6,
    backgroundColor: "#fff",
  },

  qualityVerdict: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 6,
  },

  qualityGrade: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: "600",
  },

  colorQualityCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },

  colorQualityText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  colorSummary: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 16,
  },

  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 10,
  },

  colorItem: {
    alignItems: "center",
    width: 70,
  },

  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },

  colorName: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 6,
    textAlign: "center",
  },

  colorPct: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },

  patternCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
  },

  patternType: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  patternNote: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 16,
  },

  recCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },

  recHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },

  recPriority: {
    backgroundColor: colors.primary,
    color: "#fff",
    fontWeight: "800",
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },

  recType: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
    textTransform: "capitalize",
  },

  recAction: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // ==========================================
  // MANAGER SUBMISSION
  // ==========================================

  managerSubmitSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },

  managerSubmitTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 6,
  },

  managerSubmitDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: 14,
  },

  submitButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },

  submitButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  pendingBanner: {
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#fff8e1",
    borderWidth: 1,
    borderColor: colors.warning,
  },

  pendingTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.warning,
    marginBottom: 6,
  },

  pendingText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 12,
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  secondaryButton: {
    paddingVertical: 14,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 13,
  },
});