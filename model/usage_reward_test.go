package model

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setUsageRewardSettingForTest(t *testing.T, settings UsageRewardSettings) {
	t.Helper()
	data, err := json.Marshal(settings)
	require.NoError(t, err)

	common.OptionMapRWMutex.Lock()
	if common.OptionMap == nil {
		common.OptionMap = make(map[string]string)
	}
	oldValue, existed := common.OptionMap[UsageRewardSettingOptionKey]
	common.OptionMap[UsageRewardSettingOptionKey] = string(data)
	common.OptionMapRWMutex.Unlock()

	t.Cleanup(func() {
		common.OptionMapRWMutex.Lock()
		defer common.OptionMapRWMutex.Unlock()
		if existed {
			common.OptionMap[UsageRewardSettingOptionKey] = oldValue
		} else {
			delete(common.OptionMap, UsageRewardSettingOptionKey)
		}
	})
}

func TestSettleUsageRewardsGrantsTopTenRatesOnce(t *testing.T) {
	truncateTables(t)

	day := time.Date(2026, 5, 9, 12, 0, 0, 0, time.Local)
	start := time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, day.Location()).Unix()

	for rank := 1; rank <= 11; rank++ {
		userId := rank
		quota := 1100 - rank*100
		insertAffLeaderboardUser(t, &User{Id: userId, Username: fmt.Sprintf("user-%02d", rank)})
		require.NoError(t, LOG_DB.Create(&Log{
			UserId:    userId,
			Username:  fmt.Sprintf("user-%02d", rank),
			Type:      LogTypeConsume,
			Quota:     quota,
			CreatedAt: start + int64(rank),
		}).Error)
	}

	granted, err := settleUsageRewardsForDate(day)
	require.NoError(t, err)
	require.Equal(t, 10, granted)

	var rewards []UsageReward
	require.NoError(t, DB.Order("rank ASC").Find(&rewards).Error)
	require.Len(t, rewards, 10)

	expectedRates := map[int]int{
		1:  500,
		2:  400,
		3:  300,
		4:  100,
		5:  100,
		6:  100,
		7:  100,
		8:  100,
		9:  100,
		10: 100,
	}
	for _, reward := range rewards {
		require.Contains(t, expectedRates, reward.Rank)
		assert.Equal(t, expectedRates[reward.Rank], reward.RewardRate)
		assert.Equal(t, reward.ConsumeQuota*int64(reward.RewardRate)/10000, int64(reward.RewardQuota))
	}

	var winner User
	require.NoError(t, DB.First(&winner, "id = ?", 1).Error)
	assert.Equal(t, 50, winner.RewardQuota)
	assert.Equal(t, 50, winner.RewardHistoryQuota)

	grantedAgain, err := settleUsageRewardsForDate(day)
	require.NoError(t, err)
	assert.Equal(t, 0, grantedAgain)

	require.NoError(t, DB.First(&winner, "id = ?", 1).Error)
	assert.Equal(t, 50, winner.RewardQuota)
	assert.Equal(t, 50, winner.RewardHistoryQuota)
}

func TestSettleUsageRewardsUsesConfiguredFixedAndPercentRules(t *testing.T) {
	truncateTables(t)
	setUsageRewardSettingForTest(t, UsageRewardSettings{
		Enabled:   true,
		RankLimit: 3,
		Rules: []UsageRewardRule{
			{FromRank: 1, ToRank: 2, RewardType: UsageRewardTypeFixedQuota, FixedQuota: 7},
			{FromRank: 3, ToRank: 3, RewardType: UsageRewardTypePercent, RewardRate: 1000},
		},
	})

	day := time.Date(2026, 5, 9, 12, 0, 0, 0, time.Local)
	start := time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, day.Location()).Unix()

	for rank := 1; rank <= 4; rank++ {
		userId := rank
		quota := 1100 - rank*100
		insertAffLeaderboardUser(t, &User{Id: userId, Username: fmt.Sprintf("user-%02d", rank)})
		require.NoError(t, LOG_DB.Create(&Log{
			UserId:    userId,
			Username:  fmt.Sprintf("user-%02d", rank),
			Type:      LogTypeConsume,
			Quota:     quota,
			CreatedAt: start + int64(rank),
		}).Error)
	}

	granted, err := settleUsageRewardsForDate(day)
	require.NoError(t, err)
	require.Equal(t, 3, granted)

	var rewards []UsageReward
	require.NoError(t, DB.Order("rank ASC").Find(&rewards).Error)
	require.Len(t, rewards, 3)

	assert.Equal(t, UsageRewardTypeFixedQuota, rewards[0].RewardType)
	assert.Equal(t, 7, rewards[0].FixedQuota)
	assert.Equal(t, 7, rewards[0].RewardQuota)
	assert.Equal(t, UsageRewardTypeFixedQuota, rewards[1].RewardType)
	assert.Equal(t, 7, rewards[1].RewardQuota)
	assert.Equal(t, UsageRewardTypePercent, rewards[2].RewardType)
	assert.Equal(t, 1000, rewards[2].RewardRate)
	assert.Equal(t, 80, rewards[2].RewardQuota)

	var winner User
	require.NoError(t, DB.First(&winner, "id = ?", 1).Error)
	assert.Equal(t, 7, winner.RewardQuota)

	var fourth User
	require.NoError(t, DB.First(&fourth, "id = ?", 4).Error)
	assert.Equal(t, 0, fourth.RewardQuota)
}

func TestSettleUsageRewardsDisabledSkipsGrant(t *testing.T) {
	truncateTables(t)
	setUsageRewardSettingForTest(t, UsageRewardSettings{
		Enabled:   false,
		RankLimit: 10,
		Rules:     DefaultUsageRewardSettings().Rules,
	})

	day := time.Date(2026, 5, 9, 12, 0, 0, 0, time.Local)
	insertAffLeaderboardUser(t, &User{Id: 1, Username: "user-01"})
	require.NoError(t, LOG_DB.Create(&Log{
		UserId:    1,
		Username:  "user-01",
		Type:      LogTypeConsume,
		Quota:     1000,
		CreatedAt: day.Unix(),
	}).Error)

	granted, err := settleUsageRewardsForDate(day)
	require.NoError(t, err)
	assert.Equal(t, 0, granted)

	var count int64
	require.NoError(t, DB.Model(&UsageReward{}).Count(&count).Error)
	assert.EqualValues(t, 0, count)
}

func TestConsumeUserRewardThenWalletQuota(t *testing.T) {
	truncateTables(t)

	insertAffLeaderboardUser(t, &User{Id: 1, Username: "reward-user", Quota: 100, RewardQuota: 50})

	rewardUsed, walletUsed, err := ConsumeUserRewardThenWalletQuota(1, 70)
	require.NoError(t, err)
	assert.Equal(t, 50, rewardUsed)
	assert.Equal(t, 20, walletUsed)

	var user User
	require.NoError(t, DB.First(&user, "id = ?", 1).Error)
	assert.Equal(t, 0, user.RewardQuota)
	assert.Equal(t, 80, user.Quota)

	require.NoError(t, RefundUserRewardWalletQuota(1, rewardUsed, walletUsed))
	require.NoError(t, DB.First(&user, "id = ?", 1).Error)
	assert.Equal(t, 50, user.RewardQuota)
	assert.Equal(t, 100, user.Quota)
}

func TestConsumeUserRewardThenWalletQuotaInsufficientDoesNotMutate(t *testing.T) {
	truncateTables(t)

	insertAffLeaderboardUser(t, &User{Id: 1, Username: "reward-user", Quota: 20, RewardQuota: 10})

	_, _, err := ConsumeUserRewardThenWalletQuota(1, 31)
	require.Error(t, err)

	var user User
	require.NoError(t, DB.First(&user, "id = ?", 1).Error)
	assert.Equal(t, 10, user.RewardQuota)
	assert.Equal(t, 20, user.Quota)
}
