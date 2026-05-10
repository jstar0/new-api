package model

import (
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type UsageReward struct {
	Id           int    `json:"id" gorm:"primaryKey"`
	UserId       int    `json:"user_id" gorm:"index;uniqueIndex:idx_usage_reward_user_date"`
	DisplayName  string `json:"display_name" gorm:"type:varchar(191)"`
	PeriodDate   string `json:"period_date" gorm:"type:varchar(10);index;uniqueIndex:idx_usage_reward_user_date"`
	Rank         int    `json:"rank"`
	RewardRate   int    `json:"reward_rate"`
	ConsumeQuota int64  `json:"consume_quota"`
	RewardQuota  int    `json:"reward_quota"`
	CreatedAt    int64  `json:"created_at" gorm:"autoCreateTime;column:created_at"`
}

func (UsageReward) TableName() string {
	return "usage_rewards"
}

func SettleDailyUsageRewards(now time.Time) (int, error) {
	return settleUsageRewardsForDate(now.AddDate(0, 0, -1))
}

func settleUsageRewardsForDate(day time.Time) (int, error) {
	periodDate, start, end := usageRewardDayRange(day)
	leaderboard, err := getUsageLeaderboardBetween(10, start, end)
	if err != nil {
		return 0, err
	}
	if len(leaderboard) == 0 {
		return 0, nil
	}

	granted := 0
	err = DB.Transaction(func(tx *gorm.DB) error {
		for _, item := range leaderboard {
			rewardRate := usageRewardRateBP(item.Rank)
			if rewardRate <= 0 {
				continue
			}
			rewardQuota := int(item.ConsumeQuota * int64(rewardRate) / 10000)
			reward := UsageReward{
				UserId:       item.UserId,
				DisplayName:  item.DisplayName,
				PeriodDate:   periodDate,
				Rank:         item.Rank,
				RewardRate:   rewardRate,
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

func usageRewardRateBP(rank int) int {
	switch {
	case rank == 1:
		return 500
	case rank == 2:
		return 400
	case rank == 3:
		return 300
	case rank >= 4 && rank <= 10:
		return 100
	default:
		return 0
	}
}

func usageRewardDayRange(day time.Time) (periodDate string, start int64, end int64) {
	localDay := day.In(time.Local)
	startAt := time.Date(localDay.Year(), localDay.Month(), localDay.Day(), 0, 0, 0, 0, time.Local)
	return startAt.Format("2006-01-02"), startAt.Unix(), startAt.AddDate(0, 0, 1).Unix()
}
