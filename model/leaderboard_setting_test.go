package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseLeaderboardSettingsDefaultsAndPartialOverrides(t *testing.T) {
	settings, err := ParseLeaderboardSettings(`{"topup_enabled":false,"usage_metric":"requests"}`)
	require.NoError(t, err)

	assert.False(t, settings.TopUpEnabled)
	assert.True(t, settings.AffEnabled)
	assert.True(t, settings.UsageEnabled)
	assert.Equal(t, UsageLeaderboardMetricRequests, settings.UsageMetric)
}

func TestParseLeaderboardSettingsRejectsInvalidMetric(t *testing.T) {
	_, err := ParseLeaderboardSettings(`{"usage_metric":"money"}`)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "排行榜统计口径")
}
