package model

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
)

const (
	LeaderboardSettingOptionKey = "leaderboard_setting.config"

	UsageLeaderboardMetricQuota    = "quota"
	UsageLeaderboardMetricRequests = "requests"
)

type LeaderboardSettings struct {
	TopUpEnabled bool   `json:"topup_enabled"`
	AffEnabled   bool   `json:"aff_enabled"`
	UsageEnabled bool   `json:"usage_enabled"`
	UsageMetric  string `json:"usage_metric"`
}

func DefaultLeaderboardSettings() LeaderboardSettings {
	return LeaderboardSettings{
		TopUpEnabled: true,
		AffEnabled:   true,
		UsageEnabled: true,
		UsageMetric:  UsageLeaderboardMetricQuota,
	}
}

func DefaultLeaderboardSettingsJSONString() string {
	settings := DefaultLeaderboardSettings()
	data, err := json.Marshal(settings)
	if err != nil {
		return `{"topup_enabled":true,"aff_enabled":true,"usage_enabled":true,"usage_metric":"quota"}`
	}
	return string(data)
}

func ParseLeaderboardSettings(raw string) (LeaderboardSettings, error) {
	settings := DefaultLeaderboardSettings()
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return settings, nil
	}

	var input struct {
		TopUpEnabled *bool  `json:"topup_enabled"`
		AffEnabled   *bool  `json:"aff_enabled"`
		UsageEnabled *bool  `json:"usage_enabled"`
		UsageMetric  string `json:"usage_metric"`
	}
	if err := json.Unmarshal([]byte(raw), &input); err != nil {
		return settings, fmt.Errorf("排行榜展示配置不是有效 JSON: %w", err)
	}

	if input.TopUpEnabled != nil {
		settings.TopUpEnabled = *input.TopUpEnabled
	}
	if input.AffEnabled != nil {
		settings.AffEnabled = *input.AffEnabled
	}
	if input.UsageEnabled != nil {
		settings.UsageEnabled = *input.UsageEnabled
	}
	if strings.TrimSpace(input.UsageMetric) != "" {
		settings.UsageMetric = strings.ToLower(strings.TrimSpace(input.UsageMetric))
	}
	if settings.UsageMetric != UsageLeaderboardMetricQuota && settings.UsageMetric != UsageLeaderboardMetricRequests {
		return settings, fmt.Errorf("排行榜统计口径无效: %s", settings.UsageMetric)
	}

	return settings, nil
}

func GetLeaderboardSettings() LeaderboardSettings {
	common.OptionMapRWMutex.RLock()
	raw := common.Interface2String(common.OptionMap[LeaderboardSettingOptionKey])
	common.OptionMapRWMutex.RUnlock()

	settings, err := ParseLeaderboardSettings(raw)
	if err != nil {
		common.SysLog("invalid leaderboard settings, fallback to default: " + err.Error())
		return DefaultLeaderboardSettings()
	}
	return settings
}
