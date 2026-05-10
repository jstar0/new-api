package model

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
