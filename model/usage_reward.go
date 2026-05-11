package model

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	UsageRewardSettingOptionKey = "usage_reward_setting.config"

	UsageRewardTypePercent    = "percent"
	UsageRewardTypeFixedQuota = "fixed_quota"

	maxUsageRewardRankLimit = 50
)

type UsageReward struct {
	Id           int    `json:"id" gorm:"primaryKey"`
	UserId       int    `json:"user_id" gorm:"index;uniqueIndex:idx_usage_reward_user_date"`
	DisplayName  string `json:"display_name" gorm:"type:varchar(191)"`
	PeriodDate   string `json:"period_date" gorm:"type:varchar(10);index;uniqueIndex:idx_usage_reward_user_date"`
	Rank         int    `json:"rank"`
	RewardType   string `json:"reward_type" gorm:"type:varchar(20);default:percent"`
	RewardRate   int    `json:"reward_rate"`
	FixedQuota   int    `json:"fixed_quota"`
	ConsumeQuota int64  `json:"consume_quota"`
	RewardQuota  int    `json:"reward_quota"`
	CreatedAt    int64  `json:"created_at" gorm:"autoCreateTime;column:created_at"`
}

type UsageRewardRule struct {
	FromRank   int    `json:"from_rank"`
	ToRank     int    `json:"to_rank"`
	RewardType string `json:"reward_type"`
	RewardRate int    `json:"reward_rate"`
	FixedQuota int    `json:"fixed_quota"`
}

type UsageRewardSettings struct {
	Enabled   bool              `json:"enabled"`
	RankLimit int               `json:"rank_limit"`
	Rules     []UsageRewardRule `json:"rules"`
}

func (UsageReward) TableName() string {
	return "usage_rewards"
}

func DefaultUsageRewardSettings() UsageRewardSettings {
	return UsageRewardSettings{
		Enabled:   true,
		RankLimit: 10,
		Rules: []UsageRewardRule{
			{FromRank: 1, ToRank: 1, RewardType: UsageRewardTypePercent, RewardRate: 500},
			{FromRank: 2, ToRank: 2, RewardType: UsageRewardTypePercent, RewardRate: 400},
			{FromRank: 3, ToRank: 3, RewardType: UsageRewardTypePercent, RewardRate: 300},
			{FromRank: 4, ToRank: 10, RewardType: UsageRewardTypePercent, RewardRate: 100},
		},
	}
}

func DefaultUsageRewardSettingsJSONString() string {
	settings := DefaultUsageRewardSettings()
	data, err := json.Marshal(settings)
	if err != nil {
		return `{"enabled":true,"rank_limit":10,"rules":[{"from_rank":1,"to_rank":1,"reward_type":"percent","reward_rate":500,"fixed_quota":0},{"from_rank":2,"to_rank":2,"reward_type":"percent","reward_rate":400,"fixed_quota":0},{"from_rank":3,"to_rank":3,"reward_type":"percent","reward_rate":300,"fixed_quota":0},{"from_rank":4,"to_rank":10,"reward_type":"percent","reward_rate":100,"fixed_quota":0}]}`
	}
	return string(data)
}

func ParseUsageRewardSettings(raw string) (UsageRewardSettings, error) {
	settings := DefaultUsageRewardSettings()
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return settings, nil
	}

	var input struct {
		Enabled   *bool             `json:"enabled"`
		RankLimit int               `json:"rank_limit"`
		Rules     []UsageRewardRule `json:"rules"`
		HasRules  *json.RawMessage  `json:"-"`
	}
	var rawMap map[string]json.RawMessage
	if err := json.Unmarshal([]byte(raw), &rawMap); err != nil {
		return settings, fmt.Errorf("排行榜奖励配置不是有效 JSON: %w", err)
	}
	if _, ok := rawMap["rules"]; ok {
		input.HasRules = &json.RawMessage{}
	}
	if err := json.Unmarshal([]byte(raw), &input); err != nil {
		return settings, fmt.Errorf("排行榜奖励配置解析失败: %w", err)
	}

	if input.Enabled != nil {
		settings.Enabled = *input.Enabled
	}
	if input.RankLimit != 0 {
		settings.RankLimit = input.RankLimit
	}
	if input.HasRules != nil {
		settings.Rules = input.Rules
	}

	if settings.RankLimit <= 0 || settings.RankLimit > maxUsageRewardRankLimit {
		return settings, fmt.Errorf("奖励榜名次数量必须在 1-%d 之间", maxUsageRewardRankLimit)
	}

	for index := range settings.Rules {
		rule := &settings.Rules[index]
		rule.RewardType = strings.ToLower(strings.TrimSpace(rule.RewardType))
		if rule.RewardType == "" {
			rule.RewardType = UsageRewardTypePercent
		}
		if rule.RewardType == "fixed" {
			rule.RewardType = UsageRewardTypeFixedQuota
		}
		if rule.FromRank <= 0 || rule.ToRank < rule.FromRank {
			return settings, fmt.Errorf("第 %d 条奖励规则的名次范围无效", index+1)
		}
		if rule.ToRank > maxUsageRewardRankLimit {
			return settings, fmt.Errorf("第 %d 条奖励规则的结束名次不能超过 %d", index+1, maxUsageRewardRankLimit)
		}
		switch rule.RewardType {
		case UsageRewardTypePercent:
			if rule.RewardRate < 0 || rule.RewardRate > 10000 {
				return settings, fmt.Errorf("第 %d 条奖励规则的百分比必须在 0-100%% 之间", index+1)
			}
			rule.FixedQuota = 0
		case UsageRewardTypeFixedQuota:
			if rule.FixedQuota < 0 {
				return settings, fmt.Errorf("第 %d 条奖励规则的固定额度不能小于 0", index+1)
			}
			rule.RewardRate = 0
		default:
			return settings, fmt.Errorf("第 %d 条奖励规则的奖励类型无效", index+1)
		}
	}

	return settings, nil
}

func GetUsageRewardSettings() UsageRewardSettings {
	common.OptionMapRWMutex.RLock()
	raw := common.Interface2String(common.OptionMap[UsageRewardSettingOptionKey])
	common.OptionMapRWMutex.RUnlock()

	settings, err := ParseUsageRewardSettings(raw)
	if err != nil {
		common.SysLog("invalid usage reward settings, fallback to default: " + err.Error())
		return DefaultUsageRewardSettings()
	}
	return settings
}

func SettleDailyUsageRewards(now time.Time) (int, error) {
	return settleUsageRewardsForDate(now.AddDate(0, 0, -1))
}

func settleUsageRewardsForDate(day time.Time) (int, error) {
	settings := GetUsageRewardSettings()
	if !settings.Enabled {
		return 0, nil
	}

	periodDate, start, end := usageRewardDayRange(day)
	leaderboard, err := getUsageLeaderboardBetween(settings.RankLimit, start, end)
	if err != nil {
		return 0, err
	}
	if len(leaderboard) == 0 {
		return 0, nil
	}

	granted := 0
	err = DB.Transaction(func(tx *gorm.DB) error {
		for _, item := range leaderboard {
			rule, ok := settings.rewardRuleForRank(item.Rank)
			if !ok {
				continue
			}
			rewardRate, fixedQuota, rewardQuota := calculateUsageReward(rule, item.ConsumeQuota)
			if rewardRate <= 0 && fixedQuota <= 0 {
				continue
			}
			reward := UsageReward{
				UserId:       item.UserId,
				DisplayName:  item.DisplayName,
				PeriodDate:   periodDate,
				Rank:         item.Rank,
				RewardType:   rule.RewardType,
				RewardRate:   rewardRate,
				FixedQuota:   fixedQuota,
				ConsumeQuota: item.ConsumeQuota,
				RewardQuota:  rewardQuota,
			}
			result := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "period_date"}, {Name: "user_id"}},
				DoNothing: true,
			}).Create(&reward)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected == 0 {
				continue
			}
			if rewardQuota > 0 {
				if err := tx.Model(&User{}).Where("id = ?", item.UserId).Updates(map[string]interface{}{
					"reward_quota":         gorm.Expr("reward_quota + ?", rewardQuota),
					"reward_history_quota": gorm.Expr("reward_history_quota + ?", rewardQuota),
				}).Error; err != nil {
					return err
				}
			}
			granted++
		}
		return nil
	})
	return granted, err
}

func GetUserUsageRewards(userId int, limit int) ([]UsageReward, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	rewards := make([]UsageReward, 0, limit)
	err := DB.Where("user_id = ?", userId).
		Order("period_date DESC, rank ASC, id DESC").
		Limit(limit).
		Find(&rewards).Error
	return rewards, err
}

func (settings UsageRewardSettings) rewardRuleForRank(rank int) (UsageRewardRule, bool) {
	for _, rule := range settings.Rules {
		if rank >= rule.FromRank && rank <= rule.ToRank {
			return rule, true
		}
	}
	return UsageRewardRule{}, false
}

func calculateUsageReward(rule UsageRewardRule, consumeQuota int64) (rewardRate int, fixedQuota int, rewardQuota int) {
	switch rule.RewardType {
	case UsageRewardTypeFixedQuota:
		return 0, rule.FixedQuota, rule.FixedQuota
	default:
		return rule.RewardRate, 0, int(consumeQuota * int64(rule.RewardRate) / 10000)
	}
}

func usageRewardRateBP(rank int) int {
	settings := DefaultUsageRewardSettings()
	rule, ok := settings.rewardRuleForRank(rank)
	if !ok || rule.RewardType != UsageRewardTypePercent {
		return 0
	}
	return rule.RewardRate
}

func usageRewardDayRange(day time.Time) (periodDate string, start int64, end int64) {
	localDay := day.In(time.Local)
	startAt := time.Date(localDay.Year(), localDay.Month(), localDay.Day(), 0, 0, 0, 0, time.Local)
	return startAt.Format("2006-01-02"), startAt.Unix(), startAt.AddDate(0, 0, 1).Unix()
}
